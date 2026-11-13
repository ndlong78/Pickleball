# V5.20.0 — bài Học viện theo bố cục 3 tầng (progressive disclosure)

## Thay đổi
- **Nội dung bài đứng trước bảng điều khiển luyện tập:** `#academyDetail` chuyển lên trên checklist và chế độ tập trung. Người tập thấy "làm thế nào" trước khi thấy các nút.
- **Tầng 1, luôn hiện:** cấp độ, kỹ năng, mục tiêu; thời lượng và vùng mục tiêu dạng nhãn; sơ đồ sân; **3 điểm cần nhớ** chữ lớn trên nền tối (dễ đọc dưới nắng); một nút chính **▶ Bắt đầu tập**.
- **Tầng 2, bấm để mở** (`<details>`, vùng chạm ≥ 48px): luật cần nhớ theo kỹ năng; Cần tránh (lỗi thường gặp); Chuẩn bị và vùng mục tiêu; Lộ trình buổi 60 phút gồm 6 phần.
- **Luật theo ngữ cảnh pickleball** (`modules/academy-lesson-core.js`): Kitchen/NVZ cho dink và volley (gồm lỗi do đà người); giao bóng (không chạm vạch Kitchen, giao dưới thắt lưng, luật hai lần nảy); trả giao bóng; vị trí đánh đôi; cách gọi điểm đôi 0-0-2 và đơn. **Tự mở cho cấp 1.0–2.5**, thu gọn từ 2.5–3.0. Ghi rõ là tóm tắt tham khảo.
- **▶ Bắt đầu tập** chỉ bật chế độ tập trung có sẵn và cuộn tới đồng hồ. **Không lưu điểm, không đánh dấu bước, không xác nhận buổi tập**: giữ hợp đồng "chạy giờ ≠ buổi đã tập".

## Tương thích
- Không đổi dữ liệu bài, ID, localStorage/IndexedDB, Auth, SQL hay dependency. Checklist, focus, timer, điểm /20 và lịch sử giữ nguyên ID và hành vi.
- App/assets/PWA cache `5.20.0` (`pickleup-shell-v5-20-0-stable`); test nâng cấp xóa cache 5.19.0 và giữ dữ liệu luyện tập.

## Kiểm thử
- Unit `tests/academy-lesson.test.js`: cả 80 bài có 3 điểm cần nhớ, lỗi thường gặp, 60 phút, 6 phần; luật đủ 6 kỹ năng; mở theo cấp độ; dữ liệu thiếu không làm lỗi.
- Playwright `tests/academy-lesson.spec.cjs` ở 390/820/1180/1440px: thứ tự nội dung trước điều khiển; tầng 2 thu gọn rồi mở được; "Bắt đầu tập" bật focus mà không đổi khóa `pickleup_*`; không tràn ngang; luật Kitchen mở cho 1.0–2.0 và thu gọn ở 2.5–3.0.
- Mô phỏng trình duyệt, chưa thay QA trên sân với thiết bị thật.
