"""Soil Care System — FastAPI entry point.

Heavy ML models are loaded ONCE at startup (lifespan) and shared across requests.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Make the "soilcare.pipeline" RX/ML logs visible in the uvicorn console.
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(name)s  %(message)s", datefmt="%H:%M:%S")
logging.getLogger("soilcare.pipeline").setLevel(logging.INFO)

from app.config import get_settings
from app.database import Base, engine
from app.ml.registry import registry
from app.routers import analysis, dashboard, sensor_data, soil

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Load ML artifacts (EfficientNet + RandomForests + corridors).
    registry.load(settings.weights_path, settings.device)
    # 2. Ensure tables exist (handy for SQLite; for Postgres prefer scripts/init_db.py).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Soil Care System", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sensor_data.router)
app.include_router(analysis.router)
app.include_router(soil.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "models_loaded": registry.is_loaded,
        "soil_image_accuracy": registry.soil_image.best_val_accuracy if registry.is_loaded else None,
    }
