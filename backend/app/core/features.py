"""Feature switches for the should-have features (FEATURE_* settings)."""

from collections.abc import Callable
from typing import Literal

from app.core.config import get_settings
from app.core.errors import AppError, ErrorCode

Feature = Literal["mnemonics", "freetext", "summary"]


def require_feature(feature: Feature) -> Callable[[], None]:
    """FastAPI dependency: the route answers 404 FEATURE_DISABLED when the switch is off.

    Usage: `@router.get(..., dependencies=[Depends(require_feature("summary"))])`.
    """

    def check_feature() -> None:
        if not getattr(get_settings(), f"FEATURE_{feature.upper()}"):
            raise AppError(ErrorCode.FEATURE_DISABLED)

    return check_feature
