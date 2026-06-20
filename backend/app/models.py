"""SQLAlchemy ORM models."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Agronomy sensor channels (match the trained models' features).
    nitrogen: Mapped[float | None] = mapped_column(Float, nullable=True)
    potassium: Mapped[float | None] = mapped_column(Float, nullable=True)
    phosphorous: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)   # air temp (DHT22)
    humidity: Mapped[float | None] = mapped_column(Float, nullable=True)      # air humidity (DHT22)
    moisture: Mapped[float | None] = mapped_column(Float, nullable=True)      # soil moisture (capacitive)
    soil_temperature: Mapped[float | None] = mapped_column(Float, nullable=True)  # DS18B20 probe
    light_intensity: Mapped[float | None] = mapped_column(Float, nullable=True)   # BH1750 (lux)

    soil_type: Mapped[str | None] = mapped_column(String, nullable=True)
    crop_type: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    analysis: Mapped["SoilAnalysis | None"] = relationship(
        back_populates="reading", uselist=False, cascade="all, delete-orphan"
    )


class SoilAnalysis(Base):
    __tablename__ = "soil_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reading_id: Mapped[int] = mapped_column(ForeignKey("sensor_readings.id"), index=True)

    soil_type: Mapped[str | None] = mapped_column(String, nullable=True)
    recommended_crop: Mapped[str | None] = mapped_column(String, nullable=True)
    crop_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    crop_probabilities: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    recommended_fertilizer: Mapped[str | None] = mapped_column(String, nullable=True)
    fertilizer_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    fertilizer_probabilities: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    alerts: Mapped[list | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    reading: Mapped["SensorReading"] = relationship(back_populates="analysis")


class SoilClassification(Base):
    """A soil-type prediction made from an uploaded photo (EfficientNet)."""

    __tablename__ = "soil_classifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str | None] = mapped_column(String, nullable=True)
    predicted_soil: Mapped[str] = mapped_column(String, nullable=False)        # raw image class
    tabular_soil_type: Mapped[str | None] = mapped_column(String, nullable=True)  # mapped for recommenders
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    probabilities: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
