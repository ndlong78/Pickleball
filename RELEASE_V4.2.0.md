# PickleUp V4.2.0 Stable

## Phạm vi
- Học viện 80 giáo án, tiếp tục bài gần nhất và theo dõi số bài đã ghi kết quả.
- Checklist 6 bước riêng theo giáo án; đánh dấu/làm lại không xóa kết quả /20.
- Chế độ tập trung một bước với chuyển trước/sau và ghi nhớ vị trí.
- Đồng hồ theo từng bước, bắt đầu/tạm dừng/đặt lại; không tự chuyển bài sau khi hết giờ.
- Tạm dừng khi thoát chế độ tập trung hoặc khi trang chuyển sang nền.
- Tối ưu giao diện touch cho điện thoại, tablet và PC.

## Tương thích dữ liệu
Các khóa dữ liệu cũ được giữ nguyên: `pickleup_academy_v2`, `pickleup_academy_steps_v41`, `pickleup_academy_focus_v42`, `pickleup_academy_last_lesson_v4`. Không xóa dữ liệu trình duyệt khi cập nhật.

## PWA
Stable dùng cache `pickleup-shell-v4-2-stable` riêng với beta; asset có hậu tố `?v=4.2.0`. Để sử dụng offline, cần mở trước các trang cần dùng khi có mạng.

## Kiểm thử và giới hạn
- CI trước đóng gói: [#40653222296](https://github.com/ndlong78/Pickleball/actions/runs/40653222296) – thành công, Node.js 24, unit tests và Playwright responsive.
- CI của commit đóng gói Stable phải được xác nhận riêng.
- Chưa nghiệm thu trên iPhone/iPad vật lý trong chế độ PWA cài màn hình chính, bao gồm khi khóa màn hình và mất mạng.
- Việc thay version trong repo không tương đương với tạo Git tag/GitHub Release.
