"""Tiny in-memory context shared across requests.

Holds the most recent soil type detected from a photo (EfficientNet), per
device, so it can drive the crop/fertilizer recommendations for subsequent
live sensor readings.
"""
from __future__ import annotations

# Fallback used until a photo has been classified at least once.
DEFAULT_SOIL_TYPE = "Loamy"

_last_soil_by_device: dict[str, str] = {}


def set_last_soil(device_id: str | None, soil_type: str | None) -> None:
    if device_id and soil_type:
        _last_soil_by_device[device_id] = soil_type


def get_last_soil(device_id: str | None) -> str | None:
    if device_id:
        return _last_soil_by_device.get(device_id)
    return None
