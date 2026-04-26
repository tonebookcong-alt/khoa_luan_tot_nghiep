"""Tiện ích chung cho các script scrape: download ảnh, hash, JSONL I/O, đường dẫn."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
IMAGES_DIR = RAW_DIR / "images"
METADATA_DIR = RAW_DIR / "metadata"
STATE_DIR = RAW_DIR / "state"

for d in [IMAGES_DIR, METADATA_DIR, STATE_DIR]:
    d.mkdir(parents=True, exist_ok=True)


PRICE_RE = re.compile(r"(\d{1,3}(?:[.,]\d{3})*|\d+)\s*(triệu|tr|k|trăm)?", re.IGNORECASE)


def parse_vnd_price(text: str) -> int | None:
    """
    Convert string giá kiểu '12.500.000', '12,5 triệu', '12tr500', '500k' → int VND.
    Trả None nếu không parse được.
    """
    if not text:
        return None
    text = text.strip().lower().replace(".", "").replace(",", ".").replace("đ", "")

    if "tr" in text or "triệu" in text:
        text = re.sub(r"(triệu|tr)", "", text).strip()
        try:
            value = float(text.split()[0]) if text else 0
            return int(value * 1_000_000)
        except (ValueError, IndexError):
            pass

    if "k" in text:
        text = text.replace("k", "").strip()
        try:
            return int(float(text.split()[0]) * 1_000)
        except (ValueError, IndexError):
            return None

    digits = re.sub(r"[^\d]", "", text)
    if digits:
        try:
            value = int(digits)
            if value < 1000:
                return value * 1_000_000
            return value
        except ValueError:
            return None
    return None


def slugify_id(source: str, raw_id: str) -> str:
    """Tạo ID an toàn cho filename."""
    safe = re.sub(r"[^\w\-]", "_", raw_id)[:80]
    return f"{source}_{safe}"


def image_filename(source: str, listing_id: str, index: int, url: str) -> str:
    """Tạo tên file ảnh deterministic dựa trên hash URL để dedup."""
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    return f"{slugify_id(source, listing_id)}_{index:02d}_{url_hash}.jpg"


async def download_image(
    client: httpx.AsyncClient,
    url: str,
    output_path: Path,
    timeout: float = 15.0,
) -> bool:
    """Download 1 ảnh nếu chưa có. Return True nếu success/đã tồn tại."""
    if output_path.exists() and output_path.stat().st_size > 1024:
        return True
    try:
        resp = await client.get(url, timeout=timeout, follow_redirects=True)
        resp.raise_for_status()
        if len(resp.content) < 1024:
            logger.warning("Image too small (%d bytes), skip: %s", len(resp.content), url)
            return False
        output_path.write_bytes(resp.content)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to download %s: %s", url, exc)
        return False


class JsonlWriter:
    """Append-only writer cho JSONL metadata."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, obj: dict[str, Any]) -> None:
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(obj, default=_json_default, ensure_ascii=False) + "\n")

    def read_all(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        out: list[dict[str, Any]] = []
        with self.path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    out.append(json.loads(line))
        return out


def _json_default(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, set):
        return list(obj)
    if hasattr(obj, "__str__"):
        return str(obj)
    raise TypeError(f"Cannot serialize {type(obj)}")


def load_state(source: str) -> dict[str, Any]:
    state_path = STATE_DIR / f"{source}.json"
    if not state_path.exists():
        return {}
    return json.loads(state_path.read_text(encoding="utf-8"))


def save_state(source: str, state: dict[str, Any]) -> None:
    state_path = STATE_DIR / f"{source}.json"
    state_path.write_text(
        json.dumps(state, default=_json_default, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
