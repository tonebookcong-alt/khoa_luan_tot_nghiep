"""
Tổng kê dataset đã scrape: số listing, phân bố generation, số ảnh.

Usage:
    python -m scripts.stats
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from scripts.utils import IMAGES_DIR, METADATA_DIR


def load_metadata(source: str) -> list[dict]:
    path = METADATA_DIR / f"{source}.jsonl"
    if not path.exists():
        return []
    out: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def main() -> None:
    sources = ["chotot", "tgdd", "fb", "reddit"]
    print("\n=== Dataset Statistics ===\n")

    grand_total_listings = 0
    grand_total_images = 0
    overall_gen: Counter[str] = Counter()
    overall_with_price = 0

    for source in sources:
        items = load_metadata(source)
        if not items:
            continue
        grand_total_listings += len(items)

        gen_counter: Counter[str] = Counter()
        image_count = 0
        with_price = 0
        no_gen = 0

        for item in items:
            gen = item.get("detected_generation")
            if gen:
                gen_counter[gen] += 1
                overall_gen[gen] += 1
            else:
                no_gen += 1
            image_count += len(item.get("image_paths", []))
            if item.get("price_vnd"):
                with_price += 1
                overall_with_price += 1

        grand_total_images += image_count

        print(f"## {source.upper()}")
        print(f"  Listings:      {len(items)}")
        print(f"  Total images:  {image_count}")
        print(f"  With price:    {with_price} ({with_price / len(items) * 100:.1f}%)")
        print(f"  No generation: {no_gen}")
        print("  Generation breakdown:")
        for gen, count in sorted(gen_counter.items()):
            print(f"    {gen:14s}: {count}")
        print()

    print("=== TOTAL ===")
    print(f"Listings: {grand_total_listings}")
    print(f"Images:   {grand_total_images}")
    if grand_total_listings:
        print(f"With price: {overall_with_price} ({overall_with_price / grand_total_listings * 100:.1f}%)")
    print("\nGeneration totals:")
    for gen, count in sorted(overall_gen.items()):
        bar = "█" * int(count / max(overall_gen.values()) * 30) if overall_gen else ""
        print(f"  {gen:14s}: {count:5d}  {bar}")

    image_files = list(IMAGES_DIR.glob("*.jpg")) if IMAGES_DIR.exists() else []
    total_size_mb = sum(f.stat().st_size for f in image_files) / 1024 / 1024
    print(f"\nDisk usage (data/raw/images/): {total_size_mb:.1f} MB ({len(image_files)} files)")


if __name__ == "__main__":
    main()
