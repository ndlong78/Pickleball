# V5.31.0 — Đăng nhập là dùng dữ liệu tài khoản (kế hoạch cloud, bước A1)

## Thay đổi
- Trên host chính `pickleup-staging.home-309.workers.dev`, khi đã đăng nhập, ba nhóm dữ liệu **tự dùng nguồn tài khoản**: mục tiêu/lịch tập và check-in; điểm Học viện, đánh giá, nhật ký tập và trận; giáo án và lựa chọn. Không cần URL `?pilot=` hay bấm bật từng nguồn. Múi giờ check-in lấy theo thiết bị nếu chưa đặt (vẫn sửa được).
- Trang Dữ liệu hiện phần **Tài khoản** (đăng nhập OTP), ba mục đồng bộ và Cứu hộ cache. Các nút chọn nguồn thủ công và nhãn "dữ liệu giả" không còn hiện ở chế độ này.
- **Gửi lên máy chủ vẫn thủ công** (nút Đồng bộ ở từng mục). Tự đồng bộ là bước A2.
- Người vận hành: `?pilot=…` giữ luồng thủ công cũ; `?maintenance=account-cache` tắt mọi nguồn tài khoản.

## Không đổi
- Dữ liệu cũ trên máy (18 khóa localStorage) không bị xóa và **chưa tự nhập** vào tài khoản (bước C).
- Chưa đăng nhập vẫn dùng và lưu trên máy như trước (bước B sẽ thay đổi). Đăng ký mới vẫn đóng (bước D).
- Bản phụ GitHub Pages và các host khác không có đăng nhập, giữ hành vi thiết bị.
- Không đổi IndexedDB 3, SQL, RLS, Auth, dependency.

## Lưu ý khi cập nhật
Nếu bạn đang đăng nhập, sau bản này trang sẽ hiển thị dữ liệu tài khoản thay cho dữ liệu trên máy. Dữ liệu trên máy vẫn còn; đăng xuất để xem lại, hoặc dùng sao lưu/cứu hộ ở trang Dữ liệu.

## Kiểm chứng và giới hạn
Unit 492; Playwright Chromium cục bộ (mock Auth/RPC, bốn viewport); WebKit chỉ có CI. **Chưa thử trên project Supabase thật** và chưa QA thiết bị thật. App/assets/PWA `5.31.0` (`pickleup-shell-v5-31-0-stable`); test nâng cấp xóa cache 5.30.0. Kế hoạch: [docs/CLOUD_DEFAULT_PLAN.md](docs/CLOUD_DEFAULT_PLAN.md).
