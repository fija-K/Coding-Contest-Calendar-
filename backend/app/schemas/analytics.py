from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class VisitRecordRequest(BaseModel):
    visitor_id: Optional[str] = Field(None, description="Client-side anonymous student/visitor ID")
    path: Optional[str] = Field(None, description="Visited path or view")
    client_last_visits: Optional[int] = Field(None, description="High-water mark visit count observed by client for multi-container synchronization")


class MonthStat(BaseModel):
    month: str  # e.g. "2026-11"
    month_name: str  # e.g. "Nov 2026"
    unique_students: int
    total_visits: int


class AnalyticsResponse(BaseModel):
    total_visits: int
    active_this_month: int
    active_past_30_days: int
    active_past_7_days: int
    today_visits: int
    today_unique_students: int
    current_month_name: str
    monthly_history: List[MonthStat]
    visitor_id: str
