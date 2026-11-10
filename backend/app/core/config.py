from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "EVRaid Cloud Ingestion API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/v1"
    
    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "evraid_cloud"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/evraid_cloud"
    
    # Redis
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Internal Webhook Security Token
    INTERNAL_SYNC_TOKEN: str = "evraid-warranty-sync-secret-key"

    # Environment
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore" # Ignore extra env vars safely
    )

settings = Settings()

