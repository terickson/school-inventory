from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./school_inventory.db"
    secret_key: str = "dev-secret-key-change-in-production-abc123"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    admin_username: str = "admin"
    admin_password: str = "AdminPass123!"
    cors_origins: list[str] = ["http://localhost:5173"]
    environment: str = "development"
    upload_dir: str = "uploads"
    max_image_size_mb: int = 5
    anthropic_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
