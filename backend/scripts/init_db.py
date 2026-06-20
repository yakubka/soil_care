"""Create database tables. Run once: `python scripts/init_db.py` (from backend/)."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Allow running as a standalone script from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base, engine  # noqa: E402
from app import models  # noqa: E402,F401  (import registers ORM models)


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")


if __name__ == "__main__":
    asyncio.run(main())
