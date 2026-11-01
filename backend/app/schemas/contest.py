from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator, computed_field


class ContestBase(BaseModel):
    name: str = Field(..., description="Contest title")
    platform: str = Field(..., description="Platform identifier: codeforces, codechef, leetcode")
    external_id: str = Field(..., description="Source platform contest ID or code")
    start_time: datetime = Field(..., description="UTC start time in ISO 8601 format")
    duration_seconds: int = Field(..., ge=0, description="Duration of the contest in seconds")
    contest_url: str = Field(..., description="Official URL to contest page")
    status: str = Field(..., description="Contest state: upcoming, ongoing, completed")

    @field_validator("start_time", mode="after")
    @classmethod
    def ensure_start_time_utc(cls, v: datetime) -> datetime:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)


class ContestCreate(ContestBase):
    id: str = Field(..., description="Deterministic unique identifier")
    source_updated_at: Optional[datetime] = None

    @field_validator("source_updated_at", mode="after")
    @classmethod
    def ensure_source_updated_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc) if v else None


class ContestResponse(ContestBase):
    id: str
    source_updated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("source_updated_at", "created_at", "updated_at", mode="after")
    @classmethod
    def ensure_timestamps_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    @computed_field
    def end_time(self) -> datetime:
        from datetime import timedelta
        st = self.start_time
        if st.tzinfo is None:
            st = st.replace(tzinfo=timezone.utc)
        return st + timedelta(seconds=self.duration_seconds)

    model_config = ConfigDict(from_attributes=True)


class ContestListResponse(BaseModel):
    items: List[ContestResponse]
    total: int = Field(..., description="Total matching items before pagination")
    limit: int
    offset: int


class PlatformStatusResponse(BaseModel):
    platform: str
    name: str
    health: str  # healthy, degraded, error, unknown
    last_successful_refresh: Optional[datetime] = None
    last_attempted_refresh: Optional[datetime] = None
    latest_error: Optional[str] = None
    contest_count: int = 0
    is_stale: bool = False

    @field_validator("last_successful_refresh", "last_attempted_refresh", mode="after")
    @classmethod
    def ensure_refresh_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)


class HealthResponse(BaseModel):
    status: str
    database: str
    scheduler_running: bool
    total_contests: int
    timestamp: datetime
