# PhoneMarket — Website Mua Bán Điện Thoại Tích Hợp AI

> **Đề tài:** Xây dựng Website Mua Bán và Trao Đổi Điện Thoại Tích Hợp AI Hỗ Trợ Định Giá Sản Phẩm
> **Sinh viên thực hiện:** [Tên sinh viên]
> **GVHD:** [Tên giáo viên hướng dẫn]

---

## Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---------|-------------------|---------|
| Node.js | v20+ | [nodejs.org](https://nodejs.org) |
| Docker Desktop | v24+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Git | Bất kỳ | |

> **Lưu ý:** Docker Desktop phải đang **chạy** trước khi thực hiện các bước bên dưới.

---

## Cấu trúc dự án

```
/
├── frontend/        # Next.js 15 (React) — cổng 3000
├── backend/         # NestJS — cổng 3001
├── ai-service/      # Express + Gemini Vision + LangChain — cổng 3002
├── prisma/          # Prisma schema & migrations (PostgreSQL)
├── docker/          # Docker Compose
└── .env             # Biến môi trường (cần tạo từ .env.example)
```

---

## Hướng dẫn cài đặt và chạy

### Bước 1 — Tải source code

```bash
git clone <https://github.com/KLTN-03-2026/GR39>
cd khoa_luan_tot_nghiep
```

### Bước 2 — Tạo file môi trường

Sao chép file `.env.example` thành `.env`:

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Mở file `.env` và điền **Gemini API Key** (bắt buộc để tính năng AI hoạt động):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> Lấy key miễn phí tại: https://aistudio.google.com/app/apikey

Tạo thêm file `ai-service/.env` với nội dung:

```env
PORT=3002
MONGODB_URI=mongodb://phonemarket:phonemarket123@127.0.0.1:27017/phonemarket_ai?authSource=admin
REDIS_URL=redis://:phonemarket123@localhost:6379
GEMINI_API_KEY=your_gemini_api_key_here
```

Các biến còn lại đã có giá trị mặc định, **không cần thay đổi** khi chạy local.

---

### Bước 3 — Khởi động cơ sở dữ liệu (Docker)

```bash
cd docker
docker compose up -d postgres mongodb redis
```

Chờ khoảng 20-30 giây cho các container khởi động. Kiểm tra trạng thái:

```bash
docker compose ps
```

Tất cả container phải có trạng thái `healthy` trước khi chuyển sang bước tiếp.

---

### Bước 4 — Cài đặt dependencies

Mở **3 terminal riêng biệt**, mỗi terminal chạy một lệnh:

**Terminal 1 — Backend:**
```bash
cd backend
npm install
```

**Terminal 2 — AI Service:**
```bash
cd ai-service
npm install
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm install
```

---

### Bước 5 — Khởi tạo cơ sở dữ liệu

Chạy lệnh sau tại thư mục gốc để tạo bảng và dữ liệu mẫu:

```bash
npx prisma migrate deploy
npx prisma db seed
```

> Lệnh seed tạo danh mục sản phẩm và tài khoản mặc định.

---

### Bước 6 — Khởi động ứng dụng

Quay lại 3 terminal từ Bước 4:

**Terminal 1 — Backend (cổng 3001):**
```bash
cd backend
npm run start:dev
```

Chờ thấy dòng: `Backend running on http://localhost:3001`

**Terminal 2 — AI Service (cổng 3002):**
```bash
cd ai-service
npm run dev
```

Chờ thấy dòng: `AI Service running on port 3002`

**Terminal 3 — Frontend (cổng 3000):**
```bash
cd frontend
npm run dev
```

Chờ thấy dòng: `Ready - started server on 0.0.0.0:3000`

---

### Bước 7 — Truy cập ứng dụng

| Dịch vụ | URL |
|---------|-----|
| **Website** | http://localhost:3000 |
| **Swagger (API Docs)** | http://localhost:3001/docs |
| **AI Service** | http://localhost:3002 |

---

## Tài khoản demo

Sau khi seed, sử dụng các tài khoản sau:

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@phonemarket.vn | Admin@123 |
| Seller | seller@phonemarket.vn | Seller@123 |

Hoặc tự đăng ký tại http://localhost:3000/register

---

## Demo tính năng AI định giá

1. Đăng nhập → vào **Đăng tin** (http://localhost:3000/listings/create)
2. Upload ảnh điện thoại (ít nhất 1 ảnh)
3. Chọn **Thương hiệu** và nhập **Model máy** (VD: Apple / iPhone 14 Pro Max)
4. Nhấn nút **"Định giá bằng AI"**
5. Hệ thống sẽ:
   - Gửi ảnh lên Gemini Vision API để phân tích hư hỏng
   - Truy vấn giá thị trường từ database
   - Tính toán giá đề xuất theo công thức: `P_final = P_market × ∏(1 - w_i × d_i)`
   - Hiển thị breakdown từng bộ phận và khoảng giá tham khảo

---

## Xử lý sự cố thường gặp

### Lỗi không kết nối được database
```bash
# Kiểm tra Docker đang chạy
docker ps

# Khởi động lại database
cd docker
docker compose up -d postgres mongodb redis
```

### Lỗi "Port already in use"
```bash
# Windows — tìm process dùng cổng 3001
netstat -ano | findstr :3001
# Sau đó kill process theo PID tìm được
taskkill /PID <PID> /F
```

### Lỗi Prisma "Table does not exist"
```bash
npx prisma migrate deploy
```

### AI Service không phân tích được ảnh
- Kiểm tra `GEMINI_API_KEY` trong `ai-service/.env`
- Lấy key tại: https://aistudio.google.com/app/apikey

### Frontend hiển thị trắng / CSS không load
```bash
cd frontend
rm -rf .next
npm run dev
```

---

## Tech Stack

| Thành phần | Công nghệ |
|-----------|-----------|
| Frontend | Next.js 15, React, Tailwind CSS, Zustand |
| Backend | NestJS, Prisma ORM, JWT Authentication |
| AI Service | Express.js, Gemini Vision API, LangChain.js |
| Database | PostgreSQL (dữ liệu nghiệp vụ), MongoDB (AI logs), Redis (cache) |
| Containerization | Docker Compose |
