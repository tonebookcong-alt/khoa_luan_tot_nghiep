# RÀ SOÁT FILE SLIDE — ĐỀ XUẤT ẢNH & CHỈNH SỬA

> File slide: `docs/Phan-Mem-Mua-Ban-Trao-DJoi-DJien-Thoai-Tich-Hop-AI-Ho-Tro-DJinh-Gia-San-Pham.pptx`
> Đã đọc 19/19 slide + extract toàn bộ ảnh embed để đánh giá.

---

## 🚨 CẢNH BÁO CHUNG — VẤN ĐỀ NGHIÊM TRỌNG

File slide hiện đang **dùng nhiều ảnh AI-generated** (Canva/Bing AI/Midjourney) làm placeholder. Các ảnh này có **chữ vô nghĩa** ("Hogft Sama", "Mony's", "Stadess Voman", "YOLOV11" sai chính tả thành "YOLOV1") — **hội đồng sẽ thấy ngay** và đánh giá thiếu chuyên nghiệp.

**Bắt buộc thay** trước khi nộp:
- 🔴 Slide 12 (YOLOv11) — đang dùng minh họa AI có chữ "YOLOV1" sai
- 🔴 Slide 14 (Demo trang chủ) — đang dùng mockup AI giả chứ không phải UI thật
- 🔴 Slide 16 (Chat + Admin) — đang dùng tranh minh họa AI

**Tài sản có sẵn** trong `docs/damage-model-artifacts/` mà bạn ĐANG KHÔNG dùng:
- ✅ `val_batch0_pred.jpg` (564 KB) — 16 ảnh thật YOLO predict có bounding box "scratch 0.6", "physical_damage 0.8" → quá hợp slide 12
- ✅ `confusion_matrix.png` — bảng confusion matrix thật của model damage
- ✅ `results.png` — biểu đồ training curves (loss + mAP)
- ✅ `BoxF1_curve.png`, `BoxPR_curve.png` — Precision–Recall curve
- ✅ `database-erd.drawio` — ERD đã có, chỉ cần export PNG

---

## 📊 BẢNG TÓM TẮT TRẠNG THÁI 19 SLIDE

Ký hiệu: ✅ ổn · ⚠️ cần điều chỉnh nhỏ · 🔴 bắt buộc sửa

| # | Tiêu đề | Trạng thái | Ảnh hiện có | Hành động |
|---|---|---|---|---|
| 1 | Bìa | ✅ | Banner AI bên phải (3.9 MB) | Giữ — ảnh trang trí OK |
| 2 | Mục lục | ✅ | Không ảnh | Giữ |
| 3 | Vấn đề thị trường | ✅ | Banner AI bên phải (6.3 MB) | Giữ |
| 4 | Mục tiêu & Nhiệm vụ | ⚠️ | Không ảnh | **Bổ sung 2 icon nhỏ** (target, checklist) |
| 5 | 3 tính mới | ⚠️ | Banner AI trái + 3 icon | OK nhưng icon nên rõ hơn |
| 6 | Tech Stack | ✅ | 4 icon nhỏ (5KB mỗi cái) | Giữ |
| 7 | Polyglot Persistence | ⚠️ | Hầu hết icon thiếu | **Bổ sung logo PostgreSQL/MongoDB/Redis** |
| 8 | Kiến trúc hệ thống | 🔴 | Sơ đồ AI tự sinh KHÔNG khớp tech stack thật | **Thay bằng sơ đồ vẽ tay** (xem mẫu bên dưới) |
| 9 | FDD + User Story | ⚠️ | Chỉ chữ + bảng | **Chèn ảnh FDD diagram** (cần export từ drawio) |
| 10 | Pipeline 4 bước (intro) | ✅ | Banner AI trái (5.3 MB) | Giữ |
| 11 | 4-step pipeline | ⚠️ | 4 icon circle (Upload/DB/Camera/Calc) | **Thêm nhãn rõ** dưới mỗi icon |
| 12 | YOLOv11 12 class | 🔴 | Minh họa AI tay cầm điện thoại "YOLOV1" | **Thay bằng `val_batch0_pred.jpg`** |
| 13 | Công thức định giá | ✅ | Banner thanh ngang + dấu chấm tròn | Giữ |
| 14 | Demo trang chủ | 🔴🔴 | 2 mockup AI có chữ giả "Hogft Sama"... | **Bắt buộc chụp UI thật** |
| 15 | Demo đăng tin + AI | 🔴 | Banner AI trái + 3 icon nhỏ | **Bắt buộc chụp flow định giá thật** |
| 16 | Chat + Admin | 🔴 | Tranh minh họa AI 2 màn hình giả | **Bắt buộc chụp UI thật** |
| 17 | Kết quả | ✅ | Banner AI phải + 4 icon | Giữ |
| 18 | Hạn chế | ✅ | Banner AI trái | Giữ — nhưng có thể chèn thêm `confusion_matrix.png` để minh chứng vì sao model còn hạn chế |
| 19 | Hướng phát triển + Cảm ơn | ✅ | Không ảnh | Giữ |

