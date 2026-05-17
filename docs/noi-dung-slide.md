# NỘI DUNG SLIDE THUYẾT TRÌNH KHÓA LUẬN

**Đề tài:** Xây dựng Website Mua bán & Trao đổi Điện thoại Tích hợp AI Hỗ trợ Định giá Sản phẩm
**Team 39 — CNTT, ĐH Duy Tân**
**GVHD:** Th.S Đoàn Hoàng Duy
**Thời lượng đề xuất:** 18–20 phút thuyết trình + 5 phút Q&A
**Số slide:** 21

---

## 📋 SLIDE 1 — BÌA

**Layout:** Trang bìa căn giữa, logo trường ở góc trên.

**Nội dung:**

```
TRƯỜNG ĐẠI HỌC DUY TÂN
KHOA CÔNG NGHỆ THÔNG TIN

KHÓA LUẬN TỐT NGHIỆP

PHẦN MỀM MUA BÁN TRAO ĐỔI ĐIỆN THOẠI
TÍCH HỢP AI HỖ TRỢ ĐỊNH GIÁ SẢN PHẨM

Team 39 — CNTT
GVHD: Th.S Đoàn Hoàng Duy

Thành viên:
• Ngô Tuấn Huy
• Nguyễn Lê Nguyên
• Lê Văn Toàn
• Lê Đức Trọng

Đà Nẵng, 05/2026
```

**Visual:** Logo ĐH Duy Tân, ảnh minh họa điện thoại + biểu tượng AI (gradient tím — màu chủ đạo PhoneMarket).

**Notes thuyết trình (30s):**
> "Kính thưa quý thầy cô trong hội đồng. Em xin được trình bày đề tài khóa luận tốt nghiệp của nhóm em — Phần mềm mua bán trao đổi điện thoại tích hợp AI hỗ trợ định giá sản phẩm. Đề tài do thầy Đoàn Hoàng Duy hướng dẫn."

---

## 📋 SLIDE 2 — NỘI DUNG TRÌNH BÀY

**Layout:** 4 cột hoặc 8 ô vuông đánh số.

**Nội dung:**

```
1. Lý do chọn đề tài
2. Mục tiêu & Nhiệm vụ
3. Tính mới của đề tài
4. Công nghệ sử dụng
5. Kiến trúc hệ thống
6. Cơ chế định giá AI (Core)
7. Demo chương trình
8. Kết quả – Hạn chế – Hướng phát triển
```

**Notes (20s):**
> "Bài thuyết trình của em gồm 8 nội dung chính. Em sẽ bắt đầu từ vấn đề thị trường đặt ra, sau đó đi vào giải pháp công nghệ và kết thúc bằng phần demo trực tiếp."

---

## 📋 SLIDE 3 — LÝ DO CHỌN ĐỀ TÀI

**Tiêu đề:** Vấn đề thị trường điện thoại cũ đang tồn tại

**Nội dung (3 bullet ngắn, có icon):**

- 🔍 **Thiếu minh bạch giá cả:** Cùng một dòng máy, giá rao trên các diễn đàn chênh nhau 30–50%. Người mua không có công cụ tham chiếu khách quan.
- 📷 **Không kiểm chứng được tình trạng máy:** Người bán mô tả "máy 99%, không trầy xước" nhưng người mua chỉ thấy qua ảnh, dễ bị lừa khi gặp trực tiếp.
- 💬 **Quy trình giao dịch rời rạc:** Thương lượng qua nhiều kênh (Zalo/Facebook/SĐT), không có lịch sử trao đổi tập trung, không có cơ chế bảo vệ người mua.

**Visual:** 3 icon lớn + số liệu thị trường (VD: "thị trường máy cũ Việt Nam ~1.5 tỷ USD/năm, 60% mua bán qua mạng xã hội").

