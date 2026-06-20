"""Tabular recommenders + sensor anomaly monitor.

Wraps the three sklearn/joblib artifacts produced by the reference scripts:
  - crop_model.pkl      → recommended crop
  - fert_model.pkl      → recommended fertilizer
  - sensor_corridors.pkl→ per-crop normal ranges for anomaly alerts

Each model has its OWN set of LabelEncoders saved alongside it, so we keep them
separate (crop_le_* vs fert_le_*) and never cross-encode.
"""
from __future__ import annotations

import warnings
from pathlib import Path

import joblib
import pandas as pd

from .mappings import CROP_FEATURES, FERT_FEATURES

# The .pkl models were pickled with scikit-learn 1.8.0; loading them on the
# pinned stable 1.6.1 works fine but emits InconsistentVersionWarning. The
# warning is benign here (RandomForest internals are compatible), so silence it.
try:
    from sklearn.exceptions import InconsistentVersionWarning

    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except Exception:  # pragma: no cover - older/newer sklearn without this class
    pass

# Maps fertilizer abbreviations from the dataset to NPK action hints,
# mirroring FERT_MAP in 3_sensor_monitor.py.
FERT_ACTIONS = {
    "Nitrogen": "Urea (high nitrogen)",
    "Phosphorous": "DAP (high phosphorus)",
    "Potassium": "17-17-17 or 28-28 (potassium supplement)",
}


class CropRecommender:
    def __init__(self, weights_dir: Path):
        self.model = joblib.load(weights_dir / "crop_model.pkl")
        self.le_soil = joblib.load(weights_dir / "crop_le_soil.pkl")
        self.le_crop = joblib.load(weights_dir / "crop_le_crop.pkl")

    @property
    def soil_types(self) -> list[str]:
        return list(self.le_soil.classes_)

    def recommend(
        self,
        nitrogen: float,
        potassium: float,
        phosphorous: float,
        temperature: float,
        humidity: float,
        moisture: float,
        soil_type: str,
    ) -> dict:
        soil_enc = int(self.le_soil.transform([soil_type])[0])
        row = {
            "Nitrogen": nitrogen,
            "Potassium": potassium,
            "Phosphorous": phosphorous,
            "Temparature": temperature,
            "Humidity": humidity,
            "Moisture": moisture,
            "Soil_enc": soil_enc,
        }
        X = pd.DataFrame([row], columns=CROP_FEATURES)
        proba = self.model.predict_proba(X)[0]
        pred_idx = int(proba.argmax())
        crop = self.le_crop.inverse_transform([self.model.classes_[pred_idx]])[0]
        return {
            "recommended_crop": str(crop),
            "confidence": float(proba[pred_idx]),
            "probabilities": {
                str(self.le_crop.inverse_transform([self.model.classes_[i]])[0]): float(proba[i])
                for i in range(len(proba))
            },
        }


class FertilizerRecommender:
    def __init__(self, weights_dir: Path):
        self.model = joblib.load(weights_dir / "fert_model.pkl")
        self.le_soil = joblib.load(weights_dir / "fert_le_soil.pkl")
        self.le_crop = joblib.load(weights_dir / "fert_le_crop.pkl")
        self.le_fert = joblib.load(weights_dir / "fert_le_fert.pkl")

    @property
    def crop_types(self) -> list[str]:
        return list(self.le_crop.classes_)

    def recommend(
        self,
        nitrogen: float,
        potassium: float,
        phosphorous: float,
        temperature: float,
        humidity: float,
        moisture: float,
        soil_type: str,
        crop_type: str,
    ) -> dict:
        soil_enc = int(self.le_soil.transform([soil_type])[0])
        crop_enc = int(self.le_crop.transform([crop_type])[0])
        row = {
            "Nitrogen": nitrogen,
            "Potassium": potassium,
            "Phosphorous": phosphorous,
            "Temparature": temperature,
            "Humidity": humidity,
            "Moisture": moisture,
            "Soil_enc": soil_enc,
            "Crop_enc": crop_enc,
        }
        X = pd.DataFrame([row], columns=FERT_FEATURES)
        proba = self.model.predict_proba(X)[0]
        pred_idx = int(proba.argmax())
        fert = self.le_fert.inverse_transform([self.model.classes_[pred_idx]])[0]
        return {
            "recommended_fertilizer": str(fert),
            "confidence": float(proba[pred_idx]),
            "probabilities": {
                str(self.le_fert.inverse_transform([self.model.classes_[i]])[0]): float(proba[i])
                for i in range(len(proba))
            },
        }


class SensorMonitor:
    """Per-crop corridor anomaly detection (port of 3_sensor_monitor.py)."""

    def __init__(self, weights_dir: Path):
        self.corridors = joblib.load(weights_dir / "sensor_corridors.pkl")

    @property
    def crops(self) -> list[str]:
        return sorted(self.corridors.keys())

    def corridor_for(self, crop: str) -> dict | None:
        return self.corridors.get(crop)

    def check(self, crop: str, readings: dict[str, float]) -> list[dict]:
        alerts: list[dict] = []
        crop_corridor = self.corridors.get(crop, {})
        for param, value in readings.items():
            if value is None or param not in crop_corridor:
                continue
            c = crop_corridor[param]
            normal_range = f'{c["low"]:.1f} - {c["high"]:.1f}'
            if value < c["low"]:
                severity = "CRITICAL" if value < c["low"] * 0.7 else "WARNING"
                alerts.append(self._alert(param, value, normal_range, severity, "low"))
            elif value > c["high"]:
                severity = "CRITICAL" if value > c["high"] * 1.3 else "WARNING"
                alerts.append(self._alert(param, value, normal_range, severity, "high"))
        return alerts

    @staticmethod
    def _alert(param, value, normal_range, severity, direction) -> dict:
        return {
            "param": param,
            "value": float(value),
            "normal_range": normal_range,
            "severity": severity,
            "action": SensorMonitor._action(param, direction),
        }

    @staticmethod
    def _action(param: str, direction: str) -> str:
        if param == "Moisture":
            return (
                "IRRIGATION NEEDED — soil moisture below crop corridor"
                if direction == "low"
                else "Reduce irrigation — risk of waterlogging"
            )
        if param == "Nitrogen":
            return (
                f"Apply {FERT_ACTIONS['Nitrogen']}"
                if direction == "low"
                else "Skip nitrogen — levels excessive, risk of lodging"
            )
        if param == "Phosphorous":
            return (
                f"Apply {FERT_ACTIONS['Phosphorous']}"
                if direction == "low"
                else "Skip phosphorus — excess may lock out micronutrients"
            )
        if param == "Potassium":
            return (
                f"Apply {FERT_ACTIONS['Potassium']}"
                if direction == "low"
                else "Skip potassium — levels sufficient"
            )
        if param == "Temparature":
            return (
                "Temperature low — monitor for cold stress"
                if direction == "low"
                else "Temperature high — increase shade/irrigation"
            )
        if param == "Humidity":
            return (
                "Humidity low — increase misting/sprinklers"
                if direction == "low"
                else "Humidity high — watch for fungal disease"
            )
        return "Monitor closely"


def readings_to_corridor_dict(
    nitrogen: float | None,
    potassium: float | None,
    phosphorous: float | None,
    temperature: float | None,
    humidity: float | None,
    moisture: float | None,
) -> dict[str, float]:
    """Build the {param: value} dict the corridor monitor expects."""
    return {
        "Nitrogen": nitrogen,
        "Potassium": potassium,
        "Phosphorous": phosphorous,
        "Temparature": temperature,
        "Humidity": humidity,
        "Moisture": moisture,
    }