---

## 🎯 HÀNH ĐỘNG CHI TIẾT THEO TỪNG SLIDE CẦN SỬA

### 🔴 Slide 8 — Kiến trúc hệ thống

**Vấn đề:**
Sơ đồ AI tự sinh chỉ có cụm tròn liên kết, **không thể hiện rõ**:
- Hướng dữ liệu (REST vs WebSocket)
- Port số (3000/3001/3002/8000)
- Vai trò orchestrator của Backend

**Giải pháp — vẽ lại sơ đồ trong PowerPoint (5 phút):**

```
Layout vẽ lại bằng SmartArt hoặc shape rectangles:

┌──────────┐
│  USER    │ ─── HTTP/WS ────┐
└──────────┘                  │
                              ▼
                    ┌──────────────────┐
                    │  FRONTEND        │ port 3000
                    │  Next.js + TS    │
                    └────────┬─────────┘
                             │ REST + WebSocket
                             ▼
                    ┌──────────────────┐
                    │  BACKEND         │ port 3001
                    │  NestJS          │◄──► PostgreSQL
                    │  (Orchestrator)  │     (Prisma)
                    └─┬───────────┬────┘
                      │ HTTP      │ HTTP
                      ▼           ▼
            ┌────────────┐  ┌──────────────┐
            │ AI-VISION  │  │  AI-MARKET   │ port 3002
            │ FastAPI    │  │  NestJS      │
            │ YOLOv11    │  │  LangChain   │──► MongoDB
            │ port 8000  │  └──────┬───────┘    + Redis
            └────────────┘         │
                                   ▼
                              [Chợ Tốt, FB groups]
```

**Cách làm trong PowerPoint:**
1. Xóa ảnh hiện tại (Image 1, Image 2 trong slide 8)
2. Insert → SmartArt → "Process" → "Continuous Cycle" hoặc "Hierarchy"
3. Hoặc đơn giản hơn: dùng `Insert → Shape → Rectangle`, mỗi service 1 hộp, dùng arrow nối
4. Màu: tím `#7c3aed` cho hộp Backend (trung tâm), xám `#64748b` cho viền

---

### 🔴 Slide 11 — Pipeline 4 bước

**Vấn đề:** 4 icon hình tròn nhưng **nhãn dưới icon chỉ là số**, chữ "Tải ảnh & Thông số", "Lấy P_market"... đặt ở chỗ khác khiến khó đọc.

**Sửa nhanh:**
- Đặt **nhãn ngay dưới mỗi icon** thay vì rải rác
- Thứ tự đúng từ trái sang phải:
  1. **Upload** (icon 📤) → "Người bán upload ảnh + khai báo Pin/Dung lượng"
  2. **P_market** (icon 💾) → "AI Agent lấy giá thị trường (Redis cache 24h)"
  3. **YOLO** (icon 📷) → "YOLOv11 detect generation + damage"
  4. **Calculate** (icon 🧮) → "Pricing Calculator → P_final + range"

