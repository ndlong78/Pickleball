# V5.19.0 — PR5b2d1: đối chiếu tệp cứu hộ trước khôi phục

[PR5b2d1](docs/RESTORE_PREVIEW_PR5B2D1.md) thêm nút so tệp cache V6 đúng tài khoản với một snapshot cache hiện tại: giống, chỉ tệp, chỉ máy, khác cùng khóa và khóa chưa so được. Chỉ counts/fixed labels, không nội dung riêng tư. Nêu các phần cần server/provenance/device review, kể cả ACK trong tệp.

Chỉ đọc, chưa khôi phục/ghi đè/replay, canRestore=false/cloudVerified=false kể cả hai bên giống hệt. Tệp chưa là backup toàn cloud. Đổi account/file/lỗi/logout bỏ comparison; đọc/hash đến muộn không lộ A dưới B. Không tự kích hoạt consent/cursor/lease/generation từ tệp.

**Đánh số phiên bản:** PR này ban đầu là 5.18.0, nhưng #48 (điều hướng 4 tab) đã phát hành 5.18.0 trước. Nâng lên **5.19.0** để service worker và cache `pickleup-shell-v5-19-0-stable` thay thế bản 5.18.0 đã cài; giữ 5.18.0 thì máy đã cập nhật sẽ tiếp tục dùng `page-loader.js`/`settings.html` cũ trong cache và không thấy tính năng.

**Sửa sau khi merge `main`:** khôi phục `modules/data/restore-preview-core.js` trong thứ tự nạp Settings, `tests/restore-preview-core.test.js` trong `test:unit`, kiểm cache offline của module này và bỏ probe cache `v517` khai báo trùng.

App/assets/PWA5.19.0; IDB3/SQL/RLS/Auth/signup/18 keys guest/dependencies không đổi, file envelope1 đọc snapshot1/2/3. Settings lazy/offline và cache5.18.0→5.19.0 giữ dữ liệu. Không cần SQL mới; triển khai GitHub→Cloudflare sau owner merge, không tự merge. Managed/SMTP/thiết bị thật còn chưa kiểm.
