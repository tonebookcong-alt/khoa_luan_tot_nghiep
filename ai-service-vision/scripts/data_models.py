from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

Source = Literal["chotot", "tgdd", "fb", "reddit"]


class ListingMetadata(BaseModel):
    """Schema chuẩn cho mọi listing bất kể nguồn."""

    source: Source
    source_id: str = Field(..., description="ID duy nhất trong nguồn, dùng để dedup")
    url: HttpUrl

    title: str
    price_vnd: int | None = Field(None, ge=0)
    description: str = ""

    image_urls: list[HttpUrl] = Field(default_factory=list)
    image_paths: list[str] = Field(
        default_factory=list,
        description="Đường dẫn local sau khi download (relative tới data/raw/images/)",
    )

    location: str = ""
    posted_at: datetime | None = None
    scraped_at: datetime = Field(default_factory=datetime.utcnow)

    detected_model_text: str | None = Field(
        None,
        description="Model name extract được từ title bằng regex, ví dụ 'iphone 13 pro max'",
    )
    detected_generation: str | None = Field(
        None,
        description="Generation label gợi ý (gen_6, gen_12_13...) — dùng làm pre-label cho YOLO",
    )

    raw: dict = Field(
        default_factory=dict,
        description="Payload gốc từ nguồn để debug, không bắt buộc parse hết",
    )


class ScrapeState(BaseModel):
    """State để resume scraping nếu bị ngắt giữa chừng."""

    source: Source
    started_at: datetime
    last_updated_at: datetime
    seen_ids: set[str] = Field(default_factory=set)
    next_page: int = 1
    total_scraped: int = 0
    errors: list[str] = Field(default_factory=list)
