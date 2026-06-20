"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------- #
# Sensor ingestion
# --------------------------------------------------------------------------- #
class SensorDataIn(BaseModel):
    device_id: str = "esp32-soil-01"
    timestamp: int | None = Field(
        default=None, description="Unix epoch seconds; defaults to server time if omitted"
    )
    nitrogen: float | None = None
    potassium: float | None = None
    phosphorous: float | None = None
    temperature: float | None = None
    humidity: float | None = None
    moisture: float | None = None
    soil_temperature: float | None = None
    light_intensity: float | None = None
    soil_type: str | None = Field(default=None, description="Tabular soil type for recommenders")
    crop_type: str | None = Field(default=None, description="Override crop for fert/monitoring")


class AlertOut(BaseModel):
    param: str
    value: float
    normal_range: str
    severity: str
    action: str


class AnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    reading_id: int | None = None
    soil_type: str | None = None
    recommended_crop: str | None = None
    crop_confidence: float | None = None
    crop_probabilities: dict[str, float] | None = None
    recommended_fertilizer: str | None = None
    fertilizer_confidence: float | None = None
    fertilizer_probabilities: dict[str, float] | None = None
    alerts: list[AlertOut] = []
    created_at: datetime | None = None


class SensorReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    timestamp: datetime
    nitrogen: float | None = None
    potassium: float | None = None
    phosphorous: float | None = None
    temperature: float | None = None
    humidity: float | None = None
    moisture: float | None = None
    soil_temperature: float | None = None
    light_intensity: float | None = None
    soil_type: str | None = None
    crop_type: str | None = None
    created_at: datetime


class SensorDataResponse(BaseModel):
    id: int
    status: str = "ok"
    reading: SensorReadingOut
    analysis: AnalysisOut


# --------------------------------------------------------------------------- #
# Manual analysis (no DB write) — for testing without hardware
# --------------------------------------------------------------------------- #
class ManualAnalysisIn(BaseModel):
    nitrogen: float
    potassium: float
    phosphorous: float
    temperature: float
    humidity: float
    moisture: float
    soil_type: str
    crop_type: str | None = None


# --------------------------------------------------------------------------- #
# Soil image classification
# --------------------------------------------------------------------------- #
class SoilClassificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    device_id: str | None = None
    predicted_soil: str
    tabular_soil_type: str | None = None
    confidence: float
    probabilities: dict[str, float] | None = None
    created_at: datetime | None = None


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
class DashboardSummary(BaseModel):
    latest_reading: SensorReadingOut | None = None
    latest_analysis: AnalysisOut | None = None
    latest_classification: SoilClassificationOut | None = None
    averages_24h: dict[str, float | None] = {}
    readings_count_24h: int = 0
    crop_distribution_24h: dict[str, int] = {}
    active_alerts: list[AlertOut] = []


class HistoryPoint(BaseModel):
    timestamp: datetime
    nitrogen: float | None = None
    potassium: float | None = None
    phosphorous: float | None = None
    temperature: float | None = None
    humidity: float | None = None
    moisture: float | None = None
    soil_temperature: float | None = None
    light_intensity: float | None = None


class ActivityItem(BaseModel):
    """One ingest event for the live pipeline feed: reading -> stored -> model."""

    reading_id: int
    timestamp: datetime
    device_id: str
    soil_type: str | None = None
    recommended_crop: str | None = None
    recommended_fertilizer: str | None = None
    crop_confidence: float | None = None
    alert_count: int = 0
    max_severity: str | None = None  # CRITICAL | WARNING | None


class MetaOut(BaseModel):
    soil_types: list[str]
    image_soil_classes: list[str]
    crop_types: list[str]
    image_to_tabular_soil: dict[str, str]
    model_accuracy: float
