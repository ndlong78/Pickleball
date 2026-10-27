# PickleUp – Huấn luyện Pickleball cá nhân

PWA tiếng Việt cho người mới chơi Pickleball, phát triển theo lộ trình đến trình độ 5.0.

## Phiên bản 1.1

- Sáu giáo án mẫu 60 phút với ba bài tập mỗi tuần, đồng hồ, lưu kết quả (giữ tương thích dữ liệu cũ).
- Lộ trình bảy giai đoạn từ 1.0 đến 5.0; số tuần hiển thị là **kế hoạch nội dung**, không phải cam kết đạt cấp độ.
- Tự đánh giá sáu kỹ năng bằng 3 mức (0–2); gợi ý nhóm giáo án 1.0–3.0.
- Sao lưu và khôi phục bằng tệp JSON có kiểm tra định dạng.
- PWA: icon, manifest, offline cache. Dữ liệu lưu cục bộ trên trình duyệt.

## Chạy website

Bật GitHub Pages trong **Settings → Pages → Deploy from a branch → main → /(root)**.

Địa chỉ dự kiến sau triển khai: https://ndlong78.github.io/Pickleball/

Hoặc mở `index.html` để xem giao diện; tính năng service worker/PWA cần nguồn HTTPS hoặc localhost.

## Bảo vệ dữ liệu

Trước khi xóa dữ liệu trình duyệt hay chuyển điện thoại, chọn **Tải bản sao lưu đầy đủ**. Mở trên thiết bị mới rồi dùng **Khôi phục từ tệp JSON**. Dữ liệu không tự đồng bộ giữa các thiết bị. Không tải tệp sao lưu từ người lạ.

## Lộ trình kế tiếp

- V1.2: tách cấu trúc dữ liệu `curriculum / drills / assessments`, thêm tiêu chí học xong.
- V2.0: phát triển và kiểm chứng 36 giáo án 1.0–3.0; báo cáo tiến bộ theo kỹ năng.
- V3+: giáo án chiến thuật, nhật ký trận đấu, hỗ trợ HLV và công cụ phân tích.

**Lưu ý:** Điểm tự đánh giá trong ứng dụng không phải DUPR hay chứng nhận trình độ thi đấu.

## Bản thử nghiệm V2.0: Học viện 36 tuần

- Mở mục **Học viện PickleUp V2** để lọc theo cấp độ 1.0–2.0, 2.0–2.5, 2.5–3.0.
- Mỗi giáo án gồm 10 phút khởi động, 3 bài tập (12 + 12 + 15 phút), 6 phút kiểm tra và 5 phút thả lỏng.
- Điểm từng buổi lưu tại `pickleup_academy_v2`, xuất nhập cùng dữ liệu cũ trong bản sao lưu JSON.
- `curriculum.js` là mô-đun dữ liệu sinh 36 giáo án. Các phương án drill hiện là nội dung mẫu có cấu trúc và cần kiểm tra thực địa/biên tập sâu trước khi xem như giáo trình hoàn thiện.
- `sw.js` đưa mô-đun giáo án vào bộ nhớ offline. Để thấy bản mới, tải lại trang khi có mạng.
- Xếp hạng trên website là nhóm trình độ tham khảo, không phải DUPR hay chứng nhận.

## V2.1 beta

Đọc [ROADMAP.md](ROADMAP.md) để xem tiến độ, tiêu chí nghiệm thu và giới hạn triển khai. Giáo án đã bổ sung cách bố trí, vùng mục tiêu, gợi ý kỹ thuật và sơ đồ sân minh họa chung. Bản này cần kiểm thử trên sân và các thiết bị trước khi công bố là chương trình huấn luyện hoàn chỉnh.

## V2.2 beta

Dashboard gồm số buổi đã ghi nhận/36, tỷ lệ đúng trung bình, sáu biểu đồ kỹ năng, kết quả theo tuần và gợi ý kỹ năng ưu tiên. Dữ liệu lưu cục bộ trên trình duyệt. Dashboard không suy ra DUPR; kết quả ghi lại gần nhất cho mỗi bài, chưa là lịch sử nhiều lần tập. Mã nguồn: [dashboard.js](dashboard.js).
