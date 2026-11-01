from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Union
import logging
import dateutil.parser
from pydantic import BaseModel
from app.schemas.contest import ContestCreate

logger = logging.getLogger(__name__)


class CollectorResult(BaseModel):
    platform: str
    success: bool
    contests: List[ContestCreate] = []
    error_message: Optional[str] = None
    raw_count: int = 0


class BaseCollector(ABC):
    platform_id: str
    platform_name: str

    @staticmethod
    def generate_id(platform: str, external_id: str) -> str:
        """Create a deterministic unique ID for the contest."""
        clean_external_id = str(external_id).strip().replace(" ", "-")
        return f"{platform}_{clean_external_id}"

    @staticmethod
    def parse_datetime(
        dt_val: Union[int, float, str, datetime],
        default_tz: Optional[timezone] = None
    ) -> datetime:
        """Parse various datetime representations into a timezone-aware UTC datetime."""
        tz_to_use = default_tz or timezone.utc

        if isinstance(dt_val, datetime):
            if dt_val.tzinfo is None:
                return dt_val.replace(tzinfo=tz_to_use).astimezone(timezone.utc)
            return dt_val.astimezone(timezone.utc)

        if isinstance(dt_val, (int, float)):
            # If greater than 10^11, likely milliseconds
            if dt_val > 1e11:
                dt_val = dt_val / 1000.0
            return datetime.fromtimestamp(dt_val, tz=timezone.utc)

        if isinstance(dt_val, str):
            # Try parsing as float or int first
            try:
                num = float(dt_val)
                if num > 1e11:
                    num = num / 1000.0
                return datetime.fromtimestamp(num, tz=timezone.utc)
            except ValueError:
                pass
            
            parsed = dateutil.parser.parse(dt_val)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=tz_to_use).astimezone(timezone.utc)
            return parsed.astimezone(timezone.utc)

        raise ValueError(f"Cannot parse datetime from value: {dt_val} ({type(dt_val)})")

    @staticmethod
    def determine_status(
        start_time: datetime,
        duration_seconds: int,
        reference_time: Optional[datetime] = None
    ) -> str:
        """
        Determine whether contest is upcoming, ongoing, or completed.
        All comparisons use timezone-aware UTC datetimes.
        """
        if reference_time is None:
            reference_time = datetime.now(timezone.utc)
        elif reference_time.tzinfo is None:
            reference_time = reference_time.replace(tzinfo=timezone.utc)

        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)

        end_time = start_time + timedelta(seconds=duration_seconds)

        if reference_time < start_time:
            return "upcoming"
        elif start_time <= reference_time <= end_time:
            return "ongoing"
        else:
            return "completed"

    @abstractmethod
    async def fetch_and_normalize(self) -> CollectorResult:
        """Fetch raw contest data, validate and return normalized contests."""
        pass
