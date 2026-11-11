# V5.16.0 — giao dịch dọn cache tài khoản, chưa mở UI

[PR5b2c2a](docs/CACHE_PURGE_TRANSACTION_PR5B2C2A.md) thêm preview/blockers và giao dịch nguyên tử cho cache đã xử lý xong, giữ guest/tài khoản khác/legacy rescue/Auth/cloud. Pending, unknown commit, conflict, import dở và sender active đều chặn xóa; quota/abort giữ nguyên toàn bộ dữ liệu.

IndexedDB1→2 giữ tám stores và mọi dòng, thêm generation fence cho mọi user transaction để scope cũ không ghi lại sau purge. Repository VERSION1 không mở lại DB2; nếu bị tab cũ chặn, đóng/cập nhật các tab rồi retry, không xóa DB. Rescue file envelope không đổi và đọc snapshot1/2; chưa restore.

Chưa có nút purge, product caller hoặc rollout flag. UI tiếp theo còn phải tích hợp Auth, export/ack/confirmation và dừng/xóa RAM/DOM qua các tab trước khi gọi giao dịch. Không dùng API từ console cho dữ liệu thật; không secure erase/remote wipe hoặc xóa account.

App/assets/PWA5.16.0; không SQL/RLS/Auth config/dependencies mới, không đổi18 khóa guest hoặc tự đồng bộ. Unit/native IDB/Chromium-WebKit/GoTrue-Mailpit real Auth integration phân biệt rõ API-only với UI. CI exact HEAD, số pass/fail/flaky/retry và giới hạn local/Managed ghi trong PR trước ready; không tự merge.
