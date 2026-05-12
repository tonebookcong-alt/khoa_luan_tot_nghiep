# ai-service-vision

YOLO-based vision service cho hệ thống định giá iPhone của khoá luận.

Service này:
- Nhận nhiều ảnh listing + tên model seller khai báo
- Detect generation iPhone (gen_6 → gen_17) và damage (crack/scratch/dent)
- Trả về `damage_scores` đã map sang d_i ∈ [0,1] cho công thức pricing
- Cross-check generation phát hiện vs seller claim → flag fraud

Gọi từ: `backend/src/pricing/vision.service.ts` (NestJS)

---

## Setup local (Windows + Python 3.11)

```bash
cd ai-service-vision

# 1. Tạo venv
python -m venv .venv
source .venv/Scripts/activate    # Git Bash
# hoặc: .venv\Scripts\activate.bat (cmd)

# 2. Cài deps
pip install --upgrade pip
pip install -e ".[dev]"

# 3. Copy env
cp .env.example .env

# 4. Đặt best.pt vào app/models/ (sau khi train xong Stage 4)
# Tạm thời chưa có weights → endpoint /v1/detect sẽ trả lỗi rõ ràng

# 5. Run dev
uvicorn app.main:app --reload --port 8000
```

OpenAPI docs: http://localhost:8000/docs

---

## Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | Service status + model loaded? |
| POST | `/v1/detect` | Multipart: `images[]` + `claimed_model` → DetectionResponse |

Example:

```bash
curl -X POST http://localhost:8000/v1/detect \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  -F "claimed_model=iPhone 13 Pro Max"
```

Response shape:

```json
{
  "detected_generation": "gen_12_13",
  "generation_confidence": 0.91,
  "claimed_matches": true,
  "damage_scores": {
    "screen": 0.15,
    "body": 0.05,
    "camera": 0.0,
    "battery": 0.0,
    "other": 0.0
  },
  "overall_confidence": 0.84,
  "per_image": [...]
}
```

---

## Thư mục

```
app/
├── main.py                    # FastAPI app entry
├── config.py                  # Settings từ .env (pydantic-settings)
├── deps.py                    # DI cho YoloService (singleton qua lru_cache)
├── routers/
│   ├── health.py
│   └── inference.py           # POST /v1/detect
├── services/
│   ├── yolo_service.py        # Load best.pt, predict batch, aggregate generation
│   └── damage_calculator.py   # Map detections → DamageScores (d_i)
├── schemas/
│   └── detection.py           # Pydantic models
└── models/
    └── best.pt                # YOLO weights (gitignored)

notebooks/                     # Colab training notebooks
scripts/                       # Scrape + filter + pre-label scripts
data/                          # raw / filtered / labeled (gitignored)
tests/                         # pytest unit tests
```

---

## Dataset Classes (12 total)

**Generation (9):**
- `gen_6` — iPhone 6/6s/6+/6s+/SE 1
- `gen_7_8` — iPhone 7/7+/8/8+/SE 2/SE 3
- `gen_x_xs` — iPhone X/XR/XS/XS Max
- `gen_11` — iPhone 11/11 Pro/11 Pro Max
- `gen_12_13` — iPhone 12 series + 13 series
- `gen_14` — iPhone 14/14+/14 Pro/14 Pro Max
- `gen_15` — iPhone 15 series
- `gen_16` — iPhone 16 series
- `gen_17` — iPhone 17 series

**Damage (3):** `crack`, `scratch`, `dent`

> Lưu ý: Không phân biệt 12 vs 13, hay 14 vs 15 base — vì khác biệt thị giác quá nhỏ. Model exact lấy từ form input của seller, YOLO chỉ verify nhóm thế hệ.

---

## Stage 1 — Scrape Dataset

### 1. Cài Playwright browser (chỉ làm 1 lần)

```powershell
playwright install chromium
```

### 2. Scrape Chợ Tốt (nguồn chính)

Chạy thử 50 listing để kiểm tra:

```powershell
python -m scripts.scrape_chotot --limit 50 --delay 2.0
```

Nếu OK, scrape thật ~3000 listing (mất ~3–5h, nên chạy buổi tối):

```powershell
python -m scripts.scrape_chotot --limit 3000 --delay 2.0 --resume
```

`--resume` cho phép dừng giữa chừng (Ctrl+C) rồi chạy lại tiếp tục từ vị trí cũ.
State lưu tại `data/raw/state/chotot.json`, metadata tại `data/raw/metadata/chotot.jsonl`.

### 3. Scrape TGDĐ máy cũ (reference studio photos)

```powershell
python -m scripts.scrape_tgdd --per-category 50 --delay 1.5
```

### 4. Xem tổng kê

```powershell
python -m scripts.stats
```

→ Phân bố generation, số ảnh, dung lượng disk.

---

## Stage 2 — Filter + Pre-label Damage

### 1. Filter dataset (loại tin rác, duplicate ảnh, giá outlier)

```powershell
python -m scripts.filter_data
```

Default: min 2 ảnh/listing, max 8 listing/location (chống shop chuyên), pHash dedup (Hamming distance ≤ 5), drop listing có ≥60% ảnh trùng với listing khác.

