# PhoneMarket — Website Mua Bán Điện Thoại Tích Hợp AI

**Sinh viên:** Ngô Tuấn Huy — **GVHD:** ĐOÀN HOÀNG DUY

---

## Cài phần mềm

Tải và cài 4 thứ này (next next finish):

1. [Node.js v20+](https://nodejs.org)
2. [Python 3.11+](https://www.python.org/downloads/) — khi cài tick ô **"Add Python to PATH"**
3. [Docker Desktop](https://www.docker.com/products/docker-desktop/) — cài xong **mở lên**, đợi icon xanh
4. [Git](https://git-scm.com/)

---

## Sao lưu (làm trên máy CŨ)

```powershell
cd c:/khoa_luan_tot_nghiep

docker exec phonemarket_postgres pg_dump -U phonemarket phonemarket > backup_postgres.sql

docker exec phonemarket_mongodb mongodump -u phonemarket -p phonemarket123 --authenticationDatabase admin --db phonemarket_ai --out /tmp/mongo_backup
docker cp phonemarket_mongodb:/tmp/mongo_backup ./backup_mongo
```

Copy sang USB / Google Drive:
- Toàn bộ thư mục `c:/khoa_luan_tot_nghiep` (xoá `node_modules/`, `.next/`, `.venv/` cho nhẹ)
- File `backup_postgres.sql` + thư mục `backup_mongo/`

---

## Cài trên máy MỚI

### Bước 1 — Đặt project vào ổ C

Giải nén / copy vào `c:/khoa_luan_tot_nghiep`

Kiểm tra 2 file YOLO có sẵn:
```
c:/khoa_luan_tot_nghiep/ai-service-vision/app/models/best_v1.pt
c:/khoa_luan_tot_nghiep/ai-service-vision/app/models/best_damage.pt
```

### Bước 2 — Tạo file .env

Mở PowerShell tại `c:/khoa_luan_tot_nghiep`:

```powershell
Copy-Item .env.example .env
Copy-Item .env.example ai-service\.env
Copy-Item ai-service-vision\.env.example ai-service-vision\.env
```

### Bước 3 — Bật 3 database

```powershell
cd docker
docker compose up -d postgres mongodb redis
```

Đợi 30 giây.

### Bước 4 — Cài dependencies (4 terminal song song)

**Terminal 1:**
```powershell
cd c:/khoa_luan_tot_nghiep/backend
npm install
```

**Terminal 2:**
```powershell
cd c:/khoa_luan_tot_nghiep/ai-service
npm install
```

**Terminal 3:**
```powershell
cd c:/khoa_luan_tot_nghiep/frontend
npm install
```

**Terminal 4:**
```powershell
cd c:/khoa_luan_tot_nghiep/ai-service-vision
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .
```

### Bước 5 — Tạo bảng

```powershell
cd c:/khoa_luan_tot_nghiep/backend
npx prisma migrate deploy
npx prisma generate
```

### Bước 6 — Restore data cũ (nếu có backup)

```powershell
cd c:/khoa_luan_tot_nghiep

docker exec -i phonemarket_postgres psql -U phonemarket -d phonemarket < backup_postgres.sql

docker cp ./backup_mongo phonemarket_mongodb:/tmp/mongo_restore
docker exec phonemarket_mongodb mongorestore -u phonemarket -p phonemarket123 --authenticationDatabase admin /tmp/mongo_restore
```

---

## Chạy app (4 terminal)

**Terminal 1 — Backend:**
```powershell
cd c:/khoa_luan_tot_nghiep/backend
npm run start:dev
```

**Terminal 2 — AI Service:**
```powershell
cd c:/khoa_luan_tot_nghiep/ai-service
npm run dev
```

**Terminal 3 — Frontend:**
```powershell
cd c:/khoa_luan_tot_nghiep/frontend
npm run dev
```

**Terminal 4 — Vision:**
```powershell
cd c:/khoa_luan_tot_nghiep/ai-service-vision
.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Mở trình duyệt: **http://localhost:3000**

---

## Xem database

**PostgreSQL:**
```powershell
cd c:/khoa_luan_tot_nghiep/backend
npx prisma studio
```
→ http://localhost:5555

**MongoDB** — tải [MongoDB Compass](https://www.mongodb.com/try/download/compass), connect bằng:
```
mongodb://phonemarket:phonemarket123@localhost:27017/?authSource=admin
```

**Redis** — tải [RedisInsight](https://redis.io/insight/), connect bằng:
```
redis://default:phonemarket123@127.0.0.1:6379
```

---

## Lỗi thường gặp

**Docker không chạy:** Mở Docker Desktop, đợi icon xanh.

**Port bị chiếm:**
```powershell
netstat -ano | findstr :3001
taskkill /PID <số_PID> /F
```

**Frontend trắng tinh:**
```powershell
cd c:/khoa_luan_tot_nghiep/frontend
Remove-Item -Recurse -Force .next
npm run dev
```

**Reset toàn bộ DB:**
```powershell
cd c:/khoa_luan_tot_nghiep/docker
docker compose down -v
docker compose up -d
cd ../backend
npx prisma migrate deploy
```
