"""Soil-type classification from a photo (EfficientNet-B0) + metadata."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..ml.mappings import IMAGE_TO_TABULAR_SOIL, map_image_soil_to_tabular
from ..ml.registry import registry
from ..models import SoilClassification
from ..schemas import MetaOut, SoilClassificationOut
from ..services.context import set_last_soil

router = APIRouter(prefix="/api/soil", tags=["soil"])


@router.post("/classify", response_model=SoilClassificationOut)
async def classify_soil(
    file: UploadFile = File(...),
    device_id: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload must be an image")

    image_bytes = await file.read()
    try:
        pred = registry.soil_image.predict(image_bytes)
    except Exception as exc:  # noqa: BLE001 — surface decode/inference errors clearly
        raise HTTPException(status_code=422, detail=f"Could not classify image: {exc}") from exc

    tabular = map_image_soil_to_tabular(pred["predicted_soil"])

    record = SoilClassification(
        device_id=device_id,
        predicted_soil=pred["predicted_soil"],
        tabular_soil_type=tabular,
        confidence=pred["confidence"],
        probabilities=pred["probabilities"],
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    # Make this photo-detected soil type drive subsequent recommendations.
    set_last_soil(device_id, tabular)
    return record


@router.get("/meta", response_model=MetaOut)
async def meta():
    """Everything the frontend needs to populate dropdowns and labels."""
    return MetaOut(
        soil_types=registry.crop.soil_types,
        image_soil_classes=registry.soil_image.class_names,
        crop_types=registry.fertilizer.crop_types,
        image_to_tabular_soil=IMAGE_TO_TABULAR_SOIL,
        model_accuracy=registry.soil_image.best_val_accuracy,
    )
