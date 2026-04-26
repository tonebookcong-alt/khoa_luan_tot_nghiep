from fastapi import APIRouter

from app.config import settings
from app.deps import get_yolo_service

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    yolo = get_yolo_service()
    return {
        "status": "ok",
        "model_loaded": yolo.is_loaded(),
        "weights_path": str(settings.weights_full_path),
    }
