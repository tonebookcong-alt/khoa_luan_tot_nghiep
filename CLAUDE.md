# ĐẶC TẢ HỆ THỐNG GIAO DỊCH ĐIỆN THOẠI THÔNG MINH TÍCH HỢP AI

## 1. THÔNG TIN ĐỀ TÀI
* **Tên đề tài:** XÂY DỰNG WEBSITE MUA BÁN VÀ TRAO ĐỔI ĐIỆN THOẠI TÍCH HỢP AI HỖ TRỢ ĐỊNH GIÁ SẢN PHẨM
* **Tên tiếng Anh:** Building a Website for Buying, Selling, and Exchanging Mobile Phones with AI-Based Product Price Estimation
* **Mục tiêu chính:** Thiết lập một website hỗ trợ mua bán, trao đổi thiết bị thuận tiện và phát triển hệ thống AI đa tác vụ để định giá sản phẩm khách quan theo thời gian thực.

---

## 2. MÔ TẢ GIẢI PHÁP & TÍNH MỚI CÔNG NGHỆ

### 2.1. Mô tả dự án
* Dự án tập trung giải quyết sự thiếu minh bạch về giá cả và tình trạng thiết bị trong thị trường điện thoại cũ.
* Hệ thống đóng vai trò một nền tảng giao dịch minh bạch, kết nối người mua và người bán thông qua các công cụ hỗ trợ thông minh.
* Ứng dụng khẳng định năng lực làm chủ quy trình phát triển phần mềm hiện đại và khả năng ứng dụng Generative AI cùng Big Data vào thực tế.

### 2.2. Tính mới cốt lõi
* **AI Agent định giá thời gian thực:** Vận hành các tác tử thông minh tự động khai phá dữ liệu từ các hội nhóm mạng xã hội để cập nhật biến động giá thị trường hàng ngày.
* **Thị giác máy tính (Computer Vision):** Tự động nhận diện model máy và số hóa các khiếm khuyết vật lý (trầy xước, nứt vỡ) để đưa ra mức khấu hao chính xác — sử dụng **Gemini Vision API** kết hợp phân tích ngôn ngữ tự nhiên.
* **Hệ sinh thái giao dịch khép kín:** Kết hợp định giá AI, Chat Real-time và thanh toán đảm bảo để tạo ra quy trình mua bán an toàn tuyệt đối.

---

## 3. GIẢI PHÁP KỸ THUẬT (TECH STACK)

### 3.1. Kiến trúc & Ngôn ngữ
* **Ngôn ngữ:** TypeScript (strict mode) cho toàn bộ Frontend và Backend.
* **Frontend:** Phát triển trên nền tảng **Next.js (React)** giúp tối ưu hóa tốc độ phản hồi và trải nghiệm người dùng trên di động. State management dùng **Zustand**.
* **Backend:** Sử dụng **NestJS** (Node.js) với kiến trúc module hóa, Dependency Injection, hướng sự kiện (Event-driven) để xử lý đồng thời các giao dịch và tác vụ ngầm của AI Agent.

### 3.2. Quản trị dữ liệu (Polyglot Persistence)
* **PostgreSQL:** Lưu trữ dữ liệu nghiệp vụ có cấu trúc như thông tin người dùng, tin đăng và các giao dịch tài chính. ORM sử dụng **Prisma** (type-safe, hỗ trợ migration).
* **MongoDB:** Lưu trữ các tập dữ liệu phi cấu trúc thu thập từ AI Agent và nhật ký phân tích của AI. ODM sử dụng **Mongoose**.
* **Redis:** Cache giá thị trường (tránh re-query liên tục), quản lý session, và rate limiting cho các API nhạy cảm.

### 3.3. Authentication & Phân quyền
* **JWT** (Access Token + Refresh Token) cho xác thực stateless.
* **OAuth2** hỗ trợ đăng nhập qua Google.
* Phân quyền 3 cấp: `Admin | Seller | Buyer`.

### 3.4. Công nghệ tích hợp
* **AI Agents (LangChain.js):** Điều phối các mô hình ngôn ngữ lớn (LLM) để trích xuất thông tin giá cả từ các hội nhóm mạng xã hội.
* **Gemini Vision API (Google):** Nhận diện model máy, phân tích hình ảnh thiết bị và mô tả thiệt hại vật lý bằng ngôn ngữ tự nhiên để tính hệ số khấu hao.
* **Socket.io:** Đảm bảo khả năng nhắn tin trực tuyến thời gian thực giữa các bên.
* **VNPAY API:** Xử lý luồng thanh toán tạm giữ tiền (Escrow), giải ngân tự động và thu phí hoa hồng trung gian.

