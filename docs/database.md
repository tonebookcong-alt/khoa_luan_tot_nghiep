# TÀI LIỆU CƠ SỞ DỮ LIỆU

> **Đề tài:** Xây dựng Website Mua Bán và Trao Đổi Điện Thoại Tích Hợp AI Hỗ Trợ Định Giá Sản Phẩm
> **Cập nhật:** 2026-05-03

---

## MỤC LỤC

1. [Lựa chọn cơ sở dữ liệu](#1-lựa-chọn-cơ-sở-dữ-liệu)
2. [Vị trí và cách xem dữ liệu](#2-vị-trí-và-cách-xem-dữ-liệu)
3. [Thiết kế PostgreSQL (Prisma)](#3-thiết-kế-postgresql-prisma)
   - 3.1. [Lược đồ cơ sở dữ liệu](#31-lược-đồ-cơ-sở-dữ-liệu)
   - 3.2. [Định nghĩa Enum](#32-định-nghĩa-enum)
   - 3.3. [Thiết kế kiến trúc bảng](#33-thiết-kế-kiến-trúc-bảng)
   - 3.4. [Sơ đồ thực thể liên kết](#34-sơ-đồ-thực-thể-liên-kết)
4. [Thiết kế MongoDB (Mongoose)](#4-thiết-kế-mongodb-mongoose)
5. [Redis Cache](#5-redis-cache)

---

## 1. LỰA CHỌN CƠ SỞ DỮ LIỆU

Hệ thống áp dụng kiến trúc **Polyglot Persistence** — kết hợp nhiều hệ quản trị CSDL chuyên dụng cho từng loại dữ liệu thay vì dùng một CSDL duy nhất.

| Hệ quản trị | Vai trò | Lý do chọn |
|---|---|---|
| **PostgreSQL 15** | Lưu trữ dữ liệu nghiệp vụ có cấu trúc: User, Listing, Conversation, Message... | ACID đầy đủ, hỗ trợ JSONB cho field bán cấu trúc (`aiPriceResult`), index B-tree mạnh cho query phức tạp. ORM Prisma cho type-safe migrations |
| **MongoDB 7** | Lưu trữ dữ liệu phi cấu trúc / log AI: market price scraped raw, AI analysis log | Schema linh hoạt cho dữ liệu thay đổi cấu trúc theo thời gian (raw text từ marketplace, response Gemini không cố định). TTL index tự động xoá data cũ |
| **Redis 7** | Cache giá thị trường, session, rate limiting | In-memory tốc độ cao, TTL native, đơn giản cho key-value cache |

**Tổng số:** 8 bảng PostgreSQL + 3 enum + 2 collection MongoDB.

---

## 2. VỊ TRÍ VÀ CÁCH XEM DỮ LIỆU

### 2.1. Files định nghĩa schema

| Loại CSDL | File schema | Mô tả |
|---|---|---|
| PostgreSQL | `prisma/schema.prisma` | Định nghĩa toàn bộ models + enums + relations bằng Prisma DSL |
| Migrations | `prisma/migrations/` | SQL migration files được sinh tự động |
| MongoDB | `ai-service/src/shared/schemas/*.schema.ts` | 2 file: `market-price-raw.schema.ts` + `ai-analysis-log.schema.ts` |

### 2.2. Container Docker

Cả 3 CSDL chạy qua Docker Compose tại `docker/docker-compose.yml`:

| Service | Image | Port host | Database name |
|---|---|---|---|
| postgres | postgres:15-alpine | 5433 | `phonemarket` |
| mongodb | mongo:7 | 27017 | `phonemarket_ai` |
| redis | redis:7-alpine | 6379 | (key-value) |

### 2.3. Cách xem và quản lý dữ liệu

**PostgreSQL — 3 cách:**

1. **Prisma Studio** (khuyến khích — UI đẹp, edit được trực tiếp):
   ```bash
   cd backend
   npx prisma studio
   ```
   Mở browser: http://localhost:5555

2. **pgAdmin / DBeaver** (GUI ngoài):
   - Host: `localhost`, Port: `5433`
   - User: `phonemarket`, Password: `phonemarket123`
   - Database: `phonemarket`

3. **psql CLI**:
   ```bash
   docker exec -it phonemarket-postgres psql -U phonemarket -d phonemarket
   \dt              # Liệt kê bảng
   \d "User"        # Xem cấu trúc bảng (chú ý dấu nháy kép — Prisma dùng PascalCase)
   SELECT * FROM "User" LIMIT 5;
   ```

**MongoDB:**

1. **MongoDB Compass** (GUI):
   - Connection string: `mongodb://phonemarket:phonemarket123@localhost:27017/phonemarket_ai?authSource=admin`

2. **mongosh CLI**:
   ```bash
   docker exec -it phonemarket-mongodb mongosh -u phonemarket -p phonemarket123 --authenticationDatabase admin
   use phonemarket_ai
   show collections
   db.market_price_raw.find().limit(5)
   ```

**Redis:**

```bash
docker exec -it phonemarket-redis redis-cli -a phonemarket123
KEYS *                          # Liệt kê tất cả key
GET "market_price:apple-iphone-14-pro-max"
TTL "session:abc123"            # Xem TTL còn lại (giây)
```

---

## 3. THIẾT KẾ POSTGRESQL (PRISMA)

### 3.1. Lược đồ cơ sở dữ liệu

Hệ thống có **8 model**. Convention: PK in đậm (gạch chân logic), FK ghi nghiêng:

- **User** (<u>id</u>, email, passwordHash, googleId, *role*, name, phone, address, avatar, isBanned, resetPasswordToken, resetPasswordExpires, createdAt, updatedAt): Chứa thông tin tài khoản người dùng (Admin / Seller / Buyer).

- **Block** (<u>id</u>, *blockerId*, *blockedId*, createdAt): Lưu quan hệ chặn/bỏ chặn giữa các user.

- **Category** (<u>id</u>, name, slug, *parentId*, createdAt): Cây danh mục sản phẩm dạng nested (self-relation).

- **Listing** (<u>id</u>, *sellerId*, *categoryId*, title, description, *condition*, askingPrice, *status*, aiPriceResult, brand, model, storage, color, origin, warranty, iphoneVersion, location, accessories, createdAt, updatedAt): Tin đăng bán điện thoại — bảng trung tâm của hệ thống.

- **ListingImage** (<u>id</u>, *listingId*, url, order, createdAt): Ảnh đính kèm tin đăng (1 listing có nhiều ảnh).

- **Conversation** (<u>id</u>, *listingId*, *buyerId*, *sellerId*, createdAt, updatedAt): Cuộc hội thoại chat giữa buyer và seller về 1 listing cụ thể.

- **Message** (<u>id</u>, *conversationId*, *senderId*, content, mediaUrl, isRead, createdAt): Tin nhắn trong cuộc hội thoại.

- **PriceHistory** (<u>id</u>, *listingId*, brand, model, source, price, recordedAt): Lưu vết lịch sử biến động giá để vẽ biểu đồ phân tích.

### 3.2. Định nghĩa Enum

Hệ thống định nghĩa 3 enum dùng cho các field có giá trị giới hạn:

**Role** — Vai trò người dùng:
| Giá trị | Mô tả |
|---|---|
| `ADMIN` | Quản trị viên hệ thống |
| `SELLER` | Người bán |
| `BUYER` | Người mua (mặc định) |

**ListingStatus** — Trạng thái tin đăng:
| Giá trị | Mô tả |
|---|---|
| `DRAFT` | Mới tạo, chưa đăng (mặc định) |
| `ACTIVE` | Đang rao bán công khai |
| `SOLD` | Đã bán |
| `REMOVED` | Bị xoá / ẩn |

**DeviceCondition** — Tình trạng thiết bị:
| Giá trị | Mô tả |
|---|---|
| `NEW` | Mới 100% |
| `LIKE_NEW` | Như mới (99%) |
| `GOOD` | Tốt (90-98%) |
| `FAIR` | Khá (70-89%) |
| `POOR` | Kém (<70%) |

### 3.3. Thiết kế kiến trúc bảng

#### Bảng `User` — Tài khoản người dùng

| Field | Type | Null | Key | Default | Ghi chú |
|---|---|---|---|---|---|
| id | varchar(30) | No | PK | cuid() | |
| email | varchar(255) | No | UNIQUE | None | Index |
| passwordHash | varchar(255) | Yes | | NULL | Null nếu OAuth |
| googleId | varchar(255) | Yes | UNIQUE | NULL | Index |
| role | enum(Role) | No | | `BUYER` | |
| name | varchar(255) | No | | None | |
| phone | varchar(20) | Yes | | NULL | |
| address | varchar(255) | Yes | | NULL | |
| avatar | varchar(255) | Yes | | NULL | URL ảnh đại diện |
| isBanned | boolean | No | | false | |
| resetPasswordToken | varchar(255) | Yes | UNIQUE | NULL | |
| resetPasswordExpires | timestamp | Yes | | NULL | |
| createdAt | timestamp | No | | now() | |
| updatedAt | timestamp | No | | now() | Auto-update |

#### Bảng `Block` — Quan hệ chặn user

| Field | Type | Null | Key | Default | Ghi chú |
|---|---|---|---|---|---|
| id | varchar(30) | No | PK | cuid() | |
| blockerId | varchar(30) | No | FK → User | None | Người thực hiện chặn |
| blockedId | varchar(30) | No | FK → User | None | Người bị chặn |
| createdAt | timestamp | No | | now() | |

**Constraint:** UNIQUE(blockerId, blockedId) — không cho chặn 2 lần cùng 1 user.

#### Bảng `Category` — Danh mục sản phẩm (nested)

| Field | Type | Null | Key | Default | Ghi chú |
|---|---|---|---|---|---|
| id | varchar(30) | No | PK | cuid() | |
| name | varchar(255) | No | | None | |
| slug | varchar(255) | No | UNIQUE | None | URL-friendly, dùng cho /categories/:slug |
| parentId | varchar(30) | Yes | FK → Category (self) | NULL | Cây nested |
| createdAt | timestamp | No | | now() | |

#### Bảng `Listing` — Tin đăng bán điện thoại (bảng trung tâm)

| Field | Type | Null | Key | Default | Ghi chú |
|---|---|---|---|---|---|
| id | varchar(30) | No | PK | cuid() | |
| sellerId | varchar(30) | No | FK → User | None | |
| categoryId | varchar(30) | Yes | FK → Category | NULL | |
| title | varchar(255) | No | | None | |
| description | text | No | | None | Hỗ trợ mô tả dài |
| condition | enum(DeviceCondition) | No | | None | Auto-set từ AI nếu có |
| askingPrice | int | No | | None | Đơn vị VND |
| status | enum(ListingStatus) | No | | `DRAFT` | |
| aiPriceResult | jsonb | Yes | | NULL | Output đầy đủ của `/pricing/estimate` (bao gồm bbox, fraud detection...) |
| brand | varchar(50) | No | | None | Apple, Samsung... |
| model | varchar(100) | No | | None | iPhone 14 Pro Max... |
| storage | varchar(20) | Yes | | NULL | 128GB, 256GB... |
| color | varchar(50) | Yes | | NULL | |
| origin | varchar(50) | Yes | | NULL | Việt Nam, Mỹ... |
| warranty | varchar(50) | Yes | | NULL | Hết bảo hành, 1 tháng... |
| iphoneVersion | varchar(50) | Yes | | NULL | Quốc tế / Khoá mạng (chỉ Apple) |
| location | varchar(255) | Yes | | NULL | |
| accessories | varchar(255) | Yes | | NULL | "Củ sạc, Cáp sạc" |
| createdAt | timestamp | No | | now() | |
| updatedAt | timestamp | No | | now() | Auto-update |

**Index:** sellerId, categoryId, status, (brand, model) composite.

#### Bảng `ListingImage` — Ảnh tin đăng

| Field | Type | Null | Key | Default | Ghi chú |
|---|---|---|---|---|---|
| id | varchar(30) | No | PK | cuid() | |
| listingId | varchar(30) | No | FK → Listing (CASCADE) | None | Xoá listing → xoá ảnh |
| url | varchar(255) | No | | None | `/uploads/{filename}` |
| order | int | No | | 0 | Ảnh đầu tiên (0) là ảnh bìa |
| createdAt | timestamp | No | | now() | |

#### Bảng `Conversation` — Cuộc hội thoại

| Field | Type | Null | Key | Default | Ghi chú |
|---|---|---|---|---|---|
| id | varchar(30) | No | PK | cuid() | |
| listingId | varchar(30) | No | FK → Listing | None | |
| buyerId | varchar(30) | No | FK → User | None | |
| sellerId | varchar(30) | No | FK → User | None | |
| createdAt | timestamp | No | | now() | |
| updatedAt | timestamp | No | | now() | |

**Constraint:** UNIQUE(listingId, buyerId) — mỗi buyer chỉ có 1 hội thoại với seller cho mỗi listing.

#### Bảng `Message` — Tin nhắn

| Field | Type | Null | Key | Default | Ghi chú |
|---|---|---|---|---|---|
| id | varchar(30) | No | PK | cuid() | |
| conversationId | varchar(30) | No | FK → Conversation (CASCADE) | None | |
| senderId | varchar(30) | No | FK → User | None | |
| content | text | No | | None | |
| mediaUrl | varchar(255) | Yes | | NULL | URL ảnh / video đính kèm |
| isRead | boolean | No | | false | |
| createdAt | timestamp | No | | now() | |

#### Bảng `PriceHistory` — Lịch sử giá

| Field | Type | Null | Key | Default | Ghi chú |
|---|---|---|---|---|---|
| id | varchar(30) | No | PK | cuid() | |
| listingId | varchar(30) | Yes | FK → Listing | NULL | Null nếu là giá scrape, không gắn với listing |
| brand | varchar(50) | No | | None | |
| model | varchar(100) | No | | None | |
| source | varchar(50) | No | | None | `ai_estimate` / `market_scrape` / `sold_price` |
| price | int | No | | None | VND |
| recordedAt | timestamp | No | | now() | Index |

### 3.4. Sơ đồ thực thể liên kết

```
                    ┌──────────────┐
                    │   Category   │◄──┐ (nested self-relation)
                    └──────┬───────┘   │
                           │           │
                           ▼           │
       ┌────────┐    ┌──────────┐      │
       │  User  │◄───┤ Listing  ├──────┘
       └───┬────┘    └────┬─────┘
           │              │
           │              ├────► ListingImage
           │              │
           │              ├────► Conversation
           │              │             │
           │              │             └────► Message ◄──── User (sender)
           │              │
           │              └────► PriceHistory
           │
           ├────► Block (blocker / blocked self-relation)
           │
           └────► (relations sentMessages, conversations...)
```

**Quy tắc cascade:**
- Xoá `Listing` → cascade xoá `ListingImage`
- Xoá `Conversation` → cascade xoá `Message`
- Xoá `User` → cascade xoá `Block` (cả 2 chiều blocker / blocked)

**Đa quan hệ (User tham gia ở nhiều vai trò):**
- User → Listing: `seller`
- User → Conversation: `buyer` HOẶC `seller`
- User → Message: `sender`
- User → Block: `blocker` HOẶC `blocked`

---

## 4. THIẾT KẾ MONGODB (MOONGOOSE)

MongoDB lưu các tập dữ liệu bán cấu trúc / log — không cần ràng buộc ACID, nhưng cần linh hoạt schema và TTL để tự dọn data cũ.

### 4.1. Collection `market_price_raw`

**Vai trò:** Chứa dữ liệu giá thô được scrape từ các marketplace (Chợ Tốt, hội nhóm Facebook...) trước khi qua bước aggregation. AI Agent đọc từ đây để tính P_market median.

| Field | Type | Required | Index | Ghi chú |
|---|---|---|---|---|
| _id | ObjectId | Yes (auto) | PK | |
| brand | String | Yes | ✓ | Apple, Samsung... |
| model | String | Yes | ✓ | iPhone 14 Pro Max... |
| source | String | Yes | | URL nguồn / tên hội nhóm |
| price | Number | Yes | | Giá rao (VND) |
| condition | String | No | | Mô tả tình trạng máy (text thô từ tin đăng) |
| rawText | String | No | | Toàn văn tin đăng gốc (để debug / re-parse) |
| scrapedAt | Date | No (default now) | ✓ | TTL 30 ngày |

**TTL Index:** `{ scrapedAt: 1, expireAfterSeconds: 30 * 24 * 60 * 60 }` — MongoDB tự xoá document sau 30 ngày để tránh bloat.

### 4.2. Collection `ai_analysis_log`

**Vai trò:** Ghi nhật ký mỗi lần gọi AI định giá để: (1) phân tích độ chính xác AI sau này, (2) debug khi user phàn nàn về giá, (3) tổng hợp metric.

| Field | Type | Required | Index | Ghi chú |
|---|---|---|---|---|
| _id | ObjectId | Yes (auto) | PK | |
| listingId | String | Yes | ✓ | Tham chiếu `Listing.id` bên Postgres |
| imageUrls | String[] | No | | URL ảnh đã phân tích |
| detectedModel | String | No | | Model AI nhận diện được |
| damageItems | DamageItem[] | No | | Subdocument array (xem bên dưới) |
| confidenceScore | Number | No | | 0.0 – 1.0 |
| pFinal | Number | No | | Giá đề xuất cuối (VND) |
| pMarket | Number | No | | Giá thị trường tham chiếu (VND) |
| geminiRawResponse | String | No | | Raw JSON response từ Gemini (debug) |
| processedAt | Date | No (default now) | ✓ | |

**Subdocument `DamageItem`:**

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| part | String | required | `screen` / `battery` / `body` / `camera` / `other` |
| severity | Number | required, min:0, max:1 | d_i — mức độ hư hỏng |
| description | String | default "" | Mô tả từ AI |
| weight | Number | required | w_i — trọng số (xem CLAUDE.md) |

> **Lưu ý cross-database:** `listingId` của Mongo chỉ là string copy của `Listing.id` Postgres — không có FK ràng buộc. Khi xoá listing bên Postgres, document log Mongo vẫn còn (cố ý — phục vụ phân tích lịch sử).

---

## 5. REDIS CACHE

Redis không có schema cố định, chỉ là store key-value. Các pattern key đang dùng:

| Pattern key | TTL | Mục đích | Ghi đâu |
|---|---|---|---|
| `market_price:{brand-model-slug}` | 24h | Cache giá thị trường để tránh re-query Mongo / scraper liên tục | `ai-service/src/market-scraper/market-scraper.service.ts` |
| `session:{userId}` | 7 ngày | Session refresh token (planned, hiện stateless JWT) | `backend/src/auth/` |
| `ratelimit:{ip}:{endpoint}` | sliding window 60s | Throttle endpoint nhạy cảm `/auth/login`, `/auth/register` | `backend/src/common/throttler/` |

---

## 6. TÓM TẮT — CÁCH KIỂM TRA NHANH

```bash
# 1. Verify cả 3 DB đang chạy
docker compose -f docker/docker-compose.yml ps

# 2. Xem dữ liệu PostgreSQL
cd backend && npx prisma studio          # → http://localhost:5555

# 3. Xem dữ liệu MongoDB
docker exec -it phonemarket-mongodb mongosh -u phonemarket -p phonemarket123 --authenticationDatabase admin
# > use phonemarket_ai
# > db.ai_analysis_log.find().sort({processedAt: -1}).limit(3)

# 4. Xem cache Redis
docker exec -it phonemarket-redis redis-cli -a phonemarket123 KEYS "market_price:*"
```
