"""Orchestrates the full agronomy pipeline on a set of sensor readings.

    sensor readings (+ soil type) ──► crop recommendation
                                  └──► fertilizer recommendation (needs crop)
    crop + readings ──────────────────► corridor anomaly alerts
"""
from __future__ import annotations

from ..ml.recommenders import readings_to_corridor_dict
from ..ml.registry import registry


def analyze(
    *,
    nitrogen: float,
    potassium: float,
    phosphorous: float,
    temperature: float,
    humidity: float,
    moisture: float,
    soil_type: str | None,
    crop_type: str | None = None,
) -> dict:
    """Run whatever stages the available inputs allow.

    - Crop recommendation needs `soil_type`.
    - Fertilizer recommendation needs a crop: uses `crop_type` if the caller
      provided one, otherwise the just-recommended crop.
    - Corridor alerts need a crop as well.
    Missing inputs degrade gracefully (that stage is simply skipped).
    """
    result: dict = {
        "soil_type": soil_type,
        "recommended_crop": None,
        "crop_confidence": None,
        "crop_probabilities": None,
        "recommended_fertilizer": None,
        "fertilizer_confidence": None,
        "fertilizer_probabilities": None,
        "alerts": [],
    }

    if soil_type:
        crop_out = registry.crop.recommend(
            nitrogen=nitrogen,
            potassium=potassium,
            phosphorous=phosphorous,
            temperature=temperature,
            humidity=humidity,
            moisture=moisture,
            soil_type=soil_type,
        )
        result["recommended_crop"] = crop_out["recommended_crop"]
        result["crop_confidence"] = crop_out["confidence"]
        result["crop_probabilities"] = crop_out["probabilities"]

    # Crop used downstream: explicit override wins, else the recommended one.
    effective_crop = crop_type or result["recommended_crop"]

    if soil_type and effective_crop:
        fert_out = registry.fertilizer.recommend(
            nitrogen=nitrogen,
            potassium=potassium,
            phosphorous=phosphorous,
            temperature=temperature,
            humidity=humidity,
            moisture=moisture,
            soil_type=soil_type,
            crop_type=effective_crop,
        )
        result["recommended_fertilizer"] = fert_out["recommended_fertilizer"]
        result["fertilizer_confidence"] = fert_out["confidence"]
        result["fertilizer_probabilities"] = fert_out["probabilities"]

    if effective_crop:
        readings = readings_to_corridor_dict(
            nitrogen, potassium, phosphorous, temperature, humidity, moisture
        )
        result["alerts"] = registry.monitor.check(effective_crop, readings)
        result["monitored_crop"] = effective_crop

    return result
