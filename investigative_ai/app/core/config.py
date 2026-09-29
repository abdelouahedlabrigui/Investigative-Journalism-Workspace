# app/core/config.py
from pathlib import Path
from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ---------- Mongo ----------
    mongodb_uri: SecretStr = Field(
        default="mongodb://admin:supersecretpassword@10.42.0.243:27017/investigate_ai?authSource=admin", env="MONGODB_URI")
    mongodb_db_name: str = Field(default="investigate_ai", env="MONGODB_DB_NAME")

    # ---------- Ollama ----------
    ollama_base_url: str = Field(default="http://localhost:11434/api", env="OLLAMA_BASE_URL")
    ollama_default_model: str = Field(default="gemma3:1b", env="OLLAMA_MODEL")
    ollama_timeout: int = Field(default=60, description="seconds for Ollama HTTP calls")

    # ---------- Misc ----------
    allowed_origins: list[str] = Field(default=["http://localhost:3000", "http://127.0.0.1:3000"], env="ALLOWED_ORIGINS")  # adjust for prod

    model_config = {"env_file": ".env", "extra": "ignore"}
    


    @model_validator(mode="after")
    def normalize_origin(cls, values):
        # turn comma‑separated strings into list if needed
        if isinstance(values.allowed_origins, str):
            values.allowed_origins = [origin.strip() for origin in values.allowed_origins.split(",")]
        return values


settings = Settings()
