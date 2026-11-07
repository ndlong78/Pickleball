# V5.13.1 — sửa cấu hình Auth và CI nhánh Cloudflare staging

PR #36 sửa URL Supabase thiếu HTTPS, giữ project/publishable key và Auth bật riêng trên nhánh staging. Test host có guest fixture HTTP cho cả browser/SW, tách regression khỏi cấu hình triển khai mà không bỏ ca test hoặc nới timeout/retry. Fixture giáo án dùng trạng thái loaded thay thông báo tạm thời.

Build/assets/PWA cache5.13.1 giúp client nhận URL đã sửa; upgrade từ5.13.0 giữ dữ liệu local và dọn cache Auth cũ. Không đổi SQL/RLS/RPC/IDB schema, không bật bốn nguồn dữ liệu khác hoặc tự import/send.

[Phạm vi, evidence và cách deploy](docs/CLOUDFLARE_STAGING_PR36.md). Main chưa đổi; không cần merge config staging vào main để Cloudflare deploy branch này. Chưa kiểm Managed SMTP/Cloudflare/expiry wall-clock hoặc thiết bị thật; không tự merge hoặc mở signup/pilot.
