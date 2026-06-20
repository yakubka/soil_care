from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ root — the directory that contains main.py and the app/ package.
# Anchoring relative paths here makes the app work no matter which directory
# uvicorn is launched from (e.g. `--app-dir` from your home folder).
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings, loaded from environment / .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./soilcare.db"
    weights_dir: str = "app/ml/weights"
    device: str = "cpu"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"

    @property
    def weights_path(self) -> Path:
        p = Path(self.weights_dir)
        return p if p.is_absolute() else (BASE_DIR / p)

    @property
    def resolved_database_url(self) -> str:
        """Anchor a relative default SQLite file to backend/ (CWD-independent)."""
        prefix = "sqlite+aiosqlite:///./"
        if self.database_url.startswith(prefix):
            rel = self.database_url[len(prefix):]
            return f"sqlite+aiosqlite:///{(BASE_DIR / rel).as_posix()}"
        return self.database_url

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
