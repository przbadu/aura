from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # LLM Configuration
    llm_provider: str = "openai"  # "anthropic" or "openai" (openai-compatible)
    llm_base_url: str = "http://192.168.1.150:8082/v1"  # OpenAI-compatible endpoint
    llm_api_key: str = "not-needed"  # API key (use "not-needed" for local LLMs)
    llm_model: str = "qwen3.5"  # Model name
    llm_max_tokens: int = 4096

    # Legacy key (still supported if provider is "anthropic")
    anthropic_api_key: str = ""

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5100"]
    debug: bool = False
    sandbox_enabled: bool = False

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