Output:
- `data/filtered/clean.jsonl` — listing đạt chuẩn
- `data/filtered/dropped.jsonl` — listing bị loại + lý do

In thống kê tỉ lệ drop theo lý do (price_outlier, image_repost, shop_overflow…).

### 2. Pre-label damage (OPTIONAL — bỏ qua nếu dùng Roboflow auto-label)

> **Khuyến nghị:** Skip bước này, dùng **Roboflow Auto-Label** trong Stage 3 (free trong Premium Trial 14 ngày, chất lượng tương đương, không cần billing).
>
> Bước Gemini dưới đây chỉ giữ làm tham khảo / fallback nếu Roboflow không khả dụng.

<details>
<summary>Hướng dẫn Gemini pre-label (cần billing ~$1.50)</summary>

Lấy API key tại https://aistudio.google.com/app/apikey → thêm vào `.env`:

```env
GEMINI_API_KEY=AIza...
```

**Lưu ý:** Free tier Gemini hiện tại rất hạn chế (limit 20 RPD trên gemini-2.5-flash-lite). Phải enable billing (Google Cloud) để chạy được — chi phí ~$1.50 cho 15k ảnh.

```powershell
python -m scripts.auto_prelabel_gemini --limit 100 --concurrency 2 --resume
python -m scripts.auto_prelabel_gemini --limit 0 --concurrency 8 --resume
```

`--resume` tự skip ảnh đã label rồi. Output: `data/filtered/prelabel_damage.jsonl`.

</details>

### 3. Export sang Roboflow COCO format

```powershell
python -m scripts.export_to_roboflow --copy-images
```

Output: `data/labeled/roboflow_upload/`
- `images/` — toàn bộ ảnh đã filter
- `annotations.coco.json` — pre-label damage box (gợi ý cho khâu label tay)

Zip thư mục này → upload lên Roboflow → Stage 3 (manual labeling).

### Cảnh báo về scraping

- **Chợ Tốt API có thể đổi schema bất kỳ lúc nào.** Nếu script crash sau update, kiểm tra response thật bằng `--debug` rồi sửa `parse_ad()`.
- **Rate limit:** mặc định 2s/request. Đừng giảm xuống dưới 1s — sẽ bị ban IP.
- **Pháp lý:** dùng cho mục đích nghiên cứu/khoá luận. Không phân phối lại dataset chứa số điện thoại, địa chỉ người bán.
- **Anti-bot:** nếu bị 403/429 nhiều lần → dừng, đổi VPN, đợi 1–2h rồi thử lại.

---

## Train

### Generation Model (9 classes)

Notebook: `notebooks/02_train_yolov11s.ipynb` — Train YOLOv11s trên Google Colab T4.
- Dataset: 12-class merged (9 generation + 3 damage), ~11k images
- Output: `best.pt` → `app/models/best.pt`
- Mục tiêu: mAP@50 ≥ 0.70 overall

### Damage Model (3 classes) — Optional

Notebook: `notebooks/03_train_damage_model_kaggle.ipynb` — Train YOLOv11m trên Kaggle T4 x2.
- Dataset: Cropped images (`yolo_dataset_damage_cropped/`), ~1900 images, imgsz=1280
- Classes: `physical_damage`, `scratch`, `screen_defect`
- Output: `best_damage.pt` → `app/models/best_damage.pt`
- Mục tiêu: mAP@50 ≥ 0.55 (small object detection harder)
- Hoạt động: `/v1/detect` tự detect damage riêng nếu model có, fallback to generation model

---

## Test

```bash
pytest
```

---

## Docker

```bash
docker build -t ai-service-vision .
docker run -p 8000:8000 -v $(pwd)/app/models:/app/app/models:ro ai-service-vision
```

Hoặc qua `docker/docker-compose.yml` (đã thêm service).

---

## Lộ trình Damage Model Training (nếu cần)

1. **Chuẩn bị dữ liệu:** 
   - Cropped dataset sẵn tại `data/yolo_dataset_damage_cropped/` (do `scripts/crop_damage_dataset.py`)
   - Zip: `data/yolo_dataset_damage_cropped.zip` (sẵn upload)

2. **Training trên Kaggle:**
   - Notebook: `notebooks/03_train_damage_model_kaggle.ipynb`
   - GPU: T4 x2 (bắt buộc, nếu T4 x1 thì batch=4)
   - Hyperparams: imgsz=1280, batch=8, epochs=150, patience=30
   - Thời gian: ~2.5h trên T4 x2

3. **Download + Deploy:**
   - Save `best_damage.pt` từ Kaggle output → `app/models/best_damage.pt`
   - DamageService tự load + inject vào `/v1/detect` endpoint
   - Health check: `GET /health` sẽ show `damage_model_loaded: true/false`

4. **Validation:**
   ```bash
   curl -X GET http://localhost:8000/health
   # {
   #   "status": "healthy",
   #   "generation_model_loaded": true,
   #   "damage_model_loaded": true  ← phải true nếu best_damage.pt có
   # }
   ```
