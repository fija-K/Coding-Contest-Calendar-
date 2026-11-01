from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, UniqueConstraint, Index
from app.db.session import Base


class Contest(Base):
    __tablename__ = "contests"

    id = Column(String, primary_key=True, index=True)
    platform = Column(String, nullable=False, index=True)
    external_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_seconds = Column(Integer, nullable=False)
    contest_url = Column(String, nullable=False)
    status = Column(String, nullable=False, index=True)  # upcoming, ongoing, completed
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("platform", "external_id", name="uq_platform_external_id"),
        Index("idx_platform_status_start", "platform", "status", "start_time"),
    )

    @property
    def end_time(self) -> datetime:
        from datetime import timedelta
        return self.start_time + timedelta(seconds=self.duration_seconds)
