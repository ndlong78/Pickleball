# V5.32.0 — Tự đồng bộ (kế hoạch cloud, bước A2)

## Thay đổi
- Trên host chính, khi đã đăng nhập, thay đổi đã lưu (mục tiêu/check-in, điểm và nhật ký, giáo án) **tự gửi lên máy chủ** sau khoảng một giây và khi có mạng trở lại. Không cần mở trang Dữ liệu. Nút **Đồng bộ** ở từng mục vẫn gửi ngay.
- Lưu khi mất mạng: thay đổi nằm trong hàng chờ trên thiết bị (kể cả sau khi tải lại trang) và được gửi khi có mạng.
- Khi lỗi (mất mạng, hết phiên đăng nhập, máy chủ bận) ứng dụng thử lại thưa dần, tối đa 5 phút một lần; quay lại tab hoặc có mạng lại thì thử ngay.
- **Xung đột dừng lại chờ bạn chọn** trong trang Dữ liệu; không tự ghi đè. Yêu cầu "đã gửi nhưng chưa rõ kết quả" vẫn cần bấm "Thử lại".

## Không đổi
- Dữ liệu từ thiết bị khác chỉ hiện sau một lần gửi, khi đăng nhập hoặc khi bấm "Đọc dữ liệu tài khoản" (chưa có đọc định kỳ).
- Chưa đăng nhập vẫn lưu trên máy (bước B); dữ liệu cũ chưa tự nhập (bước C); đăng ký vẫn đóng (bước D). Người vận hành dùng `?pilot=…` để giữ luồng gửi thủ công.
- Không đổi IndexedDB 3, SQL, RLS, Auth, dependency.

## Kiểm chứng và giới hạn
Unit 499; Playwright Chromium cục bộ (mock Auth/RPC); WebKit chỉ có CI. **Chưa thử trên project Supabase thật** và chưa QA thiết bị thật. App/assets/PWA `5.32.0` (`pickleup-shell-v5-32-0-stable`); test nâng cấp xóa cache 5.31.0. Kế hoạch: [docs/CLOUD_DEFAULT_PLAN.md](docs/CLOUD_DEFAULT_PLAN.md).
