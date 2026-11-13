# V5.22.0 — C1: mỗi lượt điểm Học viện lưu phiên bản đề

## Thay đổi
- **Lượt điểm khách** mới có thêm trường tùy chọn `av` (phiên bản đề kiểm tra của bài lúc chấm) trong `pickleup_academy_history_v44` và `pickleup_academy_v2`. Lượt cũ không bị viết lại; thiếu `av` được coi là đề 1.
- **Lượt điểm tài khoản** mới ghi `content_version` dạng `<mã bài>@a<n>` (ví dụ `PU-012@a1`). Lượt cũ `academy-80-v1` được coi là `@a1` và vẫn so sánh được với lượt mới.
- **Xu hướng, biểu đồ tiến bộ và gợi ý mục tiêu tuần** chỉ so các lượt cùng bài và cùng phiên bản đề. Khi đề của một bài đổi, lượt theo đề cũ vẫn được giữ nhưng tách khỏi xu hướng; trang bài ghi "theo đề kiểm tra cũ" và không điền sẵn điểm cũ.
- **Nhập dữ liệu vào tài khoản** chấp nhận `av`.
- Hôm nay mọi bài đều ở đề 1 và CMS vẫn khóa đổi đề, nên **người tập chưa thấy khác biệt**; bản này chuẩn bị dữ liệu để mở khóa đổi đề ở PR sau.

## Tương thích và dữ liệu
- Không đổi/xóa khóa localStorage, không migrate, không đổi SQL/RPC/RLS/Auth hay dependency. Sao lưu V1, cứu hộ và khôi phục nhận dữ liệu có hoặc không có `av`.
- Bản app cũ đọc được lịch sử có `av`. Chi tiết và giới hạn: [CONTENT_VERSIONING_CMS mục 11](docs/CONTENT_VERSIONING_CMS.md).
- App/assets/PWA `5.22.0` (`pickleup-shell-v5-22-0-stable`); test nâng cấp xóa cache 5.21.1.
