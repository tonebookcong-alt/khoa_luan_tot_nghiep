# PhoneMarket — Website Mua Bán Điện Thoại Tích Hợp AI

> **Đề tài:** Xây dựng Website Mua Bán và Trao Đổi Điện Thoại Tích Hợp AI Hỗ Trợ Định Giá Sản Phẩm
> **Sinh viên thực hiện:** [Ngô Tuấn Huy]
> **GVHD:** [ĐOÀN HOÀNG DUY]

---

## Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---------|-------------------|---------|
| Node.js | v20+ | [nodejs.org](https://nodejs.org) — cho frontend, backend, ai-service |
| Python | 3.11+ | [python.org](https://www.python.org/downloads/) — cho ai-service-vision (YOLO) |
| Docker Desktop | v24+ | [docker.com](https://www.docker.com/products/docker-desktop/) — cho PostgreSQL, MongoDB, Redis |
| Git | Bất kỳ | |
| RAM | 8GB+ | YOLO inference cần ~2GB cho 2 model |
| GPU NVIDIA | Khuyến khích | Inference CPU vẫn chạy, chỉ chậm hơn (~340ms/ảnh CPU vs ~80ms GPU) |

> **Lưu ý:** Docker Desktop phải đang **chạy** trước khi thực hiện các bước bên dưới.

---

## Cấu trúc dự án

```
/
├── frontend/             # Next.js 15 (React) — cổng 3000
├── backend/              # NestJS (TypeScript) — cổng 3001
├── ai-service/           # Express + Gemini + LangChain — cổng 3002
│                         # Vai trò: market price agent (mock data)
├── ai-service-vision/    # Python FastAPI + YOLOv11m — cổng 8000
│                         # Vai trò: nhận diện model + 3 class damage
├── prisma/               # Prisma schema & migrations (PostgreSQL)
├── docker/               # Docker Compose
├── docs/                 # Tài liệu kỹ thuật, model artifacts
└── .env                  # Biến môi trường (cần tạo từ .env.example)
```

---

## Hướng dẫn cài đặt và chạy

### Bước 1 — Tải source code

```bash
git clone https://github.com/KLTN-03-2026/GR39
cd khoa_luan_tot_nghiep
```

### Bước 2 — Tạo file môi trường

Cần tạo **3 file `.env`** từ template:

```bash
# Windows PowerShell
Copy-Item .env.example .env
Copy-Item .env.example ai-service\.env
Copy-Item ai-service-vision\.env.example ai-service-vision\.env

# Mac/Linux
cp .env.example .env
cp .env.example ai-service/.env
cp ai-service-vision/.env.example ai-service-vision/.env
```

> **Không cần chỉnh sửa gì thêm** — tất cả giá trị đã đúng cho môi trường local. File `backend/.env` đã được commit sẵn.

---

### Bước 3 — Khởi động cơ sở dữ liệu (Docker)

```bash
cd docker
docker compose up -d postgres mongodb redis
docker compose ps
```

Tất cả container phải có trạng thái `healthy` trước khi chuyển sang bước tiếp.

---

### Bước 4 — Cài đặt dependencies

Mở **4 terminal riêng biệt**, mỗi terminal một service:

**Terminal 1 — Backend (NestJS):**
```bash
cd backend
npm install
```

**Terminal 2 — AI Service (Express + Gemini):**
```bash
cd ai-service
npm install
```

**Terminal 3 — Frontend (Next.js):**
```bash
cd frontend
npm install
```

**Terminal 4 — Vision Service (Python + YOLO):**
```bash
cd ai-service-vision

# Tạo virtual environment
python -m venv .venv

# Kích hoạt venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
# Mac/Linux:
source .venv/bin/activate

# Cài deps
pip install -e .
```

---

### Bước 5 — Tải mô hình YOLO

Vision service cần **2 file model** (`.pt`) đặt tại `ai-service-vision/app/models/`:

| File | Kích thước | Vai trò | Nguồn |
|------|-----------|---------|-------|
| `best_v1.pt` | ~19 MB | Generation detection (9 class iPhone) | Đã commit trong repo |
| `best_damage.pt` | ~40 MB | Damage detection (physical_damage / scratch / screen_defect) | **Tải riêng** — gitignored vì lớn |

**Cách tải `best_damage.pt`:**
- Train lại từ Kaggle notebook `ai-service-vision/notebooks/03_train_damage_model_kaggle.ipynb` (~4 giờ trên T4 x2), HOẶC
- Liên hệ tác giả để nhận file đã train (mAP@50 = 0.396 trên test set).

Đặt file vào: `ai-service-vision/app/models/best_damage.pt`

> **Nếu thiếu file này:** Vision service vẫn chạy, nhưng damage detection sẽ trả mảng rỗng và backend sẽ fallback về severity mặc định.

---

### Bước 6 — Khởi tạo cơ sở dữ liệu

Tại **thư mục gốc**:

```bash
npx prisma migrate deploy
npx prisma db seed
```

> Tạo bảng + seed danh mục sản phẩm + tài khoản demo.

---

### Bước 7 — Khởi động 4 services

Quay lại **4 terminal** từ Bước 4:

**Terminal 1 — Backend (cổng 3001):**
```bash
cd backend
npm run start:dev
```
Đợi: `Nest application successfully started`

**Terminal 2 — AI Service (cổng 3002):**
```bash
cd ai-service
npm run dev
```
Đợi: `AI Service running on port 3002`

**Terminal 3 — Frontend (cổng 3000):**
```bash
cd frontend
npm run dev
```
Đợi: `Ready in ...ms`

**Terminal 4 — Vision Service (cổng 8000):**
```bash
cd ai-service-vision
# Đảm bảo venv đã activate (nếu mở terminal mới phải activate lại)
.venv\Scripts\Activate.ps1   # Windows PowerShell
# source .venv/bin/activate    # Mac/Linux

uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Đợi: `Uvicorn running on http://127.0.0.1:8000`

> **Tất cả 4 service phải chạy đồng thời** thì tính năng "Định giá bằng AI" mới đầy đủ. Thiếu vision-service (port 8000) → hệ thống auto fallback về giá trị mặc định.

---

### Bước 8 — Truy cập ứng dụng

| Dịch vụ | URL | Vai trò |
|---------|-----|---------|
| **Website** | http://localhost:3000 | Giao diện chính |
| **Swagger (API Docs)** | http://localhost:3001/api/docs | Backend REST endpoints |
| **AI Service** | http://localhost:3002/health | Market price agent |
| **Vision Service** | http://localhost:8000/health | YOLO inference status |

---

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@phonemarket.vn | Admin@123 |
| Seller | seller@phonemarket.vn | Seller@123 |

Hoặc tự đăng ký tại http://localhost:3000/register.

---

## Demo tính năng AI định giá

### Phía Seller (đăng tin)

1. Đăng nhập → vào **Đăng tin** (http://localhost:3000/listings/create)
2. Upload **2-5 ảnh điện thoại** (ảnh chụp thực tế, không phải ảnh quảng cáo)
3. Chọn **Thương hiệu: Apple** + **Model máy** (VD: iPhone 13 Pro Max)
4. Nhập **Pin còn (%)** — ví dụ 85% (xem trong iOS *Cài đặt → Pin → Tình trạng pin*)
5. Click **"Định giá bằng AI"**

Hệ thống sẽ thực hiện song song:
- **YOLOv11m generation model** (port 8000) → nhận diện thế hệ iPhone từ ảnh
- **YOLOv11m damage model** (port 8000) → khoanh vùng từng vết hư hỏng (bbox + confidence)
- **Market price agent** (port 3002) → lấy median giá thị trường
- **Backend pricing calculator** (port 3001) → tính `P_final = P_market × ∏(1 - w_i × d_i)` kết hợp với độ chai pin

Layout chuyển sang **2 cột**: form bên trái, panel kết quả AI bên phải với:
- 🚨 **Banner đỏ** nếu AI nhận diện model khác với khai báo (chống lừa đảo)
- 🎯 **Bbox overlay** vẽ trực tiếp lên ảnh thiết bị (đỏ ≥70%, cam ≥50%, vàng ≥35% confidence)
- 📋 **Danh sách hư hỏng** chi tiết: loại + vị trí + ảnh thứ mấy + diện tích + độ tin cậy
- 📊 **Phân tích 5 bộ phận tổng hợp** (màn hình / vỏ máy / camera / pin / khác)
- 🧮 **"AI tính toán như thế nào?"** expandable — show công thức + breakdown khấu hao từng phần

6. Click **"Dùng giá này"** → giá đề xuất tự fill vào ô giá bán
7. **"Đăng tin ngay"** → kết quả AI được lưu cùng listing

### Phía Buyer (xem tin)

8. Mở `/listings/{id}` → bên dưới mô tả là **panel AI Pricing đầy đủ** (read-only) để buyer thấy chính AI đã đánh giá máy như thế nào — minh bạch toàn bộ luồng định giá.

---

## Xử lý sự cố thường gặp

### Lỗi không kết nối được database
```bash
docker ps                              # Kiểm tra Docker đang chạy
cd docker
docker compose up -d postgres mongodb redis
```

### Lỗi "Port already in use"
```bash
# Windows — tìm process dùng cổng (đổi 3001 thành cổng cần)
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Lỗi Prisma "Table does not exist"
```bash
npx prisma migrate deploy
```

### Vision service: "Damage model not found"
- File `best_damage.pt` chưa được đặt vào `ai-service-vision/app/models/` (xem Bước 5).
- Kiểm tra log Terminal 4 — phải có dòng `Loading damage YOLO weights from app\models\best_damage.pt` khi gọi API lần đầu.

### Vision service: cài Python deps fail trên Windows
- `pip install ultralytics` cần Visual C++ Build Tools nếu chưa có. Tải từ: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Hoặc dùng prebuilt wheel: `pip install ultralytics --prefer-binary`

### Định giá AI luôn hiện "vision service không khả dụng, dùng giá trị mặc định"
- Vision service (Terminal 4, cổng 8000) chưa chạy. Truy cập http://localhost:8000/health để verify.
- Nếu chạy nhưng vẫn fallback: kiểm tra `VISION_SERVICE_URL=http://localhost:8000` trong `backend/.env`.

### Định giá AI hiện "Không có dữ liệu" cho giá thị trường
- AI Service (Terminal 2, cổng 3002) chưa chạy. Verify tại http://localhost:3002/health.
- Mock data có sẵn cho iPhone 6 → 17 trong `ai-service/src/market-scraper/mock-data.ts`.

### Frontend hiển thị trắng / CSS không load
```bash
cd frontend
rm -rf .next      # Mac/Linux
# Remove-Item -Recurse .next   # Windows PowerShell
npm run dev
```

---

## Tech Stack

| Thành phần | Công nghệ |
|-----------|-----------|
| Frontend | Next.js 15, React, Tailwind CSS, Zustand, react-hook-form + zod |
| Backend | NestJS, Prisma ORM, JWT Auth, Socket.io, Multer |
| AI Service (port 3002) | Express.js, LangChain.js, Gemini API, mock market data |
| Vision Service (port 8000) | Python, FastAPI, **YOLOv11m** (Ultralytics), Pillow |
| Database | PostgreSQL (nghiệp vụ), MongoDB (AI logs), Redis (cache) |
| Containerization | Docker Compose |
| Mô hình ML | 2 × YOLOv11m self-trained (generation 9 class + damage 3 class) |

---

## Thêm thông tin

- **Training journal:** [`docs/damage-model-training-journal.md`](docs/damage-model-training-journal.md) — chi tiết quá trình train YOLO damage detection (mAP@50 = 0.396).
- **Model artifacts:** [`docs/damage-model-artifacts/`](docs/damage-model-artifacts/) — confusion matrix, PR/F1 curves, results.csv.
- **Thiết kế kỹ thuật:** [`CLAUDE.md`](CLAUDE.md) — đặc tả hệ thống đầy đủ.
