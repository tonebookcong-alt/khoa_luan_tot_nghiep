"""
Scrape ảnh damage iPhone từ Google/Bing Images bằng icrawler.

⚠️ DOMAIN MISMATCH WARNING:
Ảnh Google chủ yếu là studio/news/shop chuyên nghiệp — khác domain với
ảnh Chợ Tốt/FB (hand-held, indoor). Dùng kèm với 1 trong 2 strategy:
1. Mix với FB scrape để cân bằng domain
2. Augmentation aggressive + test set tách riêng từ ảnh thật

Output: data/raw/google/<keyword_slug>/
Dedup: theo MD5 hash filename, có thể có duplicate ảnh giữa các keyword.

Usage:
    pip install icrawler
    python -m scripts.scrape_google_images --keyword "iphone vỡ kính lưng" --num 50
    python -m scripts.scrape_google_images --keyword "iphone móp viền" --num 30 --engine bing
    python -m scripts.scrape_google_images --batch  # chạy preset batch
"""

from __future__ import annotations

import argparse
import logging
import re
from pathlib import Path

from scripts.utils import DATA_DIR

logger = logging.getLogger(__name__)

GOOGLE_DIR = DATA_DIR / "raw" / "google"
GOOGLE_DIR.mkdir(parents=True, exist_ok=True)


PRESET_KEYWORDS: dict[str, list[tuple[str, int]]] = {
    "physical_damage": [
        ("iphone vỡ kính lưng", 40),
        ("iphone vỡ màn hình", 40),
        ("iphone nứt màn", 30),
        ("iphone móp viền", 30),
        ("iphone móp khung", 25),
        ("broken iphone back glass", 30),
        ("cracked iphone screen", 30),
    ],
    "screen_defect": [
        ("iphone sọc màn hình", 35),
        ("iphone màn bị chấm", 25),
        ("iphone màn ố vàng", 20),
        ("iphone screen lines defect", 25),
        ("iphone display dead pixels", 20),
    ],
}


def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[\s-]+", "_", s).strip("_")
    return s[:60]


def crawl_one(keyword: str, num: int, engine: str = "google") -> int:
    try:
        from icrawler.builtin import BingImageCrawler, GoogleImageCrawler
    except ImportError:
        logger.error("Cần install icrawler: pip install icrawler")
        return 0

    out_dir = GOOGLE_DIR / slugify(keyword)
    out_dir.mkdir(parents=True, exist_ok=True)

    existing_before = sum(1 for _ in out_dir.iterdir())

    Crawler = BingImageCrawler if engine == "bing" else GoogleImageCrawler
    crawler = Crawler(
        feeder_threads=1,
        parser_threads=1,
        downloader_threads=4,
        storage={"root_dir": str(out_dir)},
    )

    logger.info("[%s] Crawl '%s' max=%d", engine, keyword, num)
    crawler.crawl(
        keyword=keyword,
        max_num=num,
        min_size=(500, 500),
        file_idx_offset=existing_before,
    )

    existing_after = sum(1 for _ in out_dir.iterdir())
    new_count = existing_after - existing_before
    logger.info("[%s] '%s' → +%d ảnh (total %d)", engine, keyword, new_count, existing_after)
    return new_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape damage iPhone images từ Google/Bing")
    parser.add_argument("--keyword", help="Keyword cụ thể (vd: 'iphone vỡ kính lưng')")
    parser.add_argument("--num", type=int, default=30, help="Max ảnh/keyword")
    parser.add_argument("--engine", choices=["google", "bing"], default="bing", help="Bing ổn định hơn Google")
    parser.add_argument("--batch", action="store_true", help="Chạy preset batch cho cả 2 class")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if args.batch:
        total = 0
        for cls, kws in PRESET_KEYWORDS.items():
            logger.info("=== %s ===", cls.upper())
            for kw, num in kws:
                total += crawl_one(kw, num, args.engine)
        logger.info("DONE batch: %d ảnh tổng cộng", total)
    elif args.keyword:
        crawl_one(args.keyword, args.num, args.engine)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
