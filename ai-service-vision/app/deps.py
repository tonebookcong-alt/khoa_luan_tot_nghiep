from functools import lru_cache

from app.services.damage_service import DamageService
from app.services.yolo_service import YoloService


@lru_cache(maxsize=1)
def get_yolo_service() -> YoloService:
    return YoloService()


@lru_cache(maxsize=1)
def get_damage_service() -> DamageService:
    return DamageService()
