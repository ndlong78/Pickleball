# V5.30.0 — Cứu thao tác chưa gửi từ tệp cứu hộ (PR5b2d2 lát 2b + 2c)

## Thay đổi
- **Settings → Cứu hộ cache V6:** nút "Xem thao tác chưa gửi có thể cứu" (chỉ bật sau khi chọn tệp hợp lệ) hiển thị thao tác chưa gửi có trong tệp mà máy chưa có, kèm cảnh báo và lý do loại bằng mã cố định. Chỉ đọc; không hiện id, payload hay ghi chú.
- **Đưa lại vào hàng chờ, từng mục:** chỉ **Mục tiêu/lịch tập** và **Check-in**. Mỗi lần bấm: pull dữ liệu mới → kiểm tra bản ghi máy chủ vẫn như lúc thao tác được tạo và máy không có thay đổi chưa gửi/xung đột cho bản ghi đó → kiểm payload bằng validator của domain → ghi một thao tác **mới** vào hàng chờ trên máy. **Không tự gửi**; bạn vẫn đồng bộ thủ công và máy chủ vẫn quyết định bằng CAS.
- Không ghi `records`, mốc đồng bộ, thiết lập/consent, trạng thái thiết bị hay ACK. Các loại dữ liệu khác trong tệp được liệt kê nhưng chưa có nút.
- Trường hợp không an toàn (máy chủ đã đổi, máy có thay đổi mới hơn, dữ liệu lỗi, mất mạng, nguồn tài khoản tắt) **không ghi gì** và hiển thị thông báo cố định.
- Core thuần mới `modules/data/restore-plan-core.js` (`plan`, `assess`), `domain-controller.restoreIntent`, `account-rescue-controller.planRestore/restoreItem`.

## Điều kiện dùng
Cần địa chỉ thử nghiệm đã bật nguồn dữ liệu tài khoản (cờ pilot). Trên bản chính (cờ tắt) thẻ cứu hộ vẫn ẩn như trước và lõi trả `pilot_disabled`. Chế độ khách không đổi.

## Dữ liệu và tương thích
Không đổi khóa localStorage, IndexedDB 3, SQL, RLS, Auth hay dependency. App/assets/PWA `5.30.0` (`pickleup-shell-v5-30-0-stable`); test nâng cấp xóa cache 5.29.1.

## Kiểm chứng và giới hạn
Unit: 484; Playwright Chromium cục bộ (mock Auth/RPC, bốn viewport); WebKit chỉ có CI. **Chưa chạy trên Managed staging thật** (hai thiết bị, mất mạng giữa chừng, hết hạn phiên) — lát 2d do owner thực hiện. Chưa QA trên thiết bị thật. Thiết kế và các điều chỉnh: [docs/RESTORE_DESIGN_PR5B2D2.md](docs/RESTORE_DESIGN_PR5B2D2.md).
