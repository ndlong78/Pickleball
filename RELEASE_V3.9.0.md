# PickleUp v3.9.0 Stable

**Phạm vi phát hành:** 7 trang chức năng, dynamic HTML/JS/CSS, HLV cơ bản/nâng cao, đồng hồ Trên sân, Học viện, Tiến bộ, Thi đấu, Dữ liệu, PWA offline cho những trang đã mở khi có mạng.

## Điều kiện phát hành
- CI gần nhất trước khi chốt: [GitHub Actions #40641196024](https://github.com/ndlong78/Pickleball/actions/runs/40641196024) — thành công ở cả JavaScript unit tests và responsive Chromium/WebKit.
- Nhánh `main` tiếp tục có các commit đóng gói Stable nên **phải chờ lượt CI mới của commit phát hành** trước khi xác nhận mức độ nghiệm thu cuối cùng. Không đồng nhất CI xanh trên commit cũ với CI của commit mới.
- Service worker dùng cache `pickleup-shell-v3-9-stable`. Asset JS/CSS/HTML có hậu tố `?v=3.9.0` được cache một lần trong vòng đời release, không âm thầm thay byte khi cùng URL. Navigation vẫn ưu tiên mạng và có fallback offline.
- `localStorage` và keys dữ liệu các phiên bản trước được giữ nguyên.
- Đã thêm unit test bất biến cache và kiểm tra tài nguyên được lưu khi mở trang lần đầu.

## Giới hạn nghiệm thu
- Chưa có kết quả test vật lý iPhone/iPad, Safari dưới dạng PWA cài Home Screen, và kiểm chứng pin/wake lock tại sân.
- Những trang chưa mở khi online có thể thiếu HTML/module offline; mở trang cần dùng trước khi rời mạng.
- Không tuyên bố tăng hiệu năng phần trăm nếu chưa có số đo thực.
- Việc gắn nhãn phiên bản trong `package.json` và tài liệu **không tạo Git tag hay GitHub Release tự động**.

## Hướng dẫn nâng cấp
1. Mở [PickleUp](https://ndlong78.github.io/Pickleball/) khi có Internet và tải lại trang.
2. Kiểm tra tạo giáo án ở HLV cá nhân → chuyển Trên sân → ghi 20 lượt → xem Tiến bộ.
3. Mở các trang cần dùng offline ít nhất một lần khi còn kết nối.
4. Nếu ứng dụng vẫn hiện bản cũ, đóng tab/PWA rồi mở lại khi có mạng; tránh xóa dữ liệu trình duyệt vì dữ liệu luyện tập được lưu cục bộ.
