from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from app.db.session import Base


class PlatformHealth(Base):
    __tablename__ = "platform_health"

    platform = Column(String, primary_key=True, index=True)
    last_successful_refresh = Column(DateTime(timezone=True), nullable=True)
    last_attempted_refresh = Column(DateTime(timezone=True), nullable=True)
    health = Column(String, nullable=False, default="unknown")  # healthy, degraded, error
    latest_error = Column(String, nullable=True)
    contest_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