### 3.5. Deployment
* **Docker + Docker Compose:** Container hóa toàn bộ dịch vụ (Frontend, Backend, AI Service, PostgreSQL, MongoDB, Redis).
* **Cloud:** VPS hoặc Railway/Render cho môi trường demo/production.

---

## 4. CƠ CHẾ ĐỊNH GIÁ TỰ ĐỘNG (CORE AI LOGIC)

Hệ thống sử dụng cơ chế hợp nhất dữ liệu để loại bỏ tính chủ quan trong định giá:

1. **Thu thập thị trường:** AI Agent quét dữ liệu phi cấu trúc từ các hội nhóm → Xác định giá sàn thị trường (P_market).
2. **Phân tích thực tế:** Gemini Vision API quét ảnh thực tế → Nhận diện và phân loại từng loại hư hỏng với mức độ d_i trong [0, 1].
3. **Công thức tổng hợp có trọng số:**

   P_final = P_market × ∏(1 - w_i × d_i)

   Trong đó:
   - w_i = trọng số của từng loại hư hỏng (màn hình > pin > vỏ máy > camera)
   - d_i = mức độ hư hỏng do Computer Vision phát hiện (0 = nguyên vẹn, 1 = hỏng hoàn toàn)
   - Bảng trọng số w_i được hiệu chỉnh dựa trên dữ liệu thị trường thực tế

4. **Confidence Score:** Kết quả định giá kèm theo khoảng tin cậy để người dùng đánh giá độ chắc chắn của mức giá đề xuất.

---

## 5. HỆ THỐNG CHỨC NĂNG

### 5.1. Chức năng nghiệp vụ
* **Quản lý hệ thống:** Quản lý người dùng, tin đăng bán máy và danh mục sản phẩm.
* **Giao dịch trung gian:** Thanh toán trung gian VNPAY hỗ trợ tạm giữ tiền, hoàn tiền và thu phí hoa hồng.
* **Tương tác:** Chat trực tiếp Real-time giữa người mua và người bán.
* **Báo cáo & Thống kê:** Theo dõi biến động giá điện thoại và doanh thu hoa hồng từ các giao dịch thành công.

### 5.2. Yêu cầu phi chức năng
* **Độ chính xác:** Đảm bảo sai số trong định giá ở mức thấp nhất dựa trên dữ liệu thực.
* **Hiệu năng:** Xử lý đồng thời lượng lớn dữ liệu quét mạng xã hội mà không gây trễ hệ thống.
* **Bảo mật:** Đảm bảo an toàn thông tin tài khoản và tính minh bạch trong mọi giao dịch tài chính.
* **Khả năng mở rộng:** Kiến trúc module hóa cho phép bổ sung danh mục sản phẩm hoặc nguồn dữ liệu mới mà không ảnh hưởng hệ thống hiện tại.

---

## 6. KẾT QUẢ ĐẦU RA DỰ KIẾN
* **Website hoàn chỉnh:** Hệ thống thương mại điện tử chuyên biệt hỗ trợ đầy đủ quy trình mua bán và trao đổi.
* **Mô-đun AI đa tác vụ:** Hệ thống định giá tự động tích hợp Agent và Thị giác máy tính (Gemini Vision).
* **Quy trình thanh toán an toàn:** Cơ chế tạm giữ tiền bảo vệ quyền lợi người dùng.
* **Tài liệu kỹ thuật:** Báo cáo chi tiết, sơ đồ thiết kế cơ sở dữ liệu và hướng dẫn vận hành.

---

## 7. QUY ƯỚC PHÁT TRIỂN (CODING CONVENTIONS)

> Phần này hướng dẫn Claude Code khi hỗ trợ phát triển dự án.

* **Ngôn ngữ:** TypeScript strict mode toàn bộ — không dùng `any`.
* **Backend:** NestJS — tuân theo cấu trúc Module/Controller/Service/Repository.
* **Frontend:** Next.js App Router — dùng Server Components khi có thể, Client Components khi cần interactivity.
* **ORM/ODM:** Prisma cho PostgreSQL, Mongoose cho MongoDB.
* **Naming:**
  * `camelCase` cho biến và hàm
  * `PascalCase` cho class, type, interface
  * `UPPER_SNAKE_CASE` cho hằng số và env variable
* **API Style:** RESTful — nhất quán theo `noun/action`, tránh động từ trong endpoint.
* **Commit style:** Conventional Commits — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
* **Branch strategy:** `main` (production) → `dev` (development) → `feature/<tên>`.
* **Testing:** Jest cho unit test, Playwright cho E2E.

