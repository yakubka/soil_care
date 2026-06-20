"""Aggregated dashboard data."""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import SensorReading, SoilAnalysis, SoilClassification
from ..schemas import (
    ActivityItem,
    AnalysisOut,
    DashboardSummary,
    HistoryPoint,
    SensorReadingOut,
    SoilClassificationOut,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_AVG_FIELDS = [
    "nitrogen", "potassium", "phosphorous", "temperature",
    "humidity", "moisture", "soil_temperature", "light_intensity",
]


@router.get("/summary", response_model=DashboardSummary)
async def summary(db: AsyncSession = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(hours=24)

    latest_reading = (
        await db.execute(select(SensorReading).order_by(SensorReading.timestamp.desc()).limit(1))
    ).scalars().first()

    latest_analysis = (
        await db.execute(select(SoilAnalysis).order_by(SoilAnalysis.created_at.desc()).limit(1))
    ).scalars().first()

    latest_classification = (
        await db.execute(
            select(SoilClassification).order_by(SoilClassification.created_at.desc()).limit(1)
        )
    ).scalars().first()

    recent = (
        await db.execute(select(SensorReading).where(SensorReading.timestamp >= since))
    ).scalars().all()

    # Averages over the last 24h
    averages: dict[str, float | None] = {}
    for field in _AVG_FIELDS:
        vals = [getattr(r, field) for r in recent if getattr(r, field) is not None]
        averages[field] = round(sum(vals) / len(vals), 2) if vals else None

    # Recommended-crop distribution over the last 24h
    recent_analyses = (
        await db.execute(select(SoilAnalysis).where(SoilAnalysis.created_at >= since))
    ).scalars().all()
    crop_dist = Counter(
        a.recommended_crop for a in recent_analyses if a.recommended_crop is not None
    )

    active_alerts = (latest_analysis.alerts or []) if latest_analysis else []

    return DashboardSummary(
        latest_reading=SensorReadingOut.model_validate(latest_reading) if latest_reading else None,
        latest_analysis=AnalysisOut.model_validate(latest_analysis) if latest_analysis else None,
        latest_classification=(
            SoilClassificationOut.model_validate(latest_classification)
            if latest_classification
            else None
        ),
        averages_24h=averages,
        readings_count_24h=len(recent),
        crop_distribution_24h=dict(crop_dist),
        active_alerts=active_alerts,
    )


@router.get("/history", response_model=list[HistoryPoint])
async def history(
    hours: int = Query(default=24, ge=1, le=720),
    device_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(SensorReading)
        .where(SensorReading.timestamp >= since)
        .order_by(SensorReading.timestamp.asc())
    )
    if device_id:
        stmt = stmt.where(SensorReading.device_id == device_id)
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.get("/activity", response_model=list[ActivityItem])
async def activity(limit: int = Query(default=12, le=50), db: AsyncSession = Depends(get_db)):
    """Recent ingest events (reading + its analysis) for the live pipeline feed."""
    stmt = (
        select(SensorReading, SoilAnalysis)
        .join(SoilAnalysis, SoilAnalysis.reading_id == SensorReading.id)
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    items: list[ActivityItem] = []
    for reading, analysis in rows:
        alerts = analysis.alerts or []
        severities = {a.get("severity") for a in alerts}
        max_sev = "CRITICAL" if "CRITICAL" in severities else ("WARNING" if "WARNING" in severities else None)
        items.append(
            ActivityItem(
                reading_id=reading.id,
                timestamp=reading.timestamp,
                device_id=reading.device_id,
                soil_type=analysis.soil_type,
                recommended_crop=analysis.recommended_crop,
                recommended_fertilizer=analysis.recommended_fertilizer,
                crop_confidence=analysis.crop_confidence,
                alert_count=len(alerts),
                max_severity=max_sev,
            )
        )
    return items