---

### 🔴 Slide 12 — YOLOv11

**Vấn đề:** Ảnh hiện là **minh họa AI hand-drawn** vẽ một tay cầm iPhone với chữ "YOLOV1" và "SKAGSK" nhảm. **Hội đồng sẽ thắc mắc ngay**.

**Hành động:**
1. **Xóa Image 0 (4.4 MB)** ở slide 12
2. **Chèn `docs/damage-model-artifacts/val_batch0_pred.jpg`** — đây là kết quả thật từ training, có 16 ảnh điện thoại thật với bounding box xanh kèm label "scratch 0.6", "physical_damage 0.8"

**Nội dung text giữ nguyên** — phần text mô tả 9 generation + 3 damage class đã đầy đủ.

**Bổ sung (tùy chọn):** Thêm slide phụ "Metric đánh giá model" chèn `confusion_matrix.png` + `results.png` để minh chứng số liệu.

---

### 🔴🔴 Slide 14 — Demo trang chủ — VẤN ĐỀ NẶNG

**Vấn đề:** Cả 2 ảnh (Image 0 và Image 1, mỗi cái 1.1 MB) là **mockup AI-generated** với chữ giả như:
- "Hogft Sama Noiru Hone"
- "AB Stade: Voman + Hoo Shamuh Wer"
- "Mony's Hay", "Stadess Tier"

Nếu giáo viên zoom vào → **phát hiện ngay đây là ảnh giả**, mất uy tín.

**BẮT BUỘC làm:**

Mở trình duyệt → `http://localhost:3000` → chụp 2 màn hình thật:

1. **Trang chủ** (đường dẫn `/`):
   - Resolution: 1920x1080 hoặc 1440x900
   - Crop về tỷ lệ 16:10
   - Đảm bảo hero banner + ít nhất 3 card tin nổi bật hiển thị

2. **Trang danh sách tin đăng** (`/listings`):
   - Sidebar bộ lọc bên trái mở rộng
   - Hiển thị filter bar, brand sidebar, list card

**Cách chụp đẹp:**
- Mở F12 → toggle device toolbar → chọn "Responsive" với 1440x900
- Hoặc dùng Windows Snip & Sketch (Win+Shift+S)
- Lưu vào `docs/screenshots/01-homepage.png` và `02-listings.png`

---

### 🔴 Slide 15 — Đăng tin + AI Pricing — SLIDE QUAN TRỌNG NHẤT

**Vấn đề:** Đang là banner trang trí AI + 3 icon nhỏ. **Không có bằng chứng UI thật**.

**BẮT BUỘC:** Slide này là **CORE demo** — phải có 3 screenshot tuần tự:

1. **Form upload** (`/listings/create`):
   - Khu vực drop ảnh
   - Form khai báo: dung lượng (256GB), Pin %, mô tả
   - Nút "Định giá bằng AI" tím nổi bật

2. **Loading state** (chụp khi vừa click):
   - Spinner + dòng chữ "AI đang phân tích..."
   - Có thể không cần screenshot riêng, dùng đè annotation

3. **Result panel** — quan trọng nhất:
   - Bounding box hiển thị trên ảnh đã upload (đỏ/xanh quanh vết trầy)
   - Số liệu P_final lớn
   - Bảng damage breakdown từng bộ phận
   - Cảnh báo "Hệ thống nhận diện máy là X, khác khai báo" (nếu test trường hợp mismatch)
   - Confidence score visual

**Lưu vào `docs/screenshots/03-upload-form.png`, `04-ai-result.png`, `05-fraud-warning.png`**

---

### 🔴 Slide 16 — Chat + Admin — VẤN ĐỀ NẶNG

**Vấn đề:** Đang dùng **tranh minh họa AI cartoon** vẽ 2 màn hình giả, không phải UI thật.

**BẮT BUỘC chụp:**

