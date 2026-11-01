# V5.5.0 — PR4c nguồn tài khoản và UI sync/conflict

Cho phép opt-in riêng nguồn mục tiêu/lịch tập/check-in, lưu local trước, chủ động đọc/đồng bộ, xử lý conflict có preview và xuất hai bản/queue. Đăng nhập không tự chuyển nguồn hoặc gửi dữ liệu cũ. Guest18 keys giữ nguyên; các domain khác còn trên thiết bị. [Hợp đồng và giới hạn](docs/SYNC_UI_PR4C.md).

Build/asset/cache đồng bộ5.5.0; Home giữ lazy loading, tám route không đổi. Auth/import/sync flags mặc định false. Không deploy Supabase/production hoặc tự merge. Exact HEAD/CI counts ở PR; chưa staging SMTP, field QA, full V6 backup/restore/purge hay rollout dữ liệu thật.
