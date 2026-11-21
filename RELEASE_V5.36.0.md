# V5.36.0 — Tự xóa tài khoản và sao lưu tự động

## Thay đổi
- **Xóa tài khoản** (Dữ liệu → Tài khoản → Xóa tài khoản): gửi mã xác nhận tới email của tài khoản, nhập mã và gõ `XÓA TÀI KHOẢN` (có hoặc không dấu), bấm **Xóa vĩnh viễn tài khoản**. Tài khoản Auth và toàn bộ dữ liệu trên máy chủ bị xóa trong một transaction; trình duyệt đăng xuất và báo đã xóa.
- Máy chủ (RPC `delete_own_account`, migration `20261121000100`) chỉ xóa chính tài khoản đang đăng nhập và chỉ khi vừa xác thực mã email trong 10 phút; mã sai, mã cũ, phiên đổi hoặc lỗi mạng đều báo rõ "tài khoản chưa bị xóa".
- **Sao lưu tự động hằng ngày** (`db-backup.yml`): dữ liệu ứng dụng + `auth.users`/`auth.identities` → mã hóa age → artifact GitHub 35 ngày. Tắt cho tới khi owner đặt khóa và secrets.
- Mục Dữ liệu tài khoản: thay câu "chưa có nút tự xóa" bằng hướng dẫn tự xóa.
- Tài liệu owner: [docs/ACCOUNT_OPERATIONS.md](docs/ACCOUNT_OPERATIONS.md) — giới hạn đăng ký/OTP, cài SQL, cấu hình sao lưu, khôi phục.

## Owner cần làm
1. Cài [`supabase/manual/staging_upgrade_20261121000100.sql`](supabase/manual/staging_upgrade_20261121000100.sql) trong SQL Editor (kết quả `INSTALLED`). Trước đó nút xóa báo máy chủ chưa sẵn sàng, không xóa gì.
2. Đặt Rate Limits; không bật CAPTCHA.
3. Tạo khóa age, thêm secrets `SUPABASE_DB_URL`, `BACKUP_AGE_RECIPIENT`, biến `BACKUP_ENABLED=true`, chạy thử workflow.

## Không đổi
Bảng, RLS, RPC đồng bộ, IndexedDB 3, 18 khóa localStorage, dependency frontend. Cấu hình Supabase local cho CI: `email_sent` 20 → 40/giờ (đủ email cho thêm ca xóa tài khoản).

## Kiểm chứng và giới hạn
pgTAP 009 (26 ca) và toàn bộ 001–008 chạy trên PostgreSQL 16 cục bộ với fixture Auth; CI backend chạy trên Supabase local (GoTrue thật). Real-Auth browser Chromium + WebKit: xóa bằng mã thứ hai, DB không còn user/dòng. Sao lưu: script chạy trên Supabase local trong CI; diễn tập khôi phục chỉ trên PostgreSQL 16 cục bộ, **chưa** trên Supabase thật. Chưa QA thiết bị thật. App/assets/PWA `5.36.0` (`pickleup-shell-v5-36-0-stable`); test nâng cấp xóa cache 5.35.0.
