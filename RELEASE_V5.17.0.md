# V5.17.0 — dọn cache tài khoản với xác nhận và đăng xuất

[PR5b2c2b](docs/CACHE_PURGE_UI_PR5B2C2B.md) bổ sung UI staging: đọc cache hiện tại → tải cứu hộ → xác nhận đã giữ file → xác nhận cuối → đăng xuất → dọn cache đã xử lý xong. Pending, unknown commit, conflict/import dở chặn xóa; guest, tài khoản khác và dữ liệu cloud giữ nguyên. File cứu hộ chưa phục hồi được; state chỉ trên máy cũng thuộc phần xóa.

Mode riêng `?page=settings&maintenance=account-cache` tắt bốn nguồn/import; yêu cầu online, một cửa sổ và worker hiện hành. Lease persisted chặn SDK tab mới, mất lease/đổi tài khoản hủy local scope và link. IndexedDB1/2→3 giữ tám stores/mọi dòng, chặn frontend cũ mở lại; rescue envelope1 đọc snapshot1/2/3. Không downgrade/xóa storage để cập nhật.

App/assets/PWA5.17.0; không SQL/RLS/Auth config hoặc dependencies mới, giữ18 khóa guest. Không restore/import engine mới, secure erase/remote wipe, account deletion hay mở pilot. Triển khai qua GitHub→Cloudflare sau owner merge, không ZIP/upload. CI exact HEAD và giới hạn Managed ghi trong PR; không tự merge.