**Notes (1 phút):**
> "Thị trường mua bán điện thoại cũ ở Việt Nam đang tăng trưởng mạnh, nhưng người tiêu dùng vẫn gặp 3 vấn đề lớn. Thứ nhất là không biết giá nào là hợp lý — cùng một chiếc iPhone 13 có thể được rao 8 triệu hoặc 12 triệu tùy người bán. Thứ hai, tình trạng máy được mô tả chủ quan qua lời người bán, không có cơ sở khoa học. Thứ ba, mọi giao dịch đều mang tính tự phát, không có nền tảng nào đảm bảo quyền lợi hai bên."

---

## 📋 SLIDE 4 — MỤC TIÊU & NHIỆM VỤ

**Tiêu đề:** Mục tiêu nghiên cứu

**Layout:** 2 cột — Mục tiêu (bên trái) & Nhiệm vụ (bên phải)

**Cột Mục tiêu:**

- ✅ Xây dựng nền tảng giao dịch trực tuyến thuận tiện
- ✅ Phát triển hệ thống AI định giá thời gian thực
- ✅ Tích hợp Computer Vision đánh giá tình trạng máy
- ✅ Đảm bảo kết nối hai bên qua Chat Real-time
- ✅ Ứng dụng quy trình phát triển phần mềm hiện đại

**Cột Nhiệm vụ:**

- 🔧 Phân tích thị trường máy cũ
- 🔧 Triển khai AI Agent (LangChain.js) thu thập giá thị trường
- 🔧 Train mô hình YOLOv11 nhận diện model & lỗi ngoại quan
- 🔧 Thiết kế công thức định giá có trọng số
- 🔧 Đóng gói triển khai Docker

**Notes (45s):**
> "Để giải quyết các vấn đề trên, nhóm đặt ra 5 mục tiêu và 5 nhiệm vụ cụ thể. Trọng tâm là xây dựng được một hệ thống mà người dùng chỉ cần upload ảnh máy của họ, AI sẽ tự động nhận diện dòng máy, phát hiện lỗi ngoại quan và đưa ra giá đề xuất khách quan dựa trên dữ liệu thị trường."

---

## 📋 SLIDE 5 — TÍNH MỚI CỦA ĐỀ TÀI

**Tiêu đề:** 3 điểm khác biệt so với các nền tảng hiện có

**Layout:** 3 cột ngang, mỗi cột 1 icon lớn + tên + mô tả ngắn

**Cột 1 — AI Agent thời gian thực:**
- Tác tử thông minh (LangChain.js) tự động crawl giá từ Chợ Tốt, các hội nhóm mạng xã hội
- Cache Redis TTL 24h → P_market được cập nhật hằng ngày

**Cột 2 — Computer Vision tự huấn luyện:**
- Mô hình YOLOv11s self-trained (~1900 ảnh)
- 12 class: 9 thế hệ iPhone + 3 loại lỗi (trầy/nứt vỡ/lỗi màn)
- Cross-check với khai báo người bán → cảnh báo gian lận

**Cột 3 — Hệ sinh thái khép kín:**
- Định giá AI + Chat Real-time + Quản lý tin đăng tích hợp một nền tảng
- Cảnh báo lệch model khi seller khai sai

**Notes (1 phút):**
> "Khác với chotot.com hay các nền tảng rao vặt thông thường, hệ thống của nhóm có 3 điểm mới. Một là dùng AI Agent kết hợp LLM để tự động cập nhật giá thị trường — chứ không để người bán tự khai giá. Hai là dùng mô hình thị giác máy tính do nhóm tự huấn luyện — không phải gọi API có sẵn của Google hay OpenAI. Ba là tích hợp đầy đủ flow từ đăng tin, định giá đến chat trong cùng một nền tảng."

---

## 📋 SLIDE 6 — CÔNG NGHỆ SỬ DỤNG

**Tiêu đề:** Tech Stack

