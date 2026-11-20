"""GET /api/config: the settings the frontend may know about. Nothing else."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter()


class PublicConfig(BaseModel):
    demo_mode: bool
    feature_mnemonics: bool
    feature_freetext: bool
    feature_summary: bool


@router.get("/api/config")
async def public_config() -> PublicConfig:
    settings = get_settings()
    return PublicConfig(
        demo_mode=settings.demo_mode,
        feature_mnemonics=settings.FEATURE_MNEMONICS,
        feature_freetext=settings.FEATURE_FREETEXT,
        feature_summary=settings.FEATURE_SUMMARY,
    )
