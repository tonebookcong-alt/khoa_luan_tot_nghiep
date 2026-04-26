"""
Scrape iPhone listings từ Chợ Tốt.

Strategy: thử API trực tiếp trước (gateway.chotot.com), fallback sang Playwright nếu API thay đổi.
API endpoint dùng: https://gateway.chotot.com/v1/public/ad-listing

Usage:
    python -m scripts.scrape_chotot --limit 500 --delay 2.0
    python -m scripts.scrape_chotot --resume --limit 1000

Resume: tự động bỏ qua các listing đã thấy (lưu trong state/chotot.json).
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
    IMAGES_DIR,
    METADATA_DIR,
    JsonlWriter,
    download_image,
    image_filename,
    load_state,
    save_state,
)

logger = logging.getLogger(__name__)

API_URL = "https://gateway.chotot.com/v1/public/ad-listing"

# cg=5010 = Điện thoại di động
# st=s,k = đang bán + đã hết hạn (giữ s only nếu chỉ muốn đang bán)
DEFAULT_PARAMS = {
    "cg": "5010",
    "st": "s",
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

CHOTOT_IPHONE_BRAND_ID = 19  # Apple
SOURCE = "chotot"


async def fetch_page(
    client: httpx.AsyncClient, offset: int, limit: int = 30
) -> list[dict]:
    """Gọi API Chợ Tốt lấy 1 page listings. Trả list ad dicts."""
    params = {
        **DEFAULT_PARAMS,
        "o": offset,
        "limit": limit,
        "brand": CHOTOT_IPHONE_BRAND_ID,
    }
    resp = await client.get(API_URL, params=params, headers=HEADERS, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    return data.get("ads", [])


def parse_ad(ad: dict) -> ListingMetadata | None:
    """Convert Chợ Tốt ad payload sang ListingMetadata."""
    try:
        list_id = str(ad.get("list_id") or ad.get("ad_id") or "")
        title = ad.get("subject", "").strip()
        price = ad.get("price", None)

        if not list_id or not title:
            return None

        if is_accessory_listing(title):
            return None

        # Strict iPhone-only filter: title PHẢI chứa từ "iphone" (case-insensitive)
        # Loại bỏ Samsung/Xiaomi/Oppo lẫn vào do brand tag sai trên Chợ Tốt
        if "iphone" not in title.lower():
            return None

        url = f"https://www.chotot.com/mua-ban-dien-thoai-tphcm/{list_id}.htm"

        # Image URLs from Chợ Tốt
        images: list[str] = []
        if "image" in ad and ad["image"]:
            images.append(ad["image"])
        for img in ad.get("images", []) or []:
            if img and img not in images:
                images.append(img)

        # Posted timestamp (epoch seconds → datetime)
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

        model_text = extract_model_text(title)
        generation = extract_generation(title)

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
            detected_model_text=model_text,
            detected_generation=generation,
            raw={"list_id": list_id},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to parse ad: %s", exc)
        return None


async def scrape(
    limit: int,
    delay: float,
    resume: bool,
) -> None:
    state = load_state(SOURCE) if resume else {}
    seen_ids: set[str] = set(state.get("seen_ids", []))
    offset: int = state.get("next_offset", 0)
    total_new: int = state.get("total_scraped", 0)

    metadata_path = METADATA_DIR / f"{SOURCE}.jsonl"
    writer = JsonlWriter(metadata_path)

    started_at = datetime.utcnow()
    logger.info(
        "Start scraping Chợ Tốt — target=%d, resume=%s, offset=%d, seen=%d",
        limit,
        resume,
        offset,
        len(seen_ids),
    )

    async with httpx.AsyncClient(http2=False) as client:
        while total_new < limit:
            try:
                ads = await fetch_page(client, offset=offset, limit=30)
            except httpx.HTTPStatusError as e:
                logger.error("HTTP error %s at offset %d, stopping", e.response.status_code, offset)
                break
            except Exception as exc:  # noqa: BLE001
                logger.error("Fetch failed at offset %d: %s", offset, exc)
                break

            if not ads:
                logger.info("No more ads at offset %d", offset)
                break

            page_added = 0
            for ad in ads:
                listing = parse_ad(ad)
                if listing is None:
                    continue
                if listing.source_id in seen_ids:
                    continue
                seen_ids.add(listing.source_id)

                # Download images for this listing
                paths: list[str] = []
                for idx, img_url in enumerate(listing.image_urls[:6]):
                    fname = image_filename(SOURCE, listing.source_id, idx, str(img_url))
                    out_path = IMAGES_DIR / fname
                    ok = await download_image(client, str(img_url), out_path)
                    if ok:
                        paths.append(fname)
                listing.image_paths = paths

                if not paths:
                    continue

                writer.append(listing.model_dump(mode="json"))
                total_new += 1
                page_added += 1

                if total_new >= limit:
                    break

            logger.info(
                "Offset=%d → +%d new (total=%d/%d, seen=%d)",
                offset,
                page_added,
                total_new,
                limit,
                len(seen_ids),
            )

            offset += len(ads)

            # Save state after each page
            save_state(
                SOURCE,
                {
                    "source": SOURCE,
                    "started_at": started_at,
                    "last_updated_at": datetime.utcnow(),
                    "seen_ids": list(seen_ids),
                    "next_offset": offset,
                    "total_scraped": total_new,
                },
            )

            await asyncio.sleep(delay)

    logger.info("Done. Total new listings scraped this run: %d", total_new)
    logger.info("Metadata: %s", metadata_path)
    logger.info("Images: %s", IMAGES_DIR)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Chợ Tốt iPhone listings")
    parser.add_argument("--limit", type=int, default=200, help="Max listings to scrape this run")
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds between API calls")
    parser.add_argument("--resume", action="store_true", help="Resume from saved state")
    parser.add_argument("--debug", action="store_true", help="Verbose logging")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    asyncio.run(scrape(limit=args.limit, delay=args.delay, resume=args.resume))


if __name__ == "__main__":
    main()