1. **Chat window** (`/dashboard/messages/:id`):
   - Khung chat hiển thị 4–5 tin nhắn 2 chiều
   - Có gửi ảnh đính kèm (test gửi 1 ảnh điện thoại)
   - Typing indicator (nếu được)
   - Sidebar danh sách cuộc trò chuyện bên trái

2. **Admin dashboard** (`/admin/dashboard`):
   - 4 KPI cards trên cùng
   - Biểu đồ Recharts biến động giá
   - Biểu đồ phân bố tin theo trạng thái

**Lưu vào `docs/screenshots/06-chat.png`, `07-admin-dashboard.png`**

---

## ⚠️ HÀNH ĐỘNG CHI TIẾT THEO TỪNG SLIDE CHỈ CẦN ĐIỀU CHỈNH NHẸ

### Slide 7 — Polyglot Persistence
**Thiếu:** Logo 3 database
**Giải pháp:** Download 3 logo PNG transparent:
- PostgreSQL: https://www.postgresql.org/media/img/about/press/elephant.png
- MongoDB: https://www.mongodb.com/assets/images/global/leaf.png
- Redis: https://redis.io/wp-content/uploads/2024/04/Logotype.svg

Chèn mỗi logo vào header của 3 cột tương ứng.

### Slide 9 — Functional Decomposition
**Thiếu:** Sơ đồ FDD trực quan
**Giải pháp:**
- Nếu có file `docs/so-do-phan-cap-chuc-nang.drawio` (đã đề cập trong session summary):
  - Mở bằng draw.io
  - File → Export as → PNG → Tải về
  - Chèn vào slide 9 thay cho bảng chữ
- Nếu chưa có: Insert → SmartArt → "Hierarchy" → vẽ 3 nhánh (Guest / User / Admin) với 14 chức năng

### Slide 18 — Hạn chế (tùy chọn)
**Có thể cải thiện:** Chèn `confusion_matrix.png` (đã có sẵn) để minh chứng vì sao model còn nhầm physical_damage với scratch.

Đặt ảnh nhỏ ở góc dưới phải làm "evidence" — slide sẽ thuyết phục hơn.

---

## 📁 ẢNH CÓ SẴN CẦN DÙNG NGAY (không cần chụp thêm)

| Đường dẫn | Dung lượng | Slide đề xuất | Nội dung |
|---|---|---|---|
| `docs/damage-model-artifacts/val_batch0_pred.jpg` | 564 KB | **Slide 12** | 16 ảnh điện thoại thật + bounding box YOLO |
| `docs/damage-model-artifacts/val_batch1_pred.jpg` | 641 KB | Slide 12 backup | Tương tự, dùng nếu val_batch0 đã chèn |
| `docs/damage-model-artifacts/confusion_matrix.png` | 145 KB | **Slide 18** (Hạn chế) | Confusion matrix model damage |
| `docs/damage-model-artifacts/results.png` | 278 KB | Slide 12 phụ | Training curves (loss + mAP) |
| `docs/damage-model-artifacts/BoxF1_curve.png` | 180 KB | Slide 12 phụ | F1 score curve |
| `docs/damage-model-artifacts/BoxPR_curve.png` | 154 KB | Slide 12 phụ | Precision–Recall curve |
| `docs/database-erd.drawio` | 73 KB | Tạo slide CSDL phụ | ERD — cần export PNG từ draw.io |

---

## 📷 ẢNH CẦN BẠN CHỤP/TẠO (CHECKLIST)

Tạo thư mục `docs/screenshots/` rồi chụp lần lượt:

- [ ] `01-homepage.png` — Trang chủ `/`
- [ ] `02-listings.png` — Trang `/listings` có filter bar + brand sidebar
- [ ] `03-listing-detail.png` — Trang `/listings/[id]` chi tiết
- [ ] `04-create-form.png` — Form `/listings/create` đăng tin
- [ ] `05-ai-result.png` — **QUAN TRỌNG** kết quả AI định giá + bounding box
- [ ] `06-fraud-warning.png` — Cảnh báo model mismatch (nếu test được)
- [ ] `07-chat.png` — Chat real-time có tin nhắn + ảnh đính kèm
- [ ] `08-admin-dashboard.png` — Admin KPI + biểu đồ
- [ ] `09-admin-listings.png` — Trang admin duyệt tin
- [ ] `10-fdd-diagram.png` — Export từ `so-do-phan-cap-chuc-nang.drawio`
- [ ] `11-erd.png` — Export từ `database-erd.drawio`

