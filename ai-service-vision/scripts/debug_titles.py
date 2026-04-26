"""
Debug: in ra title của các listing đã scrape, phân loại theo có/không match generation.

Usage:
    python -m scripts.debug_titles --source chotot
"""

from __future__ import annotations

import argparse
import json

from scripts.utils import METADATA_DIR


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="chotot")
    args = parser.parse_args()

    path = METADATA_DIR / f"{args.source}.jsonl"
    if not path.exists():
        print(f"Not found: {path}")
        return

    with_gen: list[tuple[str, str]] = []
    without_gen: list[str] = []
    has_iphone_word: list[str] = []
    no_iphone_word: list[str] = []

    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            title = obj.get("title", "")
            gen = obj.get("detected_generation")
            if gen:
                with_gen.append((gen, title))
            else:
                without_gen.append(title)
                if "iphone" in title.lower():
                    has_iphone_word.append(title)
                else:
                    no_iphone_word.append(title)

    print(f"\n=== {len(with_gen)} listings WITH generation match ===")
    for gen, title in with_gen[:20]:
        print(f"  [{gen}] {title[:90]}")

    print(f"\n=== {len(without_gen)} listings WITHOUT generation match ===")
    print(f"  - Có chữ 'iphone' trong title: {len(has_iphone_word)}")
    print(f"  - Không có chữ 'iphone':       {len(no_iphone_word)}")

    print("\n>>> Có 'iphone' nhưng regex không match (cần fix regex):")
    for title in has_iphone_word[:30]:
        print(f"  {title[:100]}")

    print("\n>>> Không có 'iphone' (có thể không phải iPhone hoặc title quá ngắn):")
    for title in no_iphone_word[:30]:
        print(f"  {title[:100]}")


if __name__ == "__main__":
    main()
