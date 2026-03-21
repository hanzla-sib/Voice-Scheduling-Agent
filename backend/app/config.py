from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash-native-audio-preview-12-2025"

    # Service account JSON key file (recommended)
    google_service_account_path: str = "service-account.json"
    # The calendar ID to create events on (your email, or a specific calendar ID)
    google_calendar_id: str = "primary"
    # Timezone for events
    calendar_timezone: str = "UTC"

    # Legacy OAuth (fallback if service account not found)
    google_calendar_credentials_path: str = "credentials.json"

    # Gmail SMTP for sending calendar invite emails
    smtp_email: str = ""
    smtp_app_password: str = ""
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    serve_frontend: bool = False
    frontend_dist_path: str = "../frontend/dist"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