**Cách chụp đẹp:**
- Dùng Chrome DevTools (F12) → toggle device → "Responsive" 1440×900
- Hoặc Win+Shift+S, chọn vùng cần
- Đảm bảo có data thật (login bằng tài khoản seeder, có ít nhất 5–10 tin đăng test)

---

## 🔧 CHI TIẾT KỸ THUẬT NỘI DUNG TEXT CẦN SỬA

Đọc qua text 19 slide, có **2 lỗi text** nhỏ cần đính chính:

### Slide 9
- Đang ghi: "14 User Story · 40 ngày · Agile/Scrum"
- **Cần sửa:** 40 ngày = **6 tuần** — nhất quán với báo cáo BaoCaoTomTat đã update.

### Slide 17 — KPI
Số liệu hiện tại: 14 / 6 / 17 / <3s
- Verify lại: **17 unit tests pass** — đảm bảo đây là số đúng từ session summary
- **Bổ sung:** "35 testcase AI Pricing" để khớp với session work gần đây (DATA/REASON/EXPLAIN/PERF)

### Toàn slide
- Đảm bảo dùng nhất quán **"YOLOv11s"** (có chữ "s" — small variant), không phải "YOLOV1" hay "YOLOv11"

---

## 🎨 KHUYẾN NGHỊ THIẾT KẾ

### Theme nhất quán
- Slide hiện tại pha trộn: ảnh banner màu xanh (slide 1, 3, 10, 15, 17) + sơ đồ màu xanh (slide 8) — **không khớp** màu UI thật (tím `#7c3aed`)
- Lựa chọn 1: **Đổi tất cả banner sang gradient tím** đồng bộ với theme PhoneMarket
- Lựa chọn 2: Giữ banner xanh hiện tại nhưng **đảm bảo screenshot UI tím** xuất hiện ở slide demo để tạo "moment reveal"

### Font
- Slide có vẻ dùng font mặc định Calibri — OK nhưng nếu có time, đổi sang **Inter** hoặc **Be Vietnam Pro** sẽ chuyên nghiệp hơn

### Animation
- KHÔNG dùng transition lóa mắt (Spin, Bounce)
- Chỉ dùng **Fade** hoặc **Push** cho chuyển slide
- Cho slide 11 (Pipeline 4 bước): có thể dùng **animation appear theo thứ tự** để bước nào sáng lên khi bạn nói tới bước đó

---

## ✅ TÓM TẮT 5 VIỆC CẦN LÀM (theo thứ tự ưu tiên)

1. **🔴 Chụp 11 screenshot UI thật** vào `docs/screenshots/` (mất ~30 phút)
2. **🔴 Thay ảnh giả slide 12** bằng `val_batch0_pred.jpg` (mất 1 phút)
3. **🔴 Vẽ lại sơ đồ kiến trúc slide 8** bằng SmartArt (mất ~10 phút)
4. **⚠️ Bổ sung confusion_matrix slide 18** (mất 2 phút)
5. **⚠️ Đính chính 2 lỗi text** (40 ngày → 6 tuần, bổ sung "35 testcase AI")

**Tổng thời gian ước tính:** ~1 giờ. Đây là khoản đầu tư cần thiết để tránh việc hội đồng phát hiện ảnh AI giả mạo.

---

*File này được sinh từ việc phân tích 19 slide trong `Phan-Mem-Mua-Ban-Trao-DJoi-DJien-Thoai-Tich-Hop-AI-Ho-Tro-DJinh-Gia-San-Pham.pptx` và đối chiếu với asset có sẵn trong `docs/damage-model-artifacts/`.*