---

## 8. CẤU TRÚC THƯ MỤC DỰ KIẾN

```
/
├── frontend/          # Next.js App (TypeScript)
├── backend/           # NestJS App (TypeScript)
│   └── src/
│       ├── auth/      # JWT, OAuth2
│       ├── users/
│       ├── listings/  # Tin đăng bán máy
│       ├── chat/      # Socket.io
│       ├── payment/   # VNPAY Escrow
│       └── pricing/   # AI pricing logic
├── ai-service/        # LangChain.js Agents + Gemini Vision
├── prisma/            # Prisma schema & migrations
├── docker/            # Docker Compose configs
└── docs/              # Tài liệu kỹ thuật, ERD, API spec
```

---

## 9. LỘ TRÌNH THỰC HIỆN (40 NGÀY)

> Bắt đầu: 29/03/2026 — Kết thúc: 07/05/2026

### Tổng quan

| Phase | Tên | Ngày | Milestone |
|---|---|---|---|
| 0 | Foundation & Setup | 1–4 | Docker Compose chạy 3 DB |
| 1 | Core Backend | 5–13 | API đầy đủ, test bằng Postman |
| 2 | Core Frontend | 14–20 | UI cơ bản hoạt động end-to-end |
| 3 | AI Pricing Engine | 21–30 | Định giá tự động hoạt động |
| 4 | Chat & Payment | 31–35 | Chat real-time + VNPAY Escrow |
| 5 | Admin & Deploy | 36–40 | Dashboard + Docker deploy hoàn chỉnh |

---

### Phase 0 — Foundation (Ngày 1–4)

- [ ] Khởi tạo monorepo: `frontend/`, `backend/`, `ai-service/`, `prisma/`, `docker/`, `docs/`
- [ ] Thiết kế Prisma schema: `User`, `Listing`, `ListingImage`, `Category`, `Transaction`, `Conversation`, `Message`, `PriceHistory`
- [ ] Thiết kế MongoDB schema: `market_price_raw`, `ai_analysis_log`
- [ ] Docker Compose: PostgreSQL, MongoDB, Redis, Backend, Frontend, AI Service
- [ ] Cấu hình ESLint + Prettier + `.env.example` + Conventional Commits

---

### Phase 1 — Core Backend (Ngày 5–13)

