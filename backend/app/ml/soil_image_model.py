"""EfficientNet-B0 soil-type image classifier.

Loads `best_model.pth`, a checkpoint dict produced during training:
    {
        "model_name": "efficientnet_b0",
        "class_names": ["Alluvial soil", "Black Soil", "Clay soil", "Red soil"],
        "num_classes": 4,
        "best_val_accuracy": 1.0,
        "model_state_dict": {...},
        "resumed_from": "...",
    }

The model is built once at startup and reused for every request.
"""
from __future__ import annotations

import io
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0


class SoilImageClassifier:
    def __init__(self, weights_path: str | Path, device: str = "cpu"):
        self.device = torch.device(device)

        checkpoint = torch.load(weights_path, map_location=self.device, weights_only=False)

        self.class_names: list[str] = list(checkpoint["class_names"])
        self.num_classes: int = int(checkpoint["num_classes"])
        self.best_val_accuracy: float = float(checkpoint.get("best_val_accuracy", 0.0))

        # Rebuild the exact architecture and swap the classifier head to num_classes.
        model = efficientnet_b0(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, self.num_classes)
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        model.to(self.device)
        self.model = model

        # Standard ImageNet eval preprocessing (EfficientNet-B0 was fine-tuned on it).
        self.transform = transforms.Compose(
            [
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )

    def predict(self, image_bytes: bytes) -> dict:
        """Classify a raw image (bytes) into a soil type."""
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        x = self.transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(x)
            probs = torch.softmax(logits, dim=1)[0]

        pred_idx = int(probs.argmax().item())
        return {
            "predicted_soil": self.class_names[pred_idx],
            "confidence": float(probs[pred_idx]),
            "probabilities": {
                self.class_names[i]: float(probs[i]) for i in range(self.num_classes)
            },
        }
