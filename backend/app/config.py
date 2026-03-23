from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./school_inventory.db"
    secret_key: str = "dev-secret-key-change-in-production-abc123"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    admin_username: str = "admin"
    admin_email: str = "admin@school.edu"
    admin_password: str = "AdminPass123!"
    cors_origins: list[str] = ["http://localhost:5173"]
    environment: str = "development"
    default_checkout_days: int = 7

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
