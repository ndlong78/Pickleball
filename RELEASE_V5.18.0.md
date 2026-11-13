# V5.18.0 — điều hướng 4 tab + "Thêm", trang Dữ liệu gọn trên production

## Điều hướng
- Thanh điều hướng trên cùng và dock cố định dưới màn hình cùng dùng **4 tab chính**: 🏠 Tổng quan · 📚 Học viện · ⏱ Trên sân · 📈 Tiến bộ, cộng nút **☰ Thêm**.
- "Thêm" mở một menu dùng chung (`#pageNavMore`) chứa 🧭 Hành trình · 🎯 HLV cá nhân · 🏓 Thi đấu · ⚙️ Dữ liệu, mỗi mục có mô tả một dòng.
- Vẫn giữ đủ **8 route**, deep link `?page=…#section` và hash cũ; `page-catalog.js` không đổi.
- Thanh trên không còn cuộn ngang 8 ô. Khi đang ở trang phụ, nút "Thêm" được đánh dấu và hiện tên trang hiện tại.
- Truy cập: `aria-expanded`/`aria-controls`; Escape đóng menu và trả focus về nút; bấm ra ngoài thì đóng; chọn trang thì đóng và trả focus về nút "Thêm". Dock thay "HLV cá nhân" bằng "Tổng quan" và thêm nút "Thêm".

## Trang Dữ liệu trên production
- `modules/settings-surface.js` (chỉ trình bày, không phải ranh giới bảo mật) ẩn các thẻ tài khoản/pilot (`accountPanel`, `syncPilot`, `activityPilot`, `planPilot`, `importPilot`, `accountRescue`, `accountPurge`) và thẻ chẩn đoán Web Vitals/tốc độ tải (`pageDiagnostics`) trên mọi origin không phải staging hoặc loopback, khi Auth tắt.
- Mặc định markup là **ẩn** (`data-surface-hidden`), nên production không có khoảnh khắc nháy panel trước khi script chạy. Staging Workers và localhost vẫn hiện đủ công cụ.
- Thêm `?page=settings&debug=1` để xem riêng phần chẩn đoán trên production; các panel tài khoản vẫn ẩn.
- Production chỉ còn **Sao lưu & khôi phục** và **Cứu hộ dữ liệu** khách. Module, IndexedDB, localStorage và Auth/RLS không thay đổi; không có khóa lưu trữ mới.

## Tương thích và kiểm thử
- App/assets/PWA cache `5.18.0` (`pickleup-shell-v5-18-0-stable`); test nâng cấp xóa cache 5.17.0 và giữ dữ liệu luyện tập.
- Unit mới `tests/settings-surface.test.js`; Playwright mới cho menu "Thêm" (mở/Escape/focus/điều hướng/đánh dấu) và cho Settings trên origin production ảo, `debug=1`, loopback.
- Helper `tests/helpers/navigation.cjs` mở "Thêm" trước khi chọn các trang phụ.
- Không SQL/RLS/Auth config, không dependency mới. Kiểm thử Playwright là mô phỏng, chưa thay cho QA trên thiết bị thật.
