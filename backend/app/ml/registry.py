"""Holds the heavy ML objects as process-wide singletons.

Loaded once during FastAPI startup (see main.lifespan) so models are NOT
re-read from disk on every request.
"""
from __future__ import annotations

from pathlib import Path

from .recommenders import CropRecommender, FertilizerRecommender, SensorMonitor
from .soil_image_model import SoilImageClassifier


class ModelRegistry:
    soil_image: SoilImageClassifier
    crop: CropRecommender
    fertilizer: FertilizerRecommender
    monitor: SensorMonitor

    def __init__(self) -> None:
        self._loaded = False

    def load(self, weights_dir: Path, device: str) -> None:
        self.soil_image = SoilImageClassifier(weights_dir / "best_model.pth", device=device)
        self.crop = CropRecommender(weights_dir)
        self.fertilizer = FertilizerRecommender(weights_dir)
        self.monitor = SensorMonitor(weights_dir)
        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded


registry = ModelRegistry()
