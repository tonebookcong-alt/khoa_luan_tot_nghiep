# PhoneMarket — Website Mua Bán Điện Thoại Tích Hợp AI

> **Đề tài:** Xây dựng Website Mua Bán và Trao Đổi Điện Thoại Tích Hợp AI Hỗ Trợ Định Giá Sản Phẩm
> **Sinh viên thực hiện:** Ngô Tuấn Huy
> **GVHD:** ĐOÀN HOÀNG DUY

---

## Mục lục

1. [Trước khi chuyển máy — Checklist sao lưu](#0-trước-khi-chuyển-máy--checklist-sao-lưu)
2. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
3. [Cấu trúc dự án](#2-cấu-trúc-dự-án)
4. [Cài đặt từ A-Z](#3-cài-đặt-từ-a-z)
5. [Khởi động ứng dụng](#4-khởi-động-ứng-dụng)
6. [Tài khoản demo & sử dụng](#5-tài-khoản-demo--sử-dụng)
7. [Xem dữ liệu 3 database](#6-xem-dữ-liệu-3-database-prisma--mongodb--redis)
8. [Xử lý sự cố](#7-xử-lý-sự-cố)
9. [Tech Stack](#8-tech-stack)

---

## 0. Trước khi chuyển máy — Checklist sao lưu

**Quan trọng:** Một số file **KHÔNG được commit lên Git** (gitignored vì lớn hoặc nhạy cảm). Sao chép thủ công khi chuyển máy:

| File / Thư mục | Vai trò | Bắt buộc? |
|---|---|---|
| `ai-service-vision/app/models/best_v1.pt` (~19MB) | YOLO generation detection | ✅ Bắt buộc nếu muốn AI định giá hoạt động |
| `ai-service-vision/app/models/best_damage.pt` (~40MB) | YOLO damage detection | ✅ Bắt buộc nếu muốn damage detection |
| `backend/uploads/` | Ảnh các listing đã upload | ⚠️ Nếu giữ database cũ |
| `.env` (3 file) | Biến môi trường | ⚠️ Có thể tạo lại từ `.env.example` |
| **Dump dữ liệu DB** (PostgreSQL + MongoDB) | Listings, users, AI logs đã có | ⚠️ Nếu muốn giữ data cũ — xem mục **Sao lưu DB** bên dưới |

### Sao lưu nhanh trước khi chuyển máy

**Trên máy CŨ**, mở terminal tại thư mục `c:/khoa_luan_tot_nghiep`:

```bash
# 1. Dump PostgreSQL
docker exec phonemarket_postgres pg_dump -U phonemarket phonemarket > backup_postgres.sql

# 2. Dump MongoDB
docker exec phonemarket_mongodb mongodump --username phonemarket --password phonemarket123 --authenticationDatabase admin --db phonemarket_ai --out /tmp/mongo_backup
docker cp phonemarket_mongodb:/tmp/mongo_backup ./backup_mongo

# 3. Zip toàn bộ project (loại trừ node_modules để giảm dung lượng)
# Trên Windows PowerShell:
Compress-Archive -Path . -DestinationPath ../phonemarket-backup.zip -Force
```

**Tối thiểu phải copy sang máy MỚI:**
- Toàn bộ thư mục `c:/khoa_luan_tot_nghiep` (trừ `node_modules/`, `.next/`, `.venv/`)
- 2 file `.pt` trong `ai-service-vision/app/models/`
- File `backup_postgres.sql` và thư mục `backup_mongo/` (nếu muốn giữ data cũ)
- Thư mục `backend/uploads/` (ảnh các tin đã đăng)

**Trên máy MỚI**, sau khi cài xong (làm xong Bước 6 bên dưới), restore data:

```bash
# Restore PostgreSQL
docker exec -i phonemarket_postgres psql -U phonemarket -d phonemarket < backup_postgres.sql

# Restore MongoDB
docker cp ./backup_mongo phonemarket_mongodb:/tmp/mongo_restore
docker exec phonemarket_mongodb mongorestore --username phonemarket --password phonemarket123 --authenticationDatabase admin /tmp/mongo_restore
```

---

## 1. Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu | Lệnh kiểm tra | Link tải |
|---|---|---|---|
| **Node.js** | v20+ | `node -v` | [nodejs.org](https://nodejs.org) |
| **Python** | 3.11+ | `python --version` | [python.org](https://www.python.org/downloads/) |
| **Docker Desktop** | v24+ | `docker --version` | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | bất kỳ | `git --version` | [git-scm.com](https://git-scm.com/) |
| **RAM** | 8GB+ | — | YOLO inference ~2GB cho 2 model |
| **Ổ cứng** | 10GB trống | — | node_modules + Docker images + uploads |
| **GPU NVIDIA** | tuỳ chọn | — | Inference CPU vẫn chạy (~340ms/ảnh vs ~80ms GPU) |

### Cài Visual C++ Build Tools (Windows — bắt buộc cho YOLO)

`ultralytics` cần compile native code khi cài. Nếu chưa có:
1. Tải [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Khi cài chọn workload **"Desktop development with C++"**
3. Restart máy

> **Lưu ý quan trọng:** Docker Desktop phải đang **chạy** trước khi thực hiện các bước cài đặt bên dưới. Icon Docker ở khay hệ thống phải xanh.

---

## 2. Cấu trúc dự án

```
khoa_luan_tot_nghiep/
├── frontend/               # Next.js 15 — port 3000
├── backend/                # NestJS — port 3001
├── ai-service/             # Express + Gemini + LangChain — port 3002
│                           # (market price agent — dùng mock data)
├── ai-service-vision/      # Python FastAPI + YOLOv11 — port 8000
│   └── app/models/         # best_v1.pt + best_damage.pt (gitignored)
├── prisma/                 # Schema + migrations (PostgreSQL)
├── docker/                 # docker-compose.yml
├── docs/                   # Tài liệu kỹ thuật, model artifacts
├── .env                    # Cần tạo từ .env.example
├── .env.example            # Template biến môi trường
└── README.md               # File này
```

---

## 3. Cài đặt từ A-Z

### Bước 1 — Tải source code

```bash
git clone https://github.com/KLTN-03-2026/GR39 khoa_luan_tot_nghiep
cd khoa_luan_tot_nghiep
```

> Nếu copy thủ công từ USB/zip backup: giải nén thẳng vào `c:/khoa_luan_tot_nghiep/` (hoặc bất kỳ thư mục không có dấu cách / tiếng Việt trong path).

### Bước 2 — Đặt 2 file YOLO model vào đúng chỗ

Copy 2 file đã backup sang máy mới:

```
ai-service-vision/app/models/
├── best_v1.pt       (19 MB — generation detection)
└── best_damage.pt   (40 MB — damage detection)
```

> Nếu không có file backup, có thể train lại từ notebook `ai-service-vision/notebooks/03_train_damage_model_kaggle.ipynb` (mất ~4 giờ trên Kaggle T4 x2).
> Hoặc tạm thời bỏ qua — vision service sẽ chạy nhưng damage detection trả mảng rỗng và backend fallback giá trị mặc định.

### Bước 3 — Tạo file môi trường `.env`

Cần tạo **3 file `.env`** copy từ template:

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
Copy-Item .env.example ai-service\.env
Copy-Item ai-service-vision\.env.example ai-service-vision\.env
```

**Mac/Linux:**
```bash
cp .env.example .env
cp .env.example ai-service/.env
cp ai-service-vision/.env.example ai-service-vision/.env
```

> Không cần chỉnh sửa gì — tất cả giá trị mặc định đã đúng cho môi trường local. Gemini API key đã có sẵn (free tier 15 req/phút).
>
> **Tuỳ chọn:** Nếu muốn dùng Google OAuth login, mở `.env` ở root và điền `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` theo hướng dẫn trong file. Bỏ qua nếu không cần.

### Bước 4 — Khởi động 3 database bằng Docker

```bash
cd docker
docker compose up -d postgres mongodb redis
```

Kiểm tra cả 3 container đã `healthy`:

```bash
docker compose ps
```

Phải thấy 3 dòng có cột STATUS là `Up X seconds (healthy)`:
- `phonemarket_postgres`
- `phonemarket_mongodb`
- `phonemarket_redis`

Nếu container chưa healthy sau 30 giây, đợi thêm rồi kiểm tra lại.

### Bước 5 — Cài dependencies cho 4 services

Quay về thư mục root: `cd ..`

Mở **4 terminal riêng biệt**, chạy song song:

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

# Kích hoạt venv:
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
# Mac/Linux:
source .venv/bin/activate

# Cài deps Python
pip install -e .
```

> Quá trình `pip install` mất 5-10 phút lần đầu vì phải tải PyTorch (~700MB). Kiên nhẫn.

### Bước 6 — Migrate database (tạo bảng)

Quay về thư mục root, mở 1 terminal mới:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

Kiểm tra: phải thấy `4 migrations have been applied successfully`.

> Nếu muốn **restore data backup** từ máy cũ — làm bước này XONG rồi quay lại mục **"Sao lưu DB"** ở đầu README để restore.

---

## 4. Khởi động ứng dụng

Quay lại **4 terminal** đã mở ở Bước 5, chạy lần lượt:

### Terminal 1 — Backend (port 3001)
```bash
cd backend
npm run start:dev
```
✅ Đợi log: `Nest application successfully started`

### Terminal 2 — AI Service (port 3002)
```bash
cd ai-service
npm run dev
```
✅ Đợi log: `AI Service running on port 3002`

### Terminal 3 — Frontend (port 3000)
```bash
cd frontend
npm run dev
```
✅ Đợi log: `Ready in ...ms`

### Terminal 4 — Vision Service (port 8000)
```bash
cd ai-service-vision

# Nếu terminal mới, activate venv lại:
.venv\Scripts\Activate.ps1    # Windows PowerShell
# source .venv/bin/activate     # Mac/Linux

uvicorn app.main:app --host 127.0.0.1 --port 8000
```
✅ Đợi log: `Uvicorn running on http://127.0.0.1:8000`

> **Cả 4 service phải chạy đồng thời** thì tính năng AI định giá mới đầy đủ. Nếu thiếu vision service hoặc ai-service, backend sẽ fallback dùng giá trị mặc định.

### Kiểm tra các service hoạt động

| Service | URL kiểm tra | Phải thấy |
|---|---|---|
| Frontend | http://localhost:3000 | Trang chủ PhoneMarket |
| Backend Swagger | http://localhost:3001/api/docs | API documentation |
| AI Service | http://localhost:3002/health | `{"status":"ok"}` |
| Vision Service | http://localhost:8000/health | `{"status":"ok","model_loaded":true}` |

---

## 5. Tài khoản demo & sử dụng

### Đăng ký tài khoản mới

Truy cập http://localhost:3000/register — tạo user với email bất kỳ.

> Nếu vừa restore data backup, các tài khoản cũ vẫn dùng được với mật khẩu cũ.

### Demo tính năng AI định giá

**Phía Seller (đăng tin):**

1. Đăng nhập → click **"Đăng tin"** → http://localhost:3000/listings/create
2. Upload **2-5 ảnh điện thoại** (ảnh chụp thật, không dùng ảnh quảng cáo)
3. Chọn **Thương hiệu: Apple** + **Model** (VD: iPhone 13 Pro Max)
4. Nhập **% pin còn lại** (VD: 85% — xem trong iOS *Cài đặt → Pin → Tình trạng pin*)
5. Click **"Định giá bằng AI"**

Hệ thống chạy song song 4 service:
- 🎯 **Vision (port 8000):** Nhận diện generation + khoanh vùng damage
- 💰 **AI Service (port 3002):** Lấy median giá thị trường
- 🧮 **Backend (port 3001):** Tính `P_final = P_market × ∏(1 - w_i × d_i)`
- 🎨 **Frontend (port 3000):** Render kết quả với bbox overlay

Panel kết quả AI hiển thị:
- 🚨 Banner đỏ nếu AI nhận diện model khác khai báo (chống lừa)
- 🎯 Bbox vẽ trực tiếp lên ảnh
- 📋 Danh sách hư hỏng chi tiết (loại + vị trí + diện tích + confidence)
- 📊 Phân tích 5 bộ phận: màn hình / vỏ máy / camera / pin / khác
- 🧮 Expandable "AI tính toán như thế nào?" — show công thức + breakdown

**Phía Buyer (xem tin):**

Mở `/listings/{id}` → bên dưới mô tả là **panel AI Pricing đầy đủ** (read-only) để buyer thấy AI đã đánh giá máy như thế nào.

---

## 6. Xem dữ liệu 3 database (Prisma + MongoDB + Redis)

### 6.1. PostgreSQL — Prisma Studio (đã có sẵn)

```bash
cd backend
npx prisma studio
```

Mở browser tại http://localhost:5555 → xem 8 model: User, Listing, ListingImage, Category, Conversation, Message, PriceHistory, Block.

### 6.2. MongoDB — MongoDB Compass

**Cài:** Tải [MongoDB Compass](https://www.mongodb.com/try/download/compass) (free).

**Connect:** Dán URI:
```
mongodb://phonemarket:phonemarket123@localhost:27017/?authSource=admin
```

→ Click database `phonemarket_ai` → xem 2 collection:
- `market_price_raw` — post scrape (raw data)
- `ai_analysis_log` — log mỗi lần định giá

### 6.3. Redis — RedisInsight

**Cài:** Tải [RedisInsight](https://redis.io/insight/) (free).

**Connect:** Add database manually:
- **Connection URL:** `redis://default:phonemarket123@127.0.0.1:6379`

→ Tab **Browser** xem keys theo prefix:
- `pricing:market:*` — cache giá thị trường (TTL 24h)
- `session:*` — JWT refresh tokens
- `ratelimit:*` — counter chống brute-force

> Nếu Redis trống: cần backend chạy + có request đăng nhập / định giá thì cache mới được ghi.

### 6.4. Dùng CLI thay GUI (nhanh, không cần cài thêm)

```bash
# PostgreSQL
docker exec -it phonemarket_postgres psql -U phonemarket -d phonemarket

# MongoDB
docker exec -it phonemarket_mongodb mongosh -u phonemarket -p phonemarket123 --authenticationDatabase admin

# Redis
docker exec -it phonemarket_redis redis-cli -a phonemarket123
```

---

## 7. Xử lý sự cố

### Docker không kết nối được
```bash
docker ps                              # Kiểm tra Docker Desktop đã chạy
cd docker && docker compose up -d
```

### Lỗi "Port already in use"
```bash
# Windows — tìm process chiếm cổng
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### Prisma báo "Table does not exist"
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Vision service: `pip install` fail trên Windows
- Cài Visual C++ Build Tools (xem mục 1)
- Hoặc dùng prebuilt: `pip install ultralytics --prefer-binary`

### Vision service báo "Damage model not found"
- File `best_damage.pt` chưa có trong `ai-service-vision/app/models/` (Bước 2)
- Kiểm tra log Terminal 4 phải có dòng `Loading damage YOLO weights from app\models\best_damage.pt`

### AI định giá luôn báo "vision service không khả dụng"
- Vision service (Terminal 4) chưa chạy → mở http://localhost:8000/health
- Kiểm tra `VISION_SERVICE_URL=http://localhost:8000` trong `.env`

### AI định giá báo "Không có dữ liệu" cho giá thị trường
- AI Service (Terminal 2) chưa chạy → mở http://localhost:3002/health
- Mock data có sẵn cho iPhone 6 → 17 tại `ai-service/src/market-scraper/mock-data.ts`

### Frontend hiển thị trắng / CSS lỗi
```bash
cd frontend
# Windows PowerShell:
Remove-Item -Recurse -Force .next
# Mac/Linux:
rm -rf .next
npm run dev
```

### Build vision service bị `OSError: [Errno 28] No space left on device`
- Docker volumes đầy → `docker system prune -af --volumes` (cẩn thận: xoá hết container ngừng)

### Quên password DB / muốn reset toàn bộ
```bash
cd docker
docker compose down -v        # XOÁ TOÀN BỘ DATA (cẩn thận)
docker compose up -d
cd ../backend && npx prisma migrate deploy
```

---

## 8. Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, Zustand, react-hook-form + zod |
| Backend | NestJS 11, Prisma ORM 6, JWT Auth, Socket.io, Multer |
| AI Service (port 3002) | Express.js, LangChain.js, Gemini 2.0 Flash, mock market data |
| Vision Service (port 8000) | Python 3.11, FastAPI, **YOLOv11m** (Ultralytics), Pillow |
| Database | PostgreSQL 16 (nghiệp vụ), MongoDB 7 (AI logs), Redis 7 (cache) |
| Containerization | Docker Compose |
| Mô hình ML | 2 × YOLOv11m self-trained (generation 9 class + damage 3 class) |

---

## 9. Tài liệu tham khảo

- **Đặc tả hệ thống:** [`CLAUDE.md`](CLAUDE.md)
- **Training journal YOLO:** [`docs/damage-model-training-journal.md`](docs/damage-model-training-journal.md)
- **Model artifacts (confusion matrix, PR/F1 curves):** [`docs/damage-model-artifacts/`](docs/damage-model-artifacts/)
- **Q&A bảo vệ:** [`docs/QA-bao-ve-khoa-luan.txt`](docs/QA-bao-ve-khoa-luan.txt)
