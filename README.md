# PhoneMarket — Website Mua Bán Điện Thoại Tích Hợp AI

**Sinh viên:** Ngô Tuấn Huy — **GVHD:** ĐOÀN HOÀNG DUY

## 📝 Giới thiệu khóa luận tốt nghiệp

**PhoneMarket** là một nền tảng thương mại điện tử chuyên biệt dành cho việc mua bán, trao đổi và định giá điện thoại di động đã qua sử dụng tích hợp công nghệ Trí tuệ Nhân tạo (AI). Dự án nhằm giải quyết bài toán định giá điện thoại cũ một cách khách quan, minh bạch và tự động hóa quy trình giao dịch giữa người mua và người bán.

### 🌟 Các tính năng nổi bật tích hợp AI

1. **Định giá điện thoại tự động bằng Trí tuệ nhân tạo (AI Valuation):**
   * **Phân tích ngoại quan qua hình ảnh (Vision AI):** Tích hợp mô hình học máy **YOLOv8** (sử dụng các bộ trọng số đã huấn luyện chuyên biệt `best_v1.pt` và `best_damage.pt`) để tự động phân tích hình ảnh thực tế của điện thoại, nhận diện chính xác các lỗi như nứt màn hình, trầy xước mặt lưng, cấn móp viền.
   * **Thuật toán định giá thông minh:** Kết hợp kết quả đánh giá ngoại quan của AI cùng các thông số cấu hình phần cứng (dung lượng pin, bộ nhớ, dòng máy, tình trạng bảo hành) để đưa ra mức giá đề xuất tối ưu và sát với thị trường nhất.

2. **Hỗ trợ giao dịch và thu cũ đổi mới (Trade-in Platform):**
   * Quy trình thu cũ đổi mới trực quan, cho phép người dùng tự thẩm định giá điện thoại cũ của mình tại nhà và nhận gợi ý lên đời các dòng máy mới phù hợp.
   * Hệ thống đăng tin và quản lý sản phẩm mua bán rõ ràng, tiện lợi.

3. **Trợ lý tư vấn mua sắm thông minh (AI Assistant):**
   * Tích hợp chatbot tư vấn thông minh giúp người dùng so sánh các dòng máy, phân tích nhu cầu sử dụng và gợi ý sản phẩm tối ưu trong tầm giá.

### 🛠️ Kiến trúc hệ thống và Công nghệ sử dụng

Hệ thống được thiết kế theo kiến trúc Microservices chia tách rõ rệt các dịch vụ nghiệp vụ và dịch vụ xử lý AI:

* **Frontend:** **Next.js** (React) - Tối ưu hóa trải nghiệm người dùng, tải trang nhanh và giao diện tương thích tốt trên mọi thiết bị.
* **Backend Service:** **NestJS / Node.js** kết hợp với **Prisma ORM** - Quản lý toàn bộ cơ sở dữ liệu nghiệp vụ, phân quyền bảo mật chặt chẽ.
* **AI Service (FastAPI - Python):** Dịch vụ xử lý ảnh chuyên biệt đảm nhận nhiệm vụ chạy mô hình thị giác máy tính YOLOv8.
* **AI Chat Service:** Dịch vụ tích hợp các mô hình ngôn ngữ lớn (LLM) để vận hành chatbot tư vấn.
* **Hệ thống cơ sở dữ liệu:**
  * **PostgreSQL:** Lưu trữ dữ liệu quan hệ (người dùng, sản phẩm, hóa đơn, bài viết).
  * **MongoDB:** Lưu trữ dữ liệu phi cấu trúc phục vụ cho log định giá và hội thoại AI.
  * **Redis:** Caching dữ liệu, quản lý phiên đăng nhập và tối ưu hóa hiệu năng truy vấn.

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