**Layout:** Sơ đồ 4 tầng từ trên xuống

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND:  Next.js 14 (App Router) + TypeScript    │
│             Zustand · Tailwind · shadcn/ui          │
├─────────────────────────────────────────────────────┤
│  BACKEND:   NestJS + TypeScript (strict)            │
│             JWT · OAuth2 · Socket.io · Multer       │
├─────────────────────────────────────────────────────┤
│  AI SERVICES:                                       │
│   • Vision: Python FastAPI + YOLOv11s (self-trained)│
│   • Market: NestJS + LangChain.js Agents            │
├─────────────────────────────────────────────────────┤
│  DATA:     PostgreSQL (Prisma) · MongoDB (Mongoose) │
│            Redis (cache + rate-limit)               │
├─────────────────────────────────────────────────────┤
│  DEPLOY:   Docker Compose · NGINX reverse proxy     │
└─────────────────────────────────────────────────────┘
```

**Notes (1 phút):**
> "Toàn bộ codebase dùng TypeScript strict mode, không có any. Frontend là Next.js App Router để tận dụng Server Components. Backend dùng NestJS — kiến trúc module hóa và Dependency Injection, dễ test, dễ scale. Phần AI tách thành 2 service riêng: service thị giác viết bằng Python FastAPI để chạy YOLO, service market dùng NestJS với LangChain. Toàn bộ deploy bằng Docker Compose."

---

## 📋 SLIDE 7 — POLYGLOT PERSISTENCE

**Tiêu đề:** Vì sao dùng 3 loại database?

**Layout:** 3 cột — mỗi cột 1 database

**Cột PostgreSQL (Prisma ORM):**
- Dữ liệu **có cấu trúc**, cần ACID
- User, Listing, Conversation, Message, PriceHistory, Block
- Type-safe queries, migration version control

**Cột MongoDB (Mongoose ODM):**
- Dữ liệu **phi cấu trúc** từ AI Agent
- `market_price_raw` — dữ liệu crawl thô
- `ai_analysis_log` — nhật ký phân tích YOLO
- Schema linh hoạt, dễ mở rộng

**Cột Redis:**
- **Cache** P_market (TTL 24h, tránh re-query)
- **Rate limiting** cho `/auth/*` (chống brute-force)
- **Session presence** (track admin/user online)

**Notes (45s):**
> "Hệ thống dùng 3 database cho 3 mục đích khác nhau. PostgreSQL cho dữ liệu nghiệp vụ cần đảm bảo tính toàn vẹn. MongoDB cho dữ liệu AI crawl về có cấu trúc linh hoạt. Redis cho cache và rate-limit để bảo vệ hệ thống. Đây là pattern Polyglot Persistence — dùng đúng tool cho đúng việc."

---

## 📋 SLIDE 8 — KIẾN TRÚC HỆ THỐNG

**Tiêu đề:** Sơ đồ tổng quan

**Visual (vẽ trên slide):**

```
        ┌──────────┐
        │   USER   │
        └────┬─────┘
             │
       ┌─────▼──────┐
       │  Next.js   │ (port 3000)
       │  Frontend  │
       └─────┬──────┘
             │ REST + WebSocket
       ┌─────▼──────┐         ┌──────────────┐
       │  NestJS    │◄────────► PostgreSQL   │
       │  Backend   │         │  (Prisma)    │
       │ (port 3001)│         └──────────────┘
       └──┬───┬─────┘
          │   │ HTTP
          │   └────────────┐
     HTTP │                ▼
          │       ┌────────────────┐
          │       │  ai-service    │ (port 3002)
          │       │  LangChain.js  │──► MongoDB
          │       │  Market Agents │──► Redis (cache)
          │       └────────────────┘
          ▼
   ┌──────────────────┐
   │ ai-service-vision│ (port 8000)
   │  FastAPI + YOLO  │
   └──────────────────┘
```

**Notes (1 phút):**
> "Đây là kiến trúc tổng thể. Frontend gọi tới Backend qua REST API và WebSocket. Backend đóng vai trò orchestrator — khi cần định giá, nó gọi song song 2 dịch vụ AI: service Vision viết bằng Python để chạy YOLO, và service Market bằng NestJS để lấy giá thị trường từ cache hoặc crawl mới. Việc tách service AI ra riêng giúp scale độc lập — ví dụ khi cần GPU thì chỉ scale service Vision."

---

## 📋 SLIDE 9 — SƠ ĐỒ PHÂN CẤP CHỨC NĂNG

**Tiêu đề:** Functional Decomposition Diagram (FDD)

**Visual:** Chèn ảnh từ `docs/so-do-phan-cap-chuc-nang.drawio`. Code màu:
- 🟪 Tím — Chức năng AI
- 🟧 Cam — Chức năng Admin
- ⬜ Trắng — Chức năng User chung

**Tổng kết:**
- 14 chức năng cấp 1
- 47 sub-functions cấp 2
- 3 vai trò: Guest / User (Buyer-Seller) / Admin

**Notes (45s):**
> "Hệ thống được phân rã thành 14 chức năng cấp 1, gồm 47 sub-function cấp 2. Em phân loại theo màu — màu tím là các chức năng có AI tham gia, màu cam là chức năng dành riêng cho Admin, còn lại là chức năng chung. Đặc biệt, nhóm User được hợp nhất Buyer và Seller — vì một người có thể vừa mua vừa bán, không cần tách 2 role riêng."

---

## 📋 SLIDE 10 — USER STORY & ĐỘ ƯU TIÊN

**Tiêu đề:** 14 User Story chính

**Layout:** Bảng gọn (cột: ID — Tên — Ngày dự kiến — Ưu tiên)

| ID | User Story | Ngày | Ưu tiên |
|---|---|---|---|
| US01 | Đăng ký tài khoản | 2 | ⭐⭐ |
| US02 | Đăng nhập hệ thống | 2 | ⭐⭐ |
| US06 | **Định giá sản phẩm bằng AI** | 5 | ⭐⭐⭐⭐⭐ |
| US07 | Đăng tin bán máy với giá AI đề xuất | 3 | ⭐⭐⭐⭐⭐ |
| US10 | Chat real-time mua–bán | 4 | ⭐⭐⭐ |
| US12 | Kiểm duyệt + Cảnh báo sai lệch model | 3 | ⭐⭐⭐⭐ |
| US13 | Thống kê biến động giá thị trường | 4 | ⭐⭐⭐ |

*Tổng 14 User Story · 40 ngày phát triển (29/03 → 07/05/2026) · Agile/Scrum*

**Notes (45s):**
> "Nhóm phân rã ra 14 User Story chính, ưu tiên cao nhất là US06 — Định giá bằng AI — vì đây là USP của đề tài. Cả dự án triển khai trong 6 tuần theo mô hình Scrum, mỗi tuần một sprint."

---

## 📋 SLIDE 11 — CƠ CHẾ ĐỊNH GIÁ AI (TỔNG QUAN)

**Tiêu đề:** Pipeline định giá 4 bước

**Visual:** Sơ đồ luồng 4 bước theo chiều ngang

```
[1] Người bán upload ảnh + khai báo
        ↓
[2] AI Agent lấy P_market (Redis cache 24h)
        ↓
[3] YOLOv11 detect generation + damage
        ↓
[4] Pricing Calculator hợp nhất → P_final + range
```

**Output cho người dùng:**
- `P_final` (giá đề xuất)
- `damageBreakdown` (chi tiết khấu hao theo bộ phận)
- `confidenceScore` (độ tin cậy)
- `priceRange [low, high]` = P_final × [0.92, 1.08]
- `modelMismatch` (cảnh báo nếu seller khai sai dòng)

**Notes (1 phút 15s):**
> "Đây là core của hệ thống — pipeline định giá AI 4 bước. Bước 1, người bán upload ảnh và khai báo dung lượng, % pin. Bước 2, AI Agent lấy giá thị trường — ưu tiên đọc từ Redis cache, nếu hết hạn 24h thì trigger crawl mới. Bước 3, mô hình YOLO chạy trên ảnh để phát hiện dòng máy và các lỗi ngoại quan. Bước 4, một calculator tổng hợp tất cả thông tin để ra giá cuối cùng kèm độ tin cậy."

---

## 📋 SLIDE 12 — YOLOv11 — MÔ HÌNH THỊ GIÁC

**Tiêu đề:** Self-trained YOLOv11s — 12 classes

**Layout:** 2 cột

**Cột trái — 9 Generation classes:**
```
gen_6        gen_7_8       gen_x_xs
gen_11       gen_12_13     gen_14
gen_15       gen_16        gen_17
```
*Gom theo "thế hệ thị giác" — vì iPhone 12/13/14 base nhìn giống y hệt nhau từ ảnh, không thể phân biệt.*

**Cột phải — 3 Damage classes:**
```
scratch          → w = 0.05–0.10
physical_damage  → w = 0.25 (nứt + móp)
screen_defect    → w = 0.40 (sọc/chấm màn)
```

**Specs:**
- Training: Google Colab T4 GPU
- Dataset: ~1900 ảnh (Roboflow + Chợ Tốt scrape)
- Inference: Local RTX 3050 4GB (~1.5GB VRAM)
- Target: mAP@50 ≥ 0.70

**Notes (1 phút):**
> "Mô hình YOLO của nhóm có 12 lớp. Điểm thú vị là nhóm không train theo từng model điện thoại cụ thể như 'iPhone 12, iPhone 13, iPhone 14' vì 3 dòng base này nhìn từ ảnh hoàn toàn giống nhau — không có cách nào phân biệt độc lập với người mắt thường. Nhóm gom chúng vào một 'thế hệ thị giác' và dựa vào khai báo của seller để biết chính xác model nào, sau đó cross-check ngược lại."

---

## 📋 SLIDE 13 — CÔNG THỨC ĐỊNH GIÁ

**Tiêu đề:** Pricing Formula

**Layout:** Trung tâm là công thức lớn, xung quanh là bảng trọng số

**Công thức (highlight):**

$$P_{final} = P_{market} \times \prod_{i}(1 - w_i \times d_i)$$

**Bảng trọng số `w_i`:**

| Bộ phận | Weight | Cách lấy `d_i` |
|---|---|---|
| Màn hình | 0.40 | YOLO `screen_defect` |
| Pin | 0.20 | Người bán khai (% sức khỏe) |
| Vỏ máy + nứt vỡ | 0.25 | YOLO `physical_damage` |
| Camera | 0.15 | YOLO + người bán |
| Khác | 0.05 | Mặc định 0 |

**Confidence Score** = f(số mẫu market, độ lệch chuẩn giá, vision confidence, generation match)

**Phạm vi áp dụng:** Từ iPhone X trở lên. Dòng cũ chỉ trả "giá tham khảo".

**Notes (1 phút 15s):**
> "Công thức định giá rất đơn giản nhưng có cơ sở. P_final bằng giá thị trường nhân với tích các hệ số khấu hao — mỗi bộ phận hỏng sẽ giảm giá theo trọng số tương ứng. Màn hình có trọng số cao nhất là 0.4 vì thay màn iPhone tốn 3-5 triệu, ảnh hưởng giá nhiều nhất. Pin trọng số 0.2 — không detect được từ ảnh nên phải hỏi seller. Camera 0.15, vỏ máy 0.25. Đặc biệt nhóm thêm Confidence Score và price range để người dùng biết mức độ tin cậy."

---

## 📋 SLIDE 14 — DEMO: TRANG CHỦ

**Tiêu đề:** Demo — Giao diện trang chủ & tin đăng

**Visual:** Screenshot 2 màn hình (trang chủ + list /listings) đặt cạnh nhau

**Highlight tính năng:**
- Hero banner + tin nổi bật
- Bộ lọc theo dòng máy / giá / tình trạng
- Sidebar brand + filter bar
- Card tin đăng có badge "Đã định giá AI"

**Notes (45s):**
> "Đây là giao diện trang chủ. Người dùng có thể duyệt tin theo dòng máy, lọc theo giá hoặc tình trạng. Mỗi tin đã được AI định giá sẽ có badge tím riêng để phân biệt với tin tự khai giá."

---

## 📋 SLIDE 15 — DEMO: ĐĂNG TIN + ĐỊNH GIÁ AI ⭐

**Tiêu đề:** Flow đăng tin với AI Pricing

**Visual:** 3 screenshot tuần tự (như comic strip):
1. Form upload ảnh + khai báo thông số
2. Loading "AI đang phân tích..." + spinner
3. Result panel: P_final + bounding box + damage breakdown + warning model mismatch (nếu có)

**Highlight (callout):**
- Bounding box màu đỏ trên các vị trí YOLO detect
- Bảng breakdown từng bộ phận
- Confidence score visual
- Cảnh báo "Hệ thống nhận diện máy là iPhone 13, khác khai báo iPhone 14" (anti-fraud)

**Notes (1 phút 30s — slide quan trọng nhất, demo trực tiếp nếu được):**
> "Đây là phần quan trọng nhất — flow đăng tin tích hợp AI định giá. Người bán upload ảnh, khai báo dung lượng và phần trăm pin. Click 'Định giá bằng AI'. Hệ thống chạy YOLO trên ảnh trong khoảng 2-3 giây, đồng thời gọi market service để lấy P_market. Kết quả trả về có 4 phần: giá đề xuất, bounding box phát hiện lỗi, bảng phân tích khấu hao từng bộ phận, và độ tin cậy. Nếu YOLO phát hiện máy không khớp với khai báo của seller, hệ thống sẽ cảnh báo người mua — đây là tính năng anti-fraud."

*(Nếu hội đồng cho phép, mở demo trực tiếp ở bước này.)*

---

## 📋 SLIDE 16 — DEMO: CHAT REAL-TIME

**Tiêu đề:** Chat & Hỗ trợ Real-time

**Visual:** Screenshot 2 màn hình:
1. Dashboard messages — danh sách cuộc trò chuyện
2. Chat window — tin nhắn, typing indicator, ảnh đính kèm

**Highlight:**
- Socket.io WebSocket — độ trễ < 100ms
- Authenticate qua JWT
- Hỗ trợ gửi ảnh, typing indicator, unread badge
- Tính năng "Hỗ trợ" — chat trực tiếp với Admin
- Block / Unblock user vi phạm

**Notes (45s):**
> "Phần chat sử dụng Socket.io — kết nối WebSocket bền vững, mỗi tin nhắn được lưu vào PostgreSQL ngay khi gửi. Người dùng có thể chat với người bán hoặc gửi yêu cầu hỗ trợ trực tiếp tới Admin qua dropdown 'Hỗ trợ' trên header. Nếu gặp người vi phạm, có thể chặn ngay từ trong cuộc trò chuyện."

---

## 📋 SLIDE 17 — DEMO: ADMIN DASHBOARD

**Tiêu đề:** Quản trị viên — KPI & Thống kê

**Visual:** Screenshot admin dashboard với:
- 4 KPI cards (Users / Listings / Active / Revenue)
- Biểu đồ Recharts — Biến động giá theo dòng máy
- Biểu đồ phân bố tin đăng theo trạng thái

**Highlight tính năng Admin:**
- Quản lý người dùng (ban/cấp role)
- Kiểm duyệt tin đăng
- Quản lý danh mục + hệ số khấu hao
- Theo dõi biến động giá thị trường (chart)

**Notes (45s):**
> "Admin dashboard cung cấp các KPI tổng quan, đồng thời có 2 biểu đồ chính: biến động giá theo từng dòng iPhone trong 30 ngày gần nhất, và phân bố tin đăng theo trạng thái DRAFT/ACTIVE/SOLD. Admin có thể duyệt hoặc từ chối tin, cấm tài khoản vi phạm, và điều chỉnh bảng hệ số khấu hao khi thị trường biến động."

---

## 📋 SLIDE 18 — KẾT QUẢ ĐẠT ĐƯỢC

**Tiêu đề:** Những công việc đã làm

**Layout:** 5 thẻ (card), mỗi thẻ 1 icon + 1 dòng kết quả

- ✅ **Hệ thống:** Backend NestJS + Frontend Next.js hoàn chỉnh, TypeScript strict
- 🤖 **AI:** YOLOv11s self-trained 12 class + AI Agent market scraping
- 🎨 **Giao diện:** Tailwind + shadcn/ui, responsive, theme tím chủ đạo
- 💾 **Dữ liệu:** Polyglot — PostgreSQL + MongoDB + Redis
- 📦 **DevOps:** Docker Compose 6 service, NGINX reverse proxy
- 🧪 **Testing:** 17/17 unit test pass, 35 test case AI Pricing

**Số liệu nổi bật:**
- 14/14 User Story hoàn thành (100%)
- 6 service Docker
- 17 unit tests pass
- Latency P95 endpoint định giá: **< 3s**

**Notes (1 phút):**
> "Sau 6 tuần triển khai, nhóm hoàn thành 100% backlog gồm 14 User Story. Toàn bộ 6 service được đóng gói Docker. Đặc biệt phần định giá AI — độ trễ P95 dưới 3 giây cho 1 lần định giá hoàn chỉnh, bao gồm cả lấy giá thị trường, chạy YOLO 4 ảnh và tính toán."

---

## 📋 SLIDE 19 — HẠN CHẾ

**Tiêu đề:** Hạn chế

**Nội dung (5 bullet, không quá chi tiết):**

- 📱 **Phạm vi dataset:** YOLO chỉ hỗ trợ iPhone (9 thế hệ), chưa có Android/Samsung
- 💰 **Phạm vi định giá:** Chỉ áp dụng từ iPhone X trở lên (dòng cũ market data nhiều nhiễu)
- 🔋 **Pin:** Không detect được từ ảnh, phụ thuộc input người bán
- 🌐 **Market scraping:** Giai đoạn báo cáo dùng dữ liệu mẫu có cấu trúc, chưa crawl real-time liên tục (Apify quota + risk block IP)
- 💳 **Giao dịch:** Chưa có thanh toán đảm bảo (escrow), người dùng tự chốt off-platform

**Notes (45s):**
> "Đề tài còn 5 hạn chế. Đáng kể nhất là phạm vi dataset — nhóm chỉ kịp train trên iPhone vì việc thu thập và label dữ liệu Android tốn nhiều thời gian. Thứ hai là pin — không thể phát hiện chai pin từ ảnh nên phải tin vào khai báo của người bán. Thứ ba, hệ thống chưa có cơ chế thanh toán đảm bảo nên người dùng vẫn phải gặp trực tiếp hoặc tự chuyển khoản — đây là rủi ro cần cải tiến."

---

## 📋 SLIDE 20 — HƯỚNG PHÁT TRIỂN

**Tiêu đề:** Hướng phát triển tương lai

**Layout:** 6 item, dạng roadmap timeline

- 🤖 **Q3/2026:** Mở rộng dataset Android (Samsung, Xiaomi, OPPO, vivo)
- 💳 **Q3/2026:** Tích hợp escrow VNPay/Momo — tạm giữ tiền 7 ngày
- 🌐 **Q4/2026:** Triển khai AI Agent market-scraping thực tế với cron + proxy rotation
- 🔋 **Q4/2026:** API cross-check pin/IMEI bên thứ ba (iCheck, CheckPhone)
- 📱 **Q1/2027:** Mobile app React Native (camera native, đa góc)
- 💎 **Q1/2027:** Mở rộng pricing cho iPhone đời cũ (6/7/8) khi đủ dữ liệu sạch

**Notes (1 phút):**
> "Sau khóa luận, nhóm có 6 hướng phát triển. Ưu tiên ngắn hạn là mở rộng dataset sang Android và tích hợp thanh toán đảm bảo — đây là 2 yêu cầu thị trường rõ ràng nhất. Trung hạn là vận hành thực tế AI Agent market-scraping. Dài hạn là phát triển app mobile để tận dụng camera điện thoại chụp ảnh chất lượng cao hơn, giúp mô hình YOLO inference chính xác hơn."

---

## 📋 SLIDE 21 — CẢM ƠN & Q&A

**Layout:** Tối giản, chữ to căn giữa

**Nội dung:**

```
       CẢM ƠN QUÝ THẦY CÔ
       ĐÃ LẮNG NGHE!

       Q&A
```

**Phụ chú nhỏ ở dưới:**
- GitHub: github.com/<team39>/phonemarket
- Demo: phonemarket.vn (nếu deploy)
- Email liên hệ thành viên

**Notes (15s):**
> "Em xin chân thành cảm ơn quý thầy cô đã lắng nghe. Nhóm em xin sẵn sàng tiếp nhận các câu hỏi từ hội đồng."

---

## 🎯 LƯU Ý KHI LÀM SLIDE

### Theme & màu sắc
- **Màu chủ đạo:** Tím `#7c3aed` (đồng bộ với UI PhoneMarket)
- **Màu phụ:** Xám `#64748b`, trắng `#ffffff`
- **Font:** Inter / Nunito Sans / SF Pro (sans-serif, dễ đọc trên màn chiếu)
- **Cỡ chữ:** Tiêu đề ≥ 32pt, body ≥ 20pt — KHÔNG nhỏ hơn 18pt

### Nguyên tắc nội dung
- ❌ **Không** đọc nguyên slide — slide là dàn ý, lời nói là phần chính
- ❌ **Không** viết câu hoàn chỉnh — dùng cụm từ ngắn
- ✅ Một slide = một ý chính
- ✅ Có visual / sơ đồ / screenshot — tránh slide toàn chữ
- ✅ Slide demo (14–17) là quan trọng nhất — chuẩn bị screenshot **chất lượng cao**, hoặc record video demo 1–2 phút phòng khi mạng / server lỗi

### Phân chia thời gian (20 phút)
| Slide | Phút | Cumulative |
|---|---|---|
| 1–2 (Bìa, Mục lục) | 1' | 1' |
| 3 (Lý do) | 1.5' | 2.5' |
| 4–5 (Mục tiêu + Tính mới) | 2' | 4.5' |
| 6–8 (Tech + Kiến trúc) | 3' | 7.5' |
| 9–10 (FDD + User Story) | 1.5' | 9' |
| 11–13 (AI Pricing — CORE) | 4' | 13' |
| 14–17 (Demo) | 4' | 17' |
| 18–20 (Kết quả + Hạn chế + Hướng PT) | 2.5' | 19.5' |
| 21 (Cảm ơn) | 0.5' | 20' |

### Câu hỏi hội đồng có thể hỏi — chuẩn bị trước
1. **Vì sao dùng YOLO mà không dùng Gemini Vision API trực tiếp?**
   → "Gemini có sycophancy — nó tin theo lời seller khai báo. Nhóm cần mô hình kiểm chứng độc lập từ ảnh, nên phải tự train."
2. **Dataset 1900 ảnh có đủ không?**
   → "Đủ cho phạm vi 12 class và iPhone. Để mở rộng sang Android cần ~5000 ảnh nữa — đó là hướng phát triển."
3. **Vì sao gom iPhone 12/13/14 chung 1 class?**
   → "Vì 3 dòng base này có thiết kế ngoại quan giống y hệt nhau — chỉ khác cụm camera và một số chi tiết nhỏ. Train tách ra sẽ confuse model, accuracy giảm."
4. **Hệ thống có scale được không?**
   → "Có. Mỗi service tách riêng container — có thể scale horizontal độc lập. Database hỗ trợ replication. Redis làm cache buffer."
5. **Bảo mật ra sao?**
   → "JWT access token 15 phút + refresh token 7 ngày. Rate limit Redis cho auth endpoints. CORS chỉ cho frontend domain. Password bcrypt 10 rounds."

---

**File này được sinh ra dựa trên `docs/BaoCaoTomTat.docx` và `CLAUDE.md`. Đường dẫn: `docs/noi-dung-slide.md`.**
