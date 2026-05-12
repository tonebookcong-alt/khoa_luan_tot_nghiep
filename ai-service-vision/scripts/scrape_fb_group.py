"""
Scrape ảnh từ FB group sửa điện thoại bằng Playwright.

⚠️ LƯU Ý:
- Vi phạm FB Terms of Service nếu chạy quy mô lớn
- Có thể bị ban tài khoản nếu FB detect bot pattern
- Dùng tài khoản phụ, không dùng tài khoản chính
- Chỉ dùng cho mục đích nghiên cứu/học thuật

Strategy:
- Dùng Playwright với persistent browser context (giữ cookies login)
- Lần đầu chạy: --login → mở browser, bạn login FB thủ công, đóng browser
- Lần sau: --url <group_url> --scroll N → tự động scroll N lần, lưu ảnh

Usage:
    # Lần 1: setup login
    python -m scripts.scrape_fb_group --login

    # Lần 2: scrape group
    python -m scripts.scrape_fb_group --url "https://www.facebook.com/groups/XXX" --scroll 30 --min-size 500
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import logging
import re
from pathlib import Path
from urllib.parse import urlparse

import httpx
from playwright.async_api import async_playwright

from scripts.utils import DATA_DIR

logger = logging.getLogger(__name__)

FB_DIR = DATA_DIR / "raw" / "fb"
FB_IMAGES = FB_DIR / "images"
FB_PROFILE = FB_DIR / "browser_profile"

for d in [FB_IMAGES, FB_PROFILE]:
    d.mkdir(parents=True, exist_ok=True)


async def setup_login() -> None:
    """Lần đầu: mở browser cho user login thủ công, lưu session."""
    logger.info("Mở browser — bạn login FB rồi đóng browser khi xong")
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir=str(FB_PROFILE),
            headless=False,
            viewport={"width": 1280, "height": 900},
        )
        page = await ctx.new_page()
        await page.goto("https://www.facebook.com/")
        logger.info("Login xong → đóng browser thủ công để save session")
        # Đợi user đóng browser
        try:
            await page.wait_for_event("close", timeout=600_000)
        except Exception:
            pass
        await ctx.close()


def safe_filename(url: str) -> str:
    """Generate filename deterministic từ URL hash."""
    h = hashlib.md5(url.encode()).hexdigest()[:12]
    return f"fb_{h}.jpg"


async def download_image(client: httpx.AsyncClient, url: str, out: Path, min_bytes: int = 30_000) -> bool:
    if out.exists() and out.stat().st_size > min_bytes:
        return True
    try:
        resp = await client.get(url, timeout=20.0, follow_redirects=True)
        resp.raise_for_status()
        if len(resp.content) < min_bytes:
            return False
        out.write_bytes(resp.content)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.debug("DL fail %s: %s", url[:80], exc)
        return False


async def scrape_group(url: str, scroll_times: int, min_size: int) -> None:
    logger.info("Scrape %s, scroll %d lần", url, scroll_times)

    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir=str(FB_PROFILE),
            headless=False,
            viewport={"width": 1280, "height": 900},
        )
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded")
        await asyncio.sleep(3)

        # Scroll loop
        seen_urls: set[str] = set()
        for i in range(scroll_times):
            await page.evaluate("window.scrollBy(0, document.body.scrollHeight)")
            await asyncio.sleep(2.5)

            # Extract HIGH-RES image URLs từ DOM:
            # - Ưu tiên srcset (FB thường để URL high-res ở entry "2x" hoặc cuối srcset)
            # - Filter natural dimension >= min_size để loại thumbnail
            # - FB CDN URLs có pattern fbcdn.net hoặc scontent
            urls = await page.evaluate(
                """
                () => {
                    const pickFromSrcset = (srcset) => {
                        if (!srcset) return null;
                        const parts = srcset.split(',').map(s => s.trim());
                        const last = parts[parts.length - 1];
                        return last ? last.split(' ')[0] : null;
                    };
                    return Array.from(document.querySelectorAll('img'))
                        .map(img => {
                            const fromSrcset = pickFromSrcset(img.srcset);
                            return {
                                src: fromSrcset || img.src,
                                w: img.naturalWidth,
                                h: img.naturalHeight,
                            };
                        })
                        .filter(x => x.src
                            && x.src.startsWith('https://')
                            && (x.src.includes('fbcdn.net') || x.src.includes('scontent'))
                            && x.w >= MIN && x.h >= MIN)
                        .map(x => x.src);
                }
                """.replace("MIN", str(min_size))
            )
            new_urls = [u for u in urls if u not in seen_urls]
            seen_urls.update(new_urls)
            logger.info("Scroll %d/%d — tổng URL unique=%d (+%d mới)", i + 1, scroll_times, len(seen_urls), len(new_urls))

        await ctx.close()

    logger.info("Tổng URL ảnh thu được: %d. Bắt đầu download...", len(seen_urls))

    saved = 0
    async with httpx.AsyncClient() as client:
        for url in seen_urls:
            fname = safe_filename(url)
            out = FB_IMAGES / fname
            ok = await download_image(client, url, out)
            if ok:
                saved += 1

    logger.info("DONE: %d/%d ảnh saved trong %s", saved, len(seen_urls), FB_IMAGES)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape ảnh từ FB group sửa điện thoại")
    parser.add_argument("--login", action="store_true", help="Setup login session lần đầu")
    parser.add_argument("--url", help="Group URL (https://www.facebook.com/groups/XXX)")
    parser.add_argument("--scroll", type=int, default=20, help="Số lần scroll (mỗi lần ~600px)")
    parser.add_argument("--min-size", type=int, default=500, help="Min width/height của ảnh (px)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if args.login:
        asyncio.run(setup_login())
    elif args.url:
        asyncio.run(scrape_group(args.url, args.scroll, args.min_size))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
