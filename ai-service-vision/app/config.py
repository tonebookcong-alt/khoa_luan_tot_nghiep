from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    vision_service_host: str = "0.0.0.0"
    vision_service_port: int = 8000

    yolo_weights_path: str = "app/models/best.pt"
    yolo_conf_threshold: float = 0.35
    yolo_iou_threshold: float = 0.5
    yolo_img_size: int = 640

    gemini_api_key: str = ""
    roboflow_api_key: str = ""

    log_level: str = "INFO"

    @property
    def weights_full_path(self) -> Path:
        return Path(self.yolo_weights_path).resolve()


settings = Settings()
