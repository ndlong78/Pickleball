# PickleUp V4.5.0 Stable — Skill Insights

Ngày: 28/10/2026

## Thay đổi
- Lọc kết quả theo cấp độ, kỹ năng và giáo án cụ thể ở trang Tiến bộ.
- Trung bình và biểu đồ chỉ hiển thị kết quả cùng giáo án, tránh so sánh sai giữa các bài khác nhau; đếm số lượt theo cả kỹ năng để cung cấp bối cảnh.
- Biến động tính trên tối đa 6 lượt cuối cùng của giáo án được chọn; biểu đồ có tối đa 12 lượt.
- Dữ liệu legacy V4.3 chỉ được cộng một lần với bài chưa có lịch sử V4.4; không thay khóa lưu trữ.
- Tăng unit test và Playwright cho lọc cấp độ, chọn bài, biểu đồ không trộn kết quả.
- Node.js 24, phát hành cache PWA `pickleup-shell-v4-5-stable`.

## Kiểm thử / giới hạn
- CI sẽ kiểm tra Node.js 24, Chromium và WebKit sau khi mở pull request.
- Cần test iPhone/iPad thật, offline PWA và các tình huống dung lượng localStorage đầy.
- Kết quả /20 phục vụ tự luyện tập, không phải chứng nhận trình độ DUPR; nên so sánh cùng người cấp bóng và điều kiện luyện tập.

## Rollback
- Quay lại commit trước bản phát hành nếu gặp lỗi UI. Đừng xóa localStorage; hãy sao lưu trước khi xóa cache trình duyệt.