**Ngày 5–6 — Auth & Users**
- [ ] `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- [ ] Google OAuth2 (Passport.js)
- [ ] JwtAuthGuard + RolesGuard
- [ ] Rate limiting Redis cho `/auth/*`
- [ ] CRUD profile người dùng, Admin quản lý user/ban tài khoản

**Ngày 7–8 — Categories & cấu hình chung**
- [ ] Cây danh mục lồng nhau (nested), seed data các hãng điện thoại
- [ ] Global exception filter, validation pipe, Swagger, health check

**Ngày 9–13 — Listings**
- [ ] `POST /listings` (tạo DRAFT), upload ảnh (Multer)
- [ ] `PATCH /listings/:id/publish` (DRAFT → ACTIVE)
- [ ] `GET /listings` — filter theo category/giá/tình trạng, search, sort, pagination
- [ ] `GET /listings/:id`, `PATCH`, `DELETE` (soft delete)
- [ ] `GET /listings/my` — danh sách tin của Seller

---

### Phase 2 — Core Frontend (Ngày 14–20)

**Ngày 14–15 — Setup & Auth UI**
- [ ] Next.js App Router + Zustand (`useAuthStore`) + shadcn/ui + Tailwind
- [ ] Axios interceptor tự động refresh token
- [ ] Middleware bảo vệ route theo role
- [ ] Trang `/login`, `/register`, Google OAuth callback

**Ngày 16–19 — Listings UI**
- [ ] `/` — Trang chủ: hero + danh sách tin mới nhất
- [ ] `/listings` — Danh sách + bộ lọc + tìm kiếm
- [ ] `/listings/[id]` — Chi tiết tin + thông tin người bán + nút liên hệ/mua
- [ ] `/listings/create` — Form đăng tin + upload ảnh
- [ ] `/dashboard/listings` — Seller quản lý tin của mình

**Ngày 20 — Profile**
- [ ] `/profile` — Xem và chỉnh sửa thông tin cá nhân
- [ ] `/users/[id]` — Trang profile công khai người bán

---

### Phase 3 — AI Pricing Engine (Ngày 21–30)

**Ngày 21–24 — Gemini Vision** *(ưu tiên trước vì kết quả tức thì)*
- [ ] Module `gemini-vision` trong `ai-service/`:
  - Nhận mảng URL ảnh + tên model điện thoại
  - Gọi Gemini Vision API với prompt kỹ thuật: nhận diện model, liệt kê hư hỏng, trả về `d_i ∈ [0,1]` và confidence score
  - Parse JSON response, lưu vào MongoDB `ai_analysis_log`
- [ ] Endpoint `POST /ai/analyze-device` trong ai-service
- [ ] NestJS `pricing/vision.service.ts` gọi sang ai-service

**Ngày 25–27 — Market Scraper**
- [ ] Module `market-scraper` trong `ai-service/`:
  - LangChain.js agent trích xuất giá từ nguồn dữ liệu
  - Tính `P_market` = median các giá thu thập được cho cùng model
  - Cache vào Redis TTL = 24h (key: `market_price:{model_slug}`)
  - Lưu raw data vào MongoDB `market_price_raw`
- [ ] Cron job NestJS (`@nestjs/schedule`): chạy scraping 2h sáng hàng ngày

**Ngày 28–29 — Pricing Formula**
- [ ] `pricing/pricing-calculator.service.ts` trong NestJS:
  - Bảng trọng số: màn hình 0.40 · pin 0.20 · vỏ máy 0.20 · camera 0.15 · khác 0.05
  - Tính P_final + confidence score + price range (low/high)
- [ ] Endpoint `POST /pricing/estimate` → trả về `{ P_market, P_final, damageBreakdown, confidenceScore, priceRange }`
- [ ] Lưu kết quả vào field `aiPriceResult` của Listing và bảng `PriceHistory`

**Ngày 30 — Frontend AI Flow**
- [ ] Nút "Định giá bằng AI" trong trang tạo tin → loading state → hiển thị kết quả
- [ ] Breakdown hư hỏng từng hạng mục + confidence score visual
- [ ] Cho phép Seller override giá đề xuất

---

### Phase 4 — Chat & Payment (Ngày 31–35)

**Ngày 31–33 — Socket.io Chat**
- [ ] NestJS `ChatGateway`: authenticate bằng JWT, events `join_conversation`, `send_message`, `message_received`, `user_typing`
- [ ] Lưu `Message` vào PostgreSQL, mark as read
- [ ] REST API: `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations`
- [ ] Frontend `ChatWindow` component: lịch sử tin nhắn, input, typing indicator
- [ ] `/dashboard/messages` — trang quản lý các cuộc trò chuyện

**Ngày 34–35 — VNPAY Escrow**
- [ ] `payment/vnpay.service.ts`: `createPaymentUrl()`, `verifyPaymentReturn()`, `verifyIPN()`
- [ ] Luồng Escrow: Buyer mua → PENDING → VNPAY IPN → ESCROWED → xác nhận 2 bên → COMPLETED → thu hoa hồng
- [ ] Webhook `POST /payment/ipn` với xác thực HMAC
- [ ] Frontend: trang `/payment/[transactionId]` hiển thị trạng thái escrow

---

### Phase 5 — Admin & Deploy (Ngày 36–40)

**Ngày 36–37 — Admin Backend & Dashboard**
- [ ] API thống kê: KPI tổng quan, lịch sử biến động giá theo model, doanh thu hoa hồng
- [ ] Admin quản lý: listings (phê duyệt/từ chối), users (ban/đổi role), transactions
- [ ] Frontend `/admin/dashboard`: 4 KPI cards + biểu đồ Recharts (giá + doanh thu)
- [ ] `/admin/users`, `/admin/listings`, `/admin/transactions`

**Ngày 38–39 — Testing & Docker Deploy**
- [ ] Unit test bắt buộc: `pricing-calculator.service.ts` + `vnpay.service.ts`
- [ ] Docker multi-stage build cho từng service
- [ ] NGINX reverse proxy (frontend :80, backend :3001, ai-service :3002)
- [ ] Deploy lên VPS/Railway + HTTPS

**Ngày 40 — Tài liệu**
- [ ] ERD (PostgreSQL) + Sequence Diagram 3 luồng chính (AI Pricing, Escrow, Chat)
- [ ] Swagger export → `docs/api-spec`
- [ ] `docs/setup.md` — hướng dẫn cài đặt và chạy local

---

### MVP bắt buộc vs Nice-to-have

**Bắt buộc (phải có để bảo vệ):**
Auth · Listings · Gemini Vision · Công thức P_final · Chat cơ bản · VNPAY Escrow happy path · Admin dashboard · Docker deploy

**Để sau nếu còn thời gian:**
Market scraping thực sự (dùng mock data có cấu trúc để demo agent) · Typing indicator · Full-text search · Playwright E2E test · Refund flow
