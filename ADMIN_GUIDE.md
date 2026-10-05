# Hướng Dẫn Vận Hành Hệ Thống Quản Trị (Admin Dashboard & CRM/CMS)
**Muse Fitness Studio**

---

## 1. Khởi động Hệ thống

Tại thư mục dự án, chạy lệnh:
```bash
npm start
```
Hoặc chế độ phát triển (tự động reload khi sửa code):
```bash
npm run dev
```

Sau khi khởi động thành công, hệ thống sẽ mở các cổng:
* 🌐 **Website Landing Page:** `http://localhost:3000`
* 👑 **Trang Quản Trị (Admin Dashboard):** `http://localhost:3000/admin`
* 🔌 **REST API Backend:** `http://localhost:3000/api`

---

## 2. Thông tin Đăng nhập Quản Trị

* **Đường dẫn:** `http://localhost:3000/admin`
* **Tài khoản:** `admin`
* **Mật khẩu:** `muse123456`
*(Được mã hóa an toàn bằng bcrypt trong cơ sở dữ liệu SQLite)*

---

## 3. Các Phân hệ Chức năng Đã Triển khai

### Phân hệ 1: Tổng quan Studio (Dashboard Analytics)
* **4 Thẻ chỉ số quan trọng (KPIs):**
  * **Tổng khách đăng ký:** Thống kê toàn bộ khách từ website và các chiến dịch quảng cáo.
  * **Lead hôm nay:** Số lượng khách vừa điền form trong ngày.
  * **Khách đã đến tập trải nghiệm:** Theo dõi tỷ lệ có mặt thực tế tại phòng tập.
  * **Tỷ lệ chốt gói:** Tỷ lệ % khách hàng mua gói tập thành công.
* **Biểu đồ phân bổ:**
  * Theo 3 chi nhánh: Hoàng Văn Thụ, Lê Đức Thọ, Nguyễn Thị Thập.
  * Theo nguồn tiếp thị: TikTok Ads, Facebook Ads, Google Search, Direct website.
* **Danh sách khách mới cần gọi gấp:** Hiển thị 5 khách gần nhất kèm nút xem chi tiết.

### Phân hệ 2: CRM Khách hàng & Quản lý Leads (Chống thất thoát khách)
* **Tiếp nhận lead tự động:** Tương thích 100% với form đăng ký tại `signup.html` qua endpoint `/api/lead`.
* **Bộ lọc thông minh:** Lọc theo chi nhánh, trạng thái xử lý, tìm kiếm nhanh theo Họ tên / SĐT / Email.
* **Quy trình 6 bước chăm sóc khách hàng:**
  1. `Mới tiếp nhận`
  2. `Đang liên hệ`
  3. `Đã hẹn tập thử`
  4. `Đã đến tập`
  5. `Đã chốt gói`
  6. `Huỷ / Không nghe máy`
* **Đổi trạng thái nhanh:** Chọn trực tiếp từ dropdown trên bảng danh sách.
* **Chi tiết & Nhật ký tư vấn:** Ghi chép lịch sử cuộc gọi, nhu cầu của học viên.
* **Tiếp nhận khách thủ công:** Dành cho lễ tân nhận khách vãng lai hoặc qua hotline `1900 299 991`.
* **Xuất file Excel/CSV:** Nút bấm 1 click tải file `leads_muse_fitness.csv` chuẩn mã hóa UTF-8 để làm báo cáo.

### Phân hệ 3: Lịch tập Cố định (Class Schedules)
* Thêm / Sửa / Xóa các lớp tập theo:
  * Chi nhánh (Hoàng Văn Thụ, Lê Đức Thọ, Nguyễn Thị Thập).
  * Khung giờ (Sáng 06:30–07:30, Sáng 10:00–11:00, Chiều, Tối...).
  * Bộ môn (Boxing Fit, Bodyweight–Kettlebell, Yoga & Mobility).
  * Level 1 (Người mới) hoặc Level 2 (Nâng cao).
  * Huấn luyện viên phụ trách và mô tả chi tiết.

### Phân hệ 4: Quản lý Huấn luyện viên (Coaches)
* Thêm / Sửa / Xóa thông tin Huấn luyện viên.
* Cập nhật ảnh đại diện, chức danh, tag chuyên môn, danh sách kỹ năng nổi bật.

### Phân hệ 5: Quản lý Chi nhánh (Branches)
* Quản lý địa chỉ, hotline, giờ hoạt động, bản đồ Google Maps và hình ảnh cơ sở vật chất của 3 cơ sở Muse.

### Phân hệ 6: Quản lý Bảng giá & Gói tập (Pricing)
* Quản lý gói Only Gym, Platinum, Ruby, Khóa Hành Trình 9 Tuần.
* Cập nhật giá niêm yết, quyền lợi, gắn huy hiệu "Nổi bật / Best Seller".

### Phân hệ 7: Quản lý Tin tức & Cẩm nang (Blog CMS)
* Thêm / Quản lý bài viết chia sẻ về dinh dưỡng, tập luyện và phục hồi.

### Phân hệ 8: Cài đặt Hệ thống & Telegram Bot Alert
* **Tích hợp Telegram Bot:**
  * Điền **Telegram Bot Token** và **Telegram Chat ID** của nhóm Zalo/Telegram Lễ tân.
  * Khi có khách điền form trên website, hệ thống sẽ **bắn tin nhắn báo chuông ngay lập tức** tới điện thoại của nhân viên tư vấn.
  * Có nút **Kiểm tra kết nối (Gửi tin thử)** trực tiếp từ màn hình Admin.

---

## 4. Cấu trúc Thư mục

```
d:/musefitnessstudio/musefitnessstudio.com/
├── admin/                         # Giao diện Trang Quản trị
│   ├── index.html                 # Layout Admin Dashboard
│   ├── admin.css                  # Giao diện phong cách Muse Luxury
│   └── admin.js                   # Logic điều khiển & gọi API
├── server/                        # Backend REST API
│   ├── server.js                  # Entry point Express Server
│   ├── db.js                      # Database SQLite & Seed dữ liệu mẫu
│   ├── routes/                    # API Endpoints
│   │   ├── auth.js                # Đăng nhập & JWT token
│   │   ├── leads.js               # Tiếp nhận lead & CRM
│   │   ├── stats.js               # Thống kê KPIs dashboard
│   │   ├── schedules.js           # Lịch tập
│   │   ├── coaches.js             # Huấn luyện viên
│   │   ├── branches.js            # Chi nhánh
│   │   ├── pricing.js             # Bảng giá
│   │   ├── blogs.js               # Tin tức
│   │   ├── settings.js            # Cấu hình studio & Bot
│   │   └── upload.js              # Upload hình ảnh
│   └── services/
│       └── telegram.js            # Service bắn tin nhắn Telegram tức thì
├── data/
│   └── muse.sqlite                # Cơ sở dữ liệu SQLite
├── assets/                        # Hình ảnh & Media
└── *.html                         # Landing pages hiện tại
```
