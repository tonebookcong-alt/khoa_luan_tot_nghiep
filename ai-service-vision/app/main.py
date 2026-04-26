import logging

from fastapi import FastAPI

from app.config import settings
from app.routers import health, inference

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="iPhone Vision Service",
    version="0.1.0",
    description="YOLO-based detection of iPhone generation + physical damage for AI pricing.",
)

app.include_router(health.router)
app.include_router(inference.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.vision_service_host,
        port=settings.vision_service_port,
        reload=True,
    )
