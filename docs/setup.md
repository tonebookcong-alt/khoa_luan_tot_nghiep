# Hướng dẫn cài đặt và chạy PhoneMarket

## Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---------|---------------------|
| Node.js | 20.x |
| Docker & Docker Compose | 24.x |
| Git | 2.x |

---

## Chạy nhanh với Docker (Recommended)

### 1. Clone và cấu hình môi trường

```bash
git clone <repo-url>
cd khoa_luan_tot_nghiep

# Copy file cấu hình
cp .env.example .env
```

Mở `.env` và điền các giá trị cần thiết:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — từ Google Cloud Console
- `VNPAY_TMN_CODE` / `VNPAY_HASH_SECRET` — từ VNPAY sandbox
- `GEMINI_API_KEY` — đã được điền sẵn để demo

### 2. Build và khởi động tất cả services

```bash
cd docker
docker compose up --build -d
```

Lần đầu build mất khoảng 3–5 phút. Sau khi xong:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| Swagger Docs | http://localhost:3001/docs |
| AI Service | http://localhost:3002 |

### 3. Chạy database migration

```bash
# Chạy migration PostgreSQL (lần đầu hoặc khi schema thay đổi)
docker exec phonemarket_backend npx prisma migrate deploy --schema=/app/../prisma/schema.prisma
```

### 4. Tạo tài khoản Admin

```bash
# Đăng ký tài khoản bình thường trước, rồi chạy lệnh này để nâng lên ADMIN
docker exec phonemarket_postgres psql -U phonemarket -d phonemarket \
  -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

---

## Chạy local (Development)

### 1. Khởi động databases

```bash
cd docker
docker compose up postgres mongodb redis -d
```

### 2. Backend

```bash
cd backend
cp ../.env.example ../.env   # nếu chưa có .env

npm install
npx prisma generate --schema=../prisma/schema.prisma
npx prisma migrate dev --schema=../prisma/schema.prisma

npm run start:dev
# → http://localhost:3001
```

### 3. AI Service

```bash
cd ai-service
npm install
npm run dev
# → http://localhost:3002
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Chạy unit tests

```bash
cd backend

# Chạy tất cả unit tests
npm run test

# Chỉ chạy 2 test bắt buộc
npx jest --testPathPatterns="pricing-calculator|vnpay" --no-coverage
```

---

## Cấu trúc thư mục

```
/
├── frontend/        Next.js 15 (React, TypeScript, Tailwind)
├── backend/         NestJS (TypeScript, Prisma, Socket.io)
├── ai-service/      Express (LangChain.js, Gemini Vision)
├── prisma/          Schema PostgreSQL + migrations
├── docker/          Docker Compose + configs
└── docs/            Tài liệu kỹ thuật
```

---

## Biến môi trường quan trọng

| Biến | Mô tả | Bắt buộc |
|------|-------|---------|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | ✅ |
| `MONGODB_URI` | Chuỗi kết nối MongoDB | ✅ |
| `REDIS_URL` | Chuỗi kết nối Redis | ✅ |
| `JWT_ACCESS_SECRET` | Secret cho access token | ✅ |
| `JWT_REFRESH_SECRET` | Secret cho refresh token | ✅ |
| `GEMINI_API_KEY` | Google Gemini Vision API | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth2 | Để dùng "Login Google" |
| `VNPAY_TMN_CODE` | VNPAY Terminal Code | Để test thanh toán |
| `VNPAY_HASH_SECRET` | VNPAY Hash Secret | Để test thanh toán |

---

## Xử lý sự cố thường gặp

**Prisma lỗi "Cannot find module"**
```bash
cd backend && npx prisma generate --schema=../prisma/schema.prisma
```

**Port đã được dùng**
```bash
docker compose down   # Dừng tất cả containers
docker compose up -d  # Khởi động lại
```

**Backend không kết nối được database**
```bash
# Kiểm tra database đã sẵn sàng chưa
docker compose ps
# Đợi status = "healthy" rồi restart backend
docker compose restart backend
```
