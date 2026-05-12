"""
Focused scrape Chợ Tốt theo damage keyword để bù class thiếu.

Mục đích: bổ sung ảnh cho 3 class damage đang dưới target:
- dent (29 → ~200): tìm "iphone móp", "iphone lõm cạnh"
- crack (113 → ~300): tìm "iphone vỡ kính", "iphone nứt"
- screen_defect (104 → ~200): tìm "iphone sọc màn", "iphone ố màn"

Output tách riêng:
- Ảnh: data/raw/damage/images/<class>/
- Metadata: data/raw/damage/metadata/<class>.jsonl
- State: data/raw/damage/state/<class>.json

Usage:
    python -m scripts.scrape_chotot_damage --target dent --limit 200
    python -m scripts.scrape_chotot_damage --target crack --limit 200 --resume
    python -m scripts.scrape_chotot_damage --target screen_defect --limit 100
    python -m scripts.scrape_chotot_damage --target all --limit 200
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path

import httpx

from scripts.data_models import ListingMetadata
from scripts.title_parser import (
    extract_generation,
    extract_model_text,
    is_accessory_listing,
)
from scripts.utils import (
    DATA_DIR,
    JsonlWriter,
    download_image,
    image_filename,
)

logger = logging.getLogger(__name__)

API_URL = "https://gateway.chotot.com/v1/public/ad-listing"
SOURCE = "chotot"
CHOTOT_IPHONE_BRAND_ID = 19

DAMAGE_DIR = DATA_DIR / "raw" / "damage"
DAMAGE_IMAGES = DAMAGE_DIR / "images"
DAMAGE_METADATA = DAMAGE_DIR / "metadata"
DAMAGE_STATE = DAMAGE_DIR / "state"

for d in [DAMAGE_IMAGES, DAMAGE_METADATA, DAMAGE_STATE]:
    d.mkdir(parents=True, exist_ok=True)


KEYWORDS: dict[str, list[str]] = {
    "dent": [
        "iphone móp",
        "iphone móp viền",
        "iphone móp khung",
        "iphone lõm cạnh",
        "iphone móp cạnh",
    ],
    "crack": [
        "iphone vỡ kính lưng",
        "iphone vỡ màn",
        "iphone nứt màn",
        "iphone nứt lưng",
        "iphone bể kính",
        "iphone rạn màn",
        "iphone vỡ kính",
    ],
    "screen_defect": [
        "iphone sọc màn",
        "iphone chấm màn",
        "iphone ố màn",
        "iphone đốm màn",
        "iphone bị sọc",
        "iphone màn bị chấm",
    ],
}

DEFAULT_PARAMS = {
    "cg": "5010",
    "st": "s,k",
    "limit": 30,
    "o": 0,
    "key_param_included": "true",
    "include_recommended_ads": "false",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "Origin": "https://www.chotot.com",
    "Referer": "https://www.chotot.com/mua-ban-dien-thoai-iphone-apple",
}


async def fetch_page(
    client: httpx.AsyncClient, query: str, offset: int, limit: int = 30
) -> list[dict]:
    params = {
        **DEFAULT_PARAMS,
        "o": offset,
        "limit": limit,
        "brand": CHOTOT_IPHONE_BRAND_ID,
        "q": query,
    }
    resp = await client.get(API_URL, params=params, headers=HEADERS, timeout=30.0)
    resp.raise_for_status()
    return resp.json().get("ads", [])


def parse_ad(ad: dict, target_class: str, query: str) -> ListingMetadata | None:
    try:
        list_id = str(ad.get("list_id") or ad.get("ad_id") or "")
        title = ad.get("subject", "").strip()
        price = ad.get("price", None)

        if not list_id or not title:
            return None
        if "iphone" not in title.lower():
            return None
        if is_accessory_listing(title):
            return None

        url = f"https://www.chotot.com/mua-ban-dien-thoai-tphcm/{list_id}.htm"

        images: list[str] = []
        if "image" in ad and ad["image"]:
            images.append(ad["image"])
        for img in ad.get("images", []) or []:
            if img and img not in images:
                images.append(img)

        posted_at = None
        list_time = ad.get("list_time") or ad.get("date")
        if isinstance(list_time, int | float) and list_time > 0:
            try:
                posted_at = datetime.utcfromtimestamp(
                    list_time / 1000 if list_time > 1e12 else list_time
                )
            except (ValueError, OSError):
                pass

        location_parts = [ad.get("region_name"), ad.get("area_name")]
        location = ", ".join(p for p in location_parts if p)

        return ListingMetadata(
            source="chotot",
            source_id=list_id,
            url=url,
            title=title,
            price_vnd=int(price) if isinstance(price, int | float) and price > 0 else None,
            description=ad.get("body", "") or "",
            image_urls=images,
            location=location or "",
            posted_at=posted_at,
            detected_model_text=extract_model_text(title),
            detected_generation=extract_generation(title),
            raw={
                "list_id": list_id,
                "target_damage_class": target_class,
                "search_query": query,
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to parse ad: %s", exc)
        return None


def state_path(target_class: str) -> Path:
    return DAMAGE_STATE / f"{target_class}.json"


def load_class_state(target_class: str) -> dict:
    p = state_path(target_class)
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


def save_class_state(target_class: str, state: dict) -> None:
    state_path(target_class).write_text(
        json.dumps(state, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )


async def scrape_damage_class(
    target_class: str,
    limit: int,
    delay: float,
    resume: bool,
) -> int:
    state = load_class_state(target_class) if resume else {}
    seen_ids: set[str] = set(state.get("seen_ids", []))
    total_new: int = state.get("total_scraped", 0)
    query_offsets: dict[str, int] = state.get("query_offsets", {})

    metadata_path = DAMAGE_METADATA / f"{target_class}.jsonl"
    images_dir = DAMAGE_IMAGES / target_class
    images_dir.mkdir(parents=True, exist_ok=True)
    writer = JsonlWriter(metadata_path)

    started_at = datetime.utcnow()
    keywords = KEYWORDS[target_class]

    logger.info(
        "[%s] Start: target=%d, resume=%s, seen=%d, keywords=%d",
        target_class,
        limit,
        resume,
        len(seen_ids),
        len(keywords),
    )

    async with httpx.AsyncClient(http2=False) as client:
        for query in keywords:
            if total_new >= limit:
                break

            offset = query_offsets.get(query, 0)
            consecutive_empty = 0

            while total_new < limit:
                try:
                    ads = await fetch_page(client, query=query, offset=offset, limit=30)
                except httpx.HTTPStatusError as e:
                    logger.error(
                        "[%s] HTTP %s for query=%r at offset %d, skip query",
                        target_class,
                        e.response.status_code,
                        query,
                        offset,
                    )
                    break
                except Exception as exc:  # noqa: BLE001
                    logger.error("[%s] Fetch failed: %s", target_class, exc)
                    break

                if not ads:
                    consecutive_empty += 1
                    if consecutive_empty >= 2:
                        logger.info(
                            "[%s] Query %r exhausted at offset %d", target_class, query, offset
                        )
                        break
                    offset += 30
                    continue
                consecutive_empty = 0

                page_added = 0
                for ad in ads:
                    listing = parse_ad(ad, target_class=target_class, query=query)
                    if listing is None:
                        continue
                    if listing.source_id in seen_ids:
                        continue
                    seen_ids.add(listing.source_id)

                    paths: list[str] = []
                    for idx, img_url in enumerate(listing.image_urls[:6]):
                        fname = image_filename(SOURCE, listing.source_id, idx, str(img_url))
                        out_path = images_dir / fname
                        ok = await download_image(client, str(img_url), out_path)
                        if ok:
                            paths.append(f"{target_class}/{fname}")
                    listing.image_paths = paths

                    if not paths:
                        continue

                    writer.append(listing.model_dump(mode="json"))
                    total_new += 1
                    page_added += 1

                    if total_new >= limit:
                        break

                logger.info(
                    "[%s] q=%r offset=%d → +%d (total=%d/%d)",
                    target_class,
                    query,
                    offset,
                    page_added,
                    total_new,
                    limit,
                )

                offset += len(ads)
                query_offsets[query] = offset

                save_class_state(
                    target_class,
                    {
                        "target_class": target_class,
                        "started_at": started_at,
                        "last_updated_at": datetime.utcnow(),
                        "seen_ids": list(seen_ids),
                        "query_offsets": query_offsets,
                        "total_scraped": total_new,
                    },
                )

                await asyncio.sleep(delay)

    logger.info("[%s] Done. New listings: %d", target_class, total_new)
    return total_new


def main() -> None:
    parser = argparse.ArgumentParser(description="Focused damage scrape Chợ Tốt")
    parser.add_argument(
        "--target",
        choices=["dent", "crack", "screen_defect", "all"],
        required=True,
        help="Damage class cần scrape thêm",
    )
    parser.add_argument("--limit", type=int, default=200, help="Max listings/class")
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    targets = (
        ["dent", "crack", "screen_defect"] if args.target == "all" else [args.target]
    )

    async def run_all() -> None:
        for t in targets:
            await scrape_damage_class(
                target_class=t,
                limit=args.limit,
                delay=args.delay,
                resume=args.resume,
            )

    asyncio.run(run_all())


if __name__ == "__main__":
    main()
