from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    anthropic_api_key: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]
    debug: bool = False
    sandbox_enabled: bool = False

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8"}


settings = Settings()
