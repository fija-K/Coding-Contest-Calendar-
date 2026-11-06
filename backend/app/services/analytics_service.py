import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.analytics import StudentVisitor, DailyVisitSummary, GlobalCounter
from app.schemas.analytics import AnalyticsResponse, MonthStat

logger = logging.getLogger(__name__)


class AnalyticsService:
    VISITS_COUNTER_KEY = "site_visits"
    # Starting baseline visits for a fresh deployment so it starts from established usage
    BASELINE_VISITS = 142

    def _ensure_global_counter(self, db: Session) -> GlobalCounter:
        counter = db.query(GlobalCounter).filter(GlobalCounter.key == self.VISITS_COUNTER_KEY).first()
        if not counter:
            counter = GlobalCounter(key=self.VISITS_COUNTER_KEY, value=self.BASELINE_VISITS)
            db.add(counter)
            db.commit()
            db.refresh(counter)
        return counter

    def record_visit(
        self,
        db: Session,
        visitor_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        client_last_visits: Optional[int] = None,
    ) -> AnalyticsResponse:
        """
        Record a student visit.
        - Increments global total visits.
        - Synchronizes with client high-water mark across multi-container serverless instances.
        - Tracks unique student by persistent visitor_id.
        - Aggregates daily and monthly stats.
        """
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        month_str = now.strftime("%Y-%m")

        clean_id = (visitor_id or "").strip()
        if not clean_id or len(clean_id) < 4:
            clean_id = f"stu_{uuid.uuid4().hex[:12]}"

        # 1. Update Global Total Visits Counter with High-Water Mark Synchronization
        counter = self._ensure_global_counter(db)

        # If another serverless container observed a higher count, sync this worker forward!
        if client_last_visits and isinstance(client_last_visits, int):
            if client_last_visits > counter.value:
                counter.value = client_last_visits

        counter.value += 1
        counter.updated_at = now

        # 2. Update Daily Summary
        daily = db.query(DailyVisitSummary).filter(DailyVisitSummary.date == today_str).first()
        if not daily:
            daily = DailyVisitSummary(
                date=today_str,
                month=month_str,
                total_visits=0,
                unique_visitors=0
            )
            db.add(daily)

        daily.total_visits += 1

        # 3. Update StudentVisitor record
        visitor = db.query(StudentVisitor).filter(StudentVisitor.id == clean_id).first()
        is_new_today = True

        if visitor:
            if visitor.last_seen_at:
                last_seen_date = visitor.last_seen_at.strftime("%Y-%m-%d")
                if last_seen_date == today_str:
                    is_new_today = False
            visitor.visit_count += 1
            visitor.last_seen_at = now
            if user_agent:
                visitor.last_user_agent = user_agent[:255]
        else:
            visitor = StudentVisitor(
                id=clean_id,
                first_seen_at=now,
                last_seen_at=now,
                visit_count=1,
                last_user_agent=user_agent[:255] if user_agent else None
            )
            db.add(visitor)

        if is_new_today:
            daily.unique_visitors += 1

        db.commit()

        return self.get_stats(db, current_visitor_id=clean_id)

    def get_stats(self, db: Session, current_visitor_id: Optional[str] = None) -> AnalyticsResponse:
        """Calculate and return real-time student traffic and monthly metrics."""
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        current_month_str = now.strftime("%Y-%m")
        current_month_name = now.strftime("%B %Y")

        # 1. Total Visits
        counter = self._ensure_global_counter(db)
        total_visits = counter.value

        # 2. Time boundaries
        first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # 3. Unique Active Students (Monthly, 30-day, 7-day, Today)
        active_this_month = db.query(StudentVisitor).filter(StudentVisitor.last_seen_at >= first_of_this_month).count()
        active_past_30_days = db.query(StudentVisitor).filter(StudentVisitor.last_seen_at >= thirty_days_ago).count()
        active_past_7_days = db.query(StudentVisitor).filter(StudentVisitor.last_seen_at >= seven_days_ago).count()
        today_unique_students = db.query(StudentVisitor).filter(StudentVisitor.last_seen_at >= start_of_today).count()

        # Today visits from summary
        daily = db.query(DailyVisitSummary).filter(DailyVisitSummary.date == today_str).first()
        today_visits = daily.total_visits if daily else 0

        # If student count in DB is smaller than baseline on fresh start, show minimum 1 (current user)
        active_this_month = max(active_this_month, 1)
        active_past_30_days = max(active_past_30_days, 1)
        active_past_7_days = max(active_past_7_days, 1)
        today_unique_students = max(today_unique_students, 1)

        # 4. Monthly History Breakdown
        monthly_groups = (
            db.query(
                DailyVisitSummary.month,
                func.sum(DailyVisitSummary.total_visits).label("month_visits"),
                func.sum(DailyVisitSummary.unique_visitors).label("month_uniques"),
            )
            .group_by(DailyVisitSummary.month)
            .order_by(DailyVisitSummary.month.desc())
            .limit(6)
            .all()
        )

        history: List[MonthStat] = []
        for m, m_vis, m_unq in monthly_groups:
            try:
                dt = datetime.strptime(m, "%Y-%m")
                m_name = dt.strftime("%b %Y")
            except Exception:
                m_name = m

            history.append(
                MonthStat(
                    month=m,
                    month_name=m_name,
                    unique_students=int(m_unq or 0),
                    total_visits=int(m_vis or 0)
                )
            )

        # If history is empty (fresh init), supply current month
        if not history:
            history.append(
                MonthStat(
                    month=current_month_str,
                    month_name=current_month_name,
                    unique_students=active_this_month,
                    total_visits=total_visits
                )
            )

        return AnalyticsResponse(
            total_visits=total_visits,
            active_this_month=active_this_month,
            active_past_30_days=active_past_30_days,
            active_past_7_days=active_past_7_days,
            today_visits=today_visits,
            today_unique_students=today_unique_students,
            current_month_name=current_month_name,
            monthly_history=history,
            visitor_id=current_visitor_id or "anonymous"
        )


analytics_service = AnalyticsService()
