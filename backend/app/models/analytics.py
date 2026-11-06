from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Index
from app.db.session import Base


class StudentVisitor(Base):
    """Tracks unique students with an anonymous persistent visitor ID."""
    __tablename__ = "student_visitors"

    id = Column(String, primary_key=True, index=True)  # Anonymous unique visitor/student id
    first_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    visit_count = Column(Integer, default=1, nullable=False)
    last_user_agent = Column(String, nullable=True)

    __table_args__ = (
        Index("idx_visitor_last_seen", "last_seen_at"),
    )


class DailyVisitSummary(Base):
    """Daily aggregated visit counts and unique students."""
    __tablename__ = "daily_visit_summaries"

    date = Column(String, primary_key=True, index=True)  # "YYYY-MM-DD"
    month = Column(String, index=True, nullable=False)    # "YYYY-MM"
    total_visits = Column(Integer, default=0, nullable=False)
    unique_visitors = Column(Integer, default=0, nullable=False)


class GlobalCounter(Base):
    """Single-row high-speed counter for total site visits."""
    __tablename__ = "global_counters"

    key = Column(String, primary_key=True)  # e.g., "site_visits"
    value = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
