"""Sensor ingestion endpoints (ESP32 → backend)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import SensorReading, SoilAnalysis
from ..schemas import SensorDataIn, SensorDataResponse, SensorReadingOut
from ..services import advisor
from ..services.context import DEFAULT_SOIL_TYPE, get_last_soil

router = APIRouter(prefix="/api/sensor-data", tags=["sensor-data"])
log = logging.getLogger("soilcare.pipeline")


def _coalesce(*values: float | None) -> float:
    """First non-None value, else 0.0 (models expect numeric input)."""
    for v in values:
        if v is not None:
            return float(v)
    return 0.0


@router.post("", response_model=SensorDataResponse)
async def create_sensor_data(data: SensorDataIn, db: AsyncSession = Depends(get_db)):
    ts = (
        datetime.fromtimestamp(data.timestamp, tz=timezone.utc)
        if data.timestamp
        else datetime.now(timezone.utc)
    )

    # Soil type precedence: latest photo classification (EfficientNet) wins, then
    # the value the board sent, then a sane default. This is what makes the photo
    # model drive the live crop/fertilizer recommendations.
    photo_soil = get_last_soil(data.device_id)
    soil_type = photo_soil or data.soil_type or DEFAULT_SOIL_TYPE
    soil_source = "photo" if photo_soil else ("device" if data.soil_type else "default")

    reading = SensorReading(
        device_id=data.device_id,
        timestamp=ts,
        nitrogen=data.nitrogen,
        potassium=data.potassium,
        phosphorous=data.phosphorous,
        temperature=data.temperature,
        humidity=data.humidity,
        moisture=data.moisture,
        soil_temperature=data.soil_temperature,
        light_intensity=data.light_intensity,
        soil_type=soil_type,
        crop_type=data.crop_type,
    )
    db.add(reading)
    await db.flush()  # assign reading.id
    log.info(
        "RX  reading #%s from %s | N=%s P=%s K=%s T=%s°C H=%s%% moist=%s%% soilT=%s°C lux=%s soil=%s(%s)",
        reading.id, data.device_id, data.nitrogen, data.phosphorous, data.potassium,
        data.temperature, data.humidity, data.moisture, data.soil_temperature,
        data.light_intensity, soil_type, soil_source,
    )

    out = advisor.analyze(
        nitrogen=_coalesce(data.nitrogen),
        potassium=_coalesce(data.potassium),
        phosphorous=_coalesce(data.phosphorous),
        temperature=_coalesce(data.temperature),
        humidity=_coalesce(data.humidity),
        moisture=_coalesce(data.moisture),
        soil_type=soil_type,
        crop_type=data.crop_type,
    )

    analysis = SoilAnalysis(
        reading_id=reading.id,
        soil_type=out["soil_type"],
        recommended_crop=out["recommended_crop"],
        crop_confidence=out["crop_confidence"],
        crop_probabilities=out["crop_probabilities"],
        recommended_fertilizer=out["recommended_fertilizer"],
        fertilizer_confidence=out["fertilizer_confidence"],
        fertilizer_probabilities=out["fertilizer_probabilities"],
        alerts=out["alerts"],
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(reading)
    await db.refresh(analysis)

    n_alerts = len(out["alerts"])
    log.info(
        "ML  reading #%s -> crop=%s (%.0f%%) fert=%s | %s alert(s) | DB committed ✓",
        reading.id,
        out["recommended_crop"],
        (out["crop_confidence"] or 0) * 100,
        out["recommended_fertilizer"],
        n_alerts,
    )

    return SensorDataResponse(
        id=reading.id,
        reading=SensorReadingOut.model_validate(reading),
        analysis=analysis,  # type: ignore[arg-type]  (validated via from_attributes)
    )


@router.get("", response_model=list[SensorReadingOut])
async def list_sensor_data(
    device_id: str | None = None,
    limit: int = Query(default=100, le=1000),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SensorReading).order_by(SensorReading.timestamp.desc()).limit(limit)
    if device_id:
        stmt = stmt.where(SensorReading.device_id == device_id)
    rows = (await db.execute(stmt)).scalars().all()
    return rows
