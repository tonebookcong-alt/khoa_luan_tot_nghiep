from scripts.title_parser import (
    extract_generation,
    extract_model_text,
    is_accessory_listing,
)


def test_extract_generation_common_models() -> None:
    assert extract_generation("Bán iPhone 13 Pro Max 256GB còn bảo hành") == "gen_12_13"
    assert extract_generation("iPhone 14 Plus 128gb") == "gen_14"
    assert extract_generation("Iphone 7 Plus 32gb đẹp") == "gen_7_8"
    assert extract_generation("Bán iphone 11 promax") == "gen_11"
    assert extract_generation("iphone xs max 64gb") == "gen_x_xs"
    assert extract_generation("iPhone 17 Pro Max 512GB mới về") == "gen_17"


def test_extract_generation_se_models() -> None:
    assert extract_generation("iPhone SE 2020") == "gen_7_8"
    assert extract_generation("iPhone SE 2") == "gen_7_8"
    assert extract_generation("iphone 6 plus 64gb") == "gen_6"


def test_extract_generation_no_match() -> None:
    assert extract_generation("Samsung Galaxy S24") is None
    assert extract_generation("Bán điện thoại cũ") is None
    assert extract_generation("Lên Cây iPhone Giá Rẻ Chơi Được Liên Quân") is None


def test_extract_generation_no_space_between_model_and_variant() -> None:
    """iphone14pro, iphone17promax — không space giữa số và Pro."""
    assert extract_generation("iphone14pro 128gb trắng pin100") == "gen_14"
    assert extract_generation("iphone17promax 256gb trắng vn/a") == "gen_17"
    assert extract_generation("iphone 17Pro256gb Trắng LL/A") == "gen_17"
    assert extract_generation("Iphone 14Promax 256gb EID Giá Siêu Tốt") == "gen_14"


def test_extract_generation_x_xs_followed_by_storage() -> None:
    """iPhone XS 256GB — sau XS có space + số dung lượng, không được reject."""
    assert extract_generation("iPhone XS 256GB Vàng Đã sử dụng") == "gen_x_xs"
    assert extract_generation("Apple iPhone X 64GB Trắng") == "gen_x_xs"
    assert extract_generation("iPhone XR 128GB Đỏ") == "gen_x_xs"


def test_extract_generation_iphone_air() -> None:
    """iPhone Air = dòng 17 Air (2025)."""
    assert extract_generation("iPhone Air 256GB xanh blue 99%") == "gen_17"


def test_extract_model_text() -> None:
    assert extract_model_text("Bán iPhone 13 Pro Max 256GB").startswith("iphone 13 pro max")
    assert extract_model_text("iPhone 7 Plus") == "iphone 7 plus"
    assert extract_model_text("Galaxy S24") is None


def test_is_accessory_filter() -> None:
    assert is_accessory_listing("Ốp lưng iPhone 13 Pro Max chính hãng")
    assert is_accessory_listing("Cáp sạc iPhone")
    assert is_accessory_listing("Tai nghe AirPods Pro")
    assert not is_accessory_listing("Bán iPhone 13 Pro Max 256GB")
