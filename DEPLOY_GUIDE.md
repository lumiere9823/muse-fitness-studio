# HƯỚNG DẪN DEPLOY TOÀN DIỆN (MIỄN PHÍ 100%)
**Muse Fitness Studio — Cloudflare & Vercel / Render**

Toàn bộ hệ thống hiện đã sẵn sàng 100% để chạy trên đám mây mà không mất bất kỳ chi phí duy trì hàng tháng nào.

---

## CÁCH 1: DEPLOY 1-CLICK TRÊN VERCEL + CLOUDFLARE DNS (KHUYÊN DÙNG - DỄ NHẤT)
*Toàn bộ Website + Admin Dashboard + Backend API + Telegram Bot chạy chung một nơi cực kỳ mượt mà.*

### Bước 1: Đẩy mã nguồn lên GitHub
1. Mở Terminal tại thư mục dự án và tạo Git repository:
   ```bash
   git init
   git add .
   git commit -m "Muse Studio complete system"
   ```
2. Tạo một Repository mới trên GitHub (chế độ **Private** để bảo mật file `.env`) và đẩy code lên:
   ```bash
   git remote add origin https://github.com/username/ten-repo-cua-ban.git
   git branch -M main
   git push -u origin main
   ```

### Bước 2: Import vào Vercel (Miễn phí)
1. Đăng nhập [vercel.com](https://vercel.com) (bằng tài khoản GitHub).
2. Bấm **"Add New..."** ➔ **"Project"** ➔ Chọn repository bạn vừa đẩy lên.
3. Tại mục **Environment Variables**, sao chép các biến từ file `.env` vào:
   * `SUPABASE_URL`
   * `SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `CLOUDINARY_CLOUD_NAME`
   * `CLOUDINARY_API_KEY`
   * `CLOUDINARY_API_SECRET`
   * `TELEGRAM_BOT_TOKEN`
   * `TELEGRAM_CHAT_ID`
   * `LIVE_SITE_ORIGIN` (điền tên miền của bạn hoặc để mặc định)
4. Bấm **"Deploy"**. Chỉ mất khoảng 1 phút, bạn sẽ có link chính thức (vd: `https://muse-fitness-studio.vercel.app`).
5. Vào **Project Settings ➔ Domains** trên Vercel để thêm tên miền riêng `musefitnessstudio.com`.

---

## CÁCH 2: DEPLOY TRÊN CLOUDFLARE PAGES (FRONTEND) + VERCEL (API)
*Dành cho bạn muốn tận dụng hạ tầng CDN Cloudflare tối đa.*

### Bước 1: Deploy Frontend lên Cloudflare Pages
1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) ➔ Chọn **Workers & Pages** ➔ **Create application** ➔ Tab **Pages** ➔ **Connect to Git**.
2. Chọn repository GitHub của bạn.
3. Cấu hình:
   * **Framework preset:** `None`
   * **Build command:** Để trống
   * **Build output directory:** Để trống (hoặc `.`)
4. Bấm **Save and Deploy**. Cloudflare sẽ tạo cho bạn link `https://xxx.pages.dev`.

### Bước 2: Nối API Backend qua file `_redirects`
File [`_redirects`](file:///d:/musefitnessstudio/musefitnessstudio.com/_redirects) đã được tạo sẵn trong thư mục dự án. Bạn chỉ cần sửa URL backend Vercel vào:
```text
/api/*  https://muse-api.vercel.app/api/:splat  200
```
Mọi truy cập gọi API hay form đăng ký từ website Cloudflare sẽ tự động chuyển tiếp tới backend mà không bao giờ gặp lỗi CORS!

---

## TỔNG KẾT CHI PHÍ HÀNG THÁNG CỦA HỆ THỐNG
| Dịch vụ | Mục đích | Chi phí |
| :--- | :--- | :--- |
| **Cloudflare Pages / Vercel** | Máy chủ Web, Admin & Backend API | **0 đ** (Gói Free trọn đời) |
| **Supabase** | Cơ sở dữ liệu PostgreSQL | **0 đ** (Gói Free 500MB) |
| **Cloudinary** | Lưu trữ & CDN nén WebP 60 ảnh | **0 đ** (Gói Free 25GB/tháng) |
| **Telegram Bot** | Bắn tin nhắn chuông tức thì khi có lead | **0 đ** (Miễn phí vĩnh viễn) |
| **Tổng cộng** | | **0 VNĐ / tháng** |
