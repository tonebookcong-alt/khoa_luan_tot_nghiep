"""
Extract iPhone model + generation từ title rao bán bằng regex.

Dùng làm pre-label cho dataset YOLO — chỉ là gợi ý ban đầu, vẫn cần label tay verify.

Quy tắc regex:
- KHÔNG dùng `\b` cuối số vì "14p" (4 và p đều là word char) không có boundary
- Dùng `(?!\d)` để chặn match "120" khi muốn 12 (vì "0" là digit kế tiếp)
- Dùng `(?![a-z0-9])` cho chữ X/XS/XR để chặn "Xmax" hoặc "Xr" sai
- Cho phép `\s*` = 0 hoặc nhiều space giữa "iphone" và số (xử lý "iphone14pro")
"""

import re
from typing import Final

GENERATION_PATTERNS: Final[list[tuple[str, re.Pattern[str]]]] = [
    (
        "gen_17",
        re.compile(r"iphone\s*(?:17(?!\d)|air(?![a-z0-9]))", re.IGNORECASE),
    ),
    ("gen_16", re.compile(r"iphone\s*16(?!\d)", re.IGNORECASE)),
    ("gen_15", re.compile(r"iphone\s*15(?!\d)", re.IGNORECASE)),
    ("gen_14", re.compile(r"iphone\s*14(?!\d)", re.IGNORECASE)),
    ("gen_12_13", re.compile(r"iphone\s*1[23](?!\d)", re.IGNORECASE)),
    ("gen_11", re.compile(r"iphone\s*11(?!\d)", re.IGNORECASE)),
    (
        "gen_x_xs",
        re.compile(r"iphone\s*(xs\s*max|xr|xs|x)(?![a-z0-9])", re.IGNORECASE),
    ),
    (
        "gen_7_8",
        re.compile(
            r"iphone\s*[78](?!\d)|\bse\s*(?:2|3|2020|2022)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "gen_6",
        re.compile(
            r"iphone\s*6s?(?!\d)|\bse\s*1\b|\bse\s*2016\b",
            re.IGNORECASE,
        ),
    ),
]

MODEL_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"iphone\s*"
    r"(?P<num>17|16|15|14|13|12|11|xs\s*max|xr|xs|x|8|7|6s?|se|air)"
    r"(?P<variant>\s*(plus|pro\s*max|promax|pro|mini|max))?",
    re.IGNORECASE,
)

ACCESSORY_KEYWORDS: Final[set[str]] = {
    "ốp", "op lung", "case", "cáp", "sạc", "sac", "tai nghe", "airpod",
    "kính cường lực", "miếng dán", "pin rời", "củ sạc", "adapter",
    "dây cáp", "ốp lưng",
}


def extract_generation(title: str) -> str | None:
    """Trả về generation label hoặc None nếu không match."""
    text = title.lower()
    for label, pattern in GENERATION_PATTERNS:
        if pattern.search(text):
            return label
    return None


def extract_model_text(title: str) -> str | None:
    """
    Trả về string model bình thường hoá: 'iphone 13 pro max', 'iphone se 2'.
    Storage và màu bị strip.
    """
    match = MODEL_PATTERN.search(title)
    if not match:
        return None
    num = match.group("num").lower().strip()
    variant = (match.group("variant") or "").lower().strip()
    parts = ["iphone", num]
    if variant:
        parts.append(re.sub(r"\s+", " ", variant))
    return " ".join(parts).strip()


def is_accessory_listing(title: str) -> bool:
    """Đoán xem listing có phải bán phụ kiện thay vì máy không."""
    text = title.lower()
    return any(kw in text for kw in ACCESSORY_KEYWORDS)
