# V5.18.0 — đối chiếu tệp cứu hộ trước khôi phục

[PR5b2d1](docs/RESTORE_PREVIEW_PR5B2D1.md) thêm nút so tệp cache V6 đúng tài khoản với một snapshot cache hiện tại: giống, chỉ tệp, chỉ máy, khác cùng khóa và khóa chưa so được. Chỉ counts/fixed labels, không nội dung riêng tư. Nêu các phần cần server/provenance/device review, kể cả ACK trong tệp.

Chỉ đọc, chưa khôi phục/ghi đè/replay, canRestore=false/cloudVerified=false kể cả hai bên giống hệt. Tệp chưa là backup toàn cloud. Đổi account/file/lỗi/logout bỏ comparison; đọc/hash đến muộn không lộ A dưới B. Không tự kích hoạt consent/cursor/lease/generation từ tệp.

App/assets/PWA5.18.0; IDB3/SQL/RLS/Auth/signup/18 keys guest/dependencies không đổi, file envelope1 đọc snapshot1/2/3. Settings lazy/offline và cache5.17.0→5.18.0 giữ dữ liệu. Không cần SQL mới; triển khai GitHub→Cloudflare sau owner merge, không tự merge. CI exact HEAD/số pass/fail/flaky/retry ghi trong PR; Managed/SMTP/thiết bị thật còn chưa kiểm.
