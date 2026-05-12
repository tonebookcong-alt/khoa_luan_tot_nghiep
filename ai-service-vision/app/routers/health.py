from fastapi import APIRouter

from app.config import settings
from app.deps import get_damage_service, get_yolo_service

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    yolo = get_yolo_service()
    damage = get_damage_service()
    return {
        "status": "healthy",
        "generation_model_loaded": yolo.is_loaded(),
        "generation_weights_path": str(settings.weights_full_path),
        "damage_model_loaded": damage.is_loaded(),
        "damage_weights_path": str(settings.damage_weights_path),
    }
