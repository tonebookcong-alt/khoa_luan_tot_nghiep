"""
Scrape TGDĐ (thegioididong.com) các trang iPhone máy cũ để có ảnh studio sạch.

Mục đích: làm "reference set" cho YOLO — ảnh chất lượng cao, góc chụp đẹp,
giúp model học đặc trưng từng generation chính xác hơn.

KHÔNG dùng giá TGDĐ làm market price (vì giá shop != giá C2C).

Strategy: Playwright vì TGDĐ render bằng JS. Chỉ cần ~50–100 ảnh/generation.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from datetime import datetime
from typing import Final

import httpx

from scripts.data_models import ListingMetadata
from scripts.title_parser import extract_generation, extract_model_text
from scripts.utils import (
    IMAGES_DIR,
    METADATA_DIR,
    JsonlWriter,
    download_image,
    image_filename,
)

logger = logging.getLogger(__name__)

SOURCE = "tgdd"

# Danh sách URL category iPhone máy cũ trên TGDĐ — user có thể bổ sung
SEED_CATEGORY_URLS: Final[list[str]] = [
    "https://www.thegioididong.com/dtdd-cu/iphone",
]


async def scrape_with_playwright(limit_per_category: int, delay: float) -> None:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.error(
            "Playwright chưa cài. Chạy: pip install -e \".[scrape]\" rồi playwright install chromium"
        )
        return

    metadata_path = METADATA_DIR / f"{SOURCE}.jsonl"
    writer = JsonlWriter(metadata_path)
    total = 0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        )
        async with httpx.AsyncClient() as http_client:
            for category_url in SEED_CATEGORY_URLS:
                logger.info("Crawling category %s", category_url)
                page = await context.new_page()
                try:
                    await page.goto(category_url, wait_until="networkidle", timeout=30_000)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Failed to load %s: %s", category_url, exc)
                    await page.close()
                    continue

                # Click "Xem thêm" để load nhiều listing hơn
                for _ in range(5):
                    try:
                        button = page.locator("a.see-more, .btn-readall, .view-more").first
                        if await button.count() == 0:
                            break
                        await button.click(timeout=3000)
                        await page.wait_for_timeout(int(delay * 1000))
                    except Exception:  # noqa: BLE001
                        break

                # Trích xuất các product cards
                product_links = await page.locator("ul.listproduct li a").all()
                logger.info("Found %d product links", len(product_links))

                count_in_category = 0
                for link in product_links:
                    if count_in_category >= limit_per_category:
                        break

                    href = await link.get_attribute("href")
                    if not href:
                        continue
                    detail_url = (
                        href if href.startswith("http") else f"https://www.thegioididong.com{href}"
                    )

                    detail_page = await context.new_page()
                    try:
                        await detail_page.goto(detail_url, wait_until="networkidle", timeout=20_000)

                        title = await detail_page.locator("h1").first.inner_text(timeout=5000)
                        title = title.strip()

                        # Lấy URL ảnh từ gallery
                        img_locators = detail_page.locator("ul.swiper-wrapper img, .item-img img")
                        img_srcs: list[str] = []
                        for img_loc in await img_locators.all():
                            src = await img_loc.get_attribute("src") or await img_loc.get_attribute(
                                "data-src"
                            )
                            if src and src.startswith("http") and src not in img_srcs:
                                img_srcs.append(src)
                        img_srcs = img_srcs[:5]

                        if not img_srcs:
                            continue

                        listing_id = detail_url.rstrip("/").split("/")[-1]
                        listing = ListingMetadata(
                            source="tgdd",
                            source_id=listing_id,
                            url=detail_url,
                            title=title,
                            description="",
                            image_urls=img_srcs,
                            location="TGDĐ shop",
                            posted_at=datetime.utcnow(),
                            detected_model_text=extract_model_text(title),
                            detected_generation=extract_generation(title),
                        )

                        # Download ảnh
                        paths: list[str] = []
                        for idx, url in enumerate(img_srcs):
                            fname = image_filename(SOURCE, listing_id, idx, url)
                            out_path = IMAGES_DIR / fname
                            ok = await download_image(http_client, url, out_path)
                            if ok:
                                paths.append(fname)

                        if not paths:
                            continue

                        listing.image_paths = paths
                        writer.append(listing.model_dump(mode="json"))
                        total += 1
                        count_in_category += 1

                        if total % 10 == 0:
                            logger.info("Progress: %d listings", total)
                    except Exception as exc:  # noqa: BLE001
                        logger.warning("Failed detail %s: %s", detail_url, exc)
                    finally:
                        await detail_page.close()
                        await asyncio.sleep(delay)

                await page.close()

        await browser.close()

    logger.info("Done. Total: %d listings", total)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape TGDĐ iPhone reference photos")
    parser.add_argument("--per-category", type=int, default=30)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    asyncio.run(scrape_with_playwright(args.per_category, args.delay))


if __name__ == "__main__":
    main()
