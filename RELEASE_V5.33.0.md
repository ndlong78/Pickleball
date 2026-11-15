# V5.33.0 — Mời nhập dữ liệu cũ trên máy vào tài khoản (kế hoạch cloud, bước C)

## Thay đổi
- Trên host chính, khi đã đăng nhập và máy có dữ liệu cũ (mục tiêu, check-in, điểm, đánh giá, giáo án, nhật ký…), trang Dữ liệu hiện **lời mời nhập** kèm số nhóm dữ liệu.
- Nút **"Dùng dữ liệu đang có trên máy này"** nạp thẳng dữ liệu trên máy vào bộ nhập, không cần xuất rồi chọn tệp. Các nhóm có dữ liệu được chọn sẵn, múi giờ lấy theo thiết bị (sửa được).
- Quy trình vẫn như bộ nhập sẵn có: **xem trước → xử lý mục cần quyết định → xác nhận → nhập**. Nhập xong, dữ liệu tài khoản được đọc lại để hiển thị.
- Lời mời cho biết khi dữ liệu trên máy đã nhập xong, hoặc khi có phiên nhập dở cần tiếp tục.

## Không đổi
- **Không tự nhập**: chưa xác nhận thì không có gì được gửi.
- Dữ liệu cũ trên máy **không bị xóa hay sửa** sau khi nhập.
- Chưa đăng nhập vẫn lưu trên máy (bước B); đăng ký vẫn đóng (bước D). URL vận hành `?pilot=`/`?maintenance=` tắt bộ nhập.
- Không đổi IndexedDB 3, SQL, RLS, Auth, dependency.

## Kiểm chứng và giới hạn
Unit 499; Playwright Chromium cục bộ (mock Auth/RPC); WebKit chỉ có CI. **Chưa thử trên project Supabase thật** (RPC nhập thật, dữ liệu cũ thật) và chưa QA thiết bị thật. App/assets/PWA `5.33.0` (`pickleup-shell-v5-33-0-stable`); test nâng cấp xóa cache 5.32.0. Kế hoạch: [docs/CLOUD_DEFAULT_PLAN.md](docs/CLOUD_DEFAULT_PLAN.md).
