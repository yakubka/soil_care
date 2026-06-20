"""Analysis endpoints: manual (no hardware) + latest stored analysis."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..ml.registry import registry
from ..models import SoilAnalysis
from ..schemas import AnalysisOut, ManualAnalysisIn
from ..services import advisor

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/manual", response_model=AnalysisOut)
async def manual_analysis(data: ManualAnalysisIn):
    """Run the full pipeline on hand-entered values. Does NOT touch the DB."""
    valid_soils = registry.crop.soil_types
    if data.soil_type not in valid_soils:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown soil_type '{data.soil_type}'. Valid: {valid_soils}",
        )
    if data.crop_type is not None and data.crop_type not in registry.fertilizer.crop_types:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown crop_type '{data.crop_type}'. Valid: {registry.fertilizer.crop_types}",
        )

    out = advisor.analyze(
        nitrogen=data.nitrogen,
        potassium=data.potassium,
        phosphorous=data.phosphorous,
        temperature=data.temperature,
        humidity=data.humidity,
        moisture=data.moisture,
        soil_type=data.soil_type,
        crop_type=data.crop_type,
    )
    return AnalysisOut(**out)


@router.get("/latest", response_model=AnalysisOut)
async def latest_analysis(db: AsyncSession = Depends(get_db)):
    stmt = select(SoilAnalysis).order_by(SoilAnalysis.created_at.desc()).limit(1)
    row = (await db.execute(stmt)).scalars().first()
    if row is None:
        raise HTTPException(status_code=404, detail="No analysis recorded yet")
    return row
