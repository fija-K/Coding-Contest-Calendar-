import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Coding Contest Calendar"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str = "sqlite:///./contests.db"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]
    
    ADMIN_API_KEY: str = "dev-admin-secret-key-change-in-prod"
    REFRESH_INTERVAL_MINUTES: int = 30
    HTTP_TIMEOUT_SECONDS: int = 15
    MAX_RETRIES: int = 3
    
    CODEFORCES_API_URL: str = "https://codeforces.com/api/contest.list?gym=false"
    CODECHEF_API_URL: str = "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all"
    LEETCODE_GRAPHQL_URL: str = "https://leetcode.com/graphql"
    GFG_API_URL: str = "https://practiceapi.geeksforgeeks.org/api/vr/events/?type=contest&sub_type=all&category=all"
    
    USER_AGENT: str = "CodingContestCalendar/1.0 (Educational CP Calendar; mailto:admin@example.com)"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
