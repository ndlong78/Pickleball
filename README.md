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

## V2.3 beta – Kiểm tra chuyển cấp

Trong mục **Kiểm tra chuyển cấp**, chọn nhóm giáo án và nhập số lần đạt trong 20 lượt cho sáu kỹ năng. Hệ thống lưu lịch sử gần nhất, gợi ý kỹ năng cần bổ sung và kết quả tự đánh giá nội bộ. Ngưỡng 11/14/16 trên 20 chỉ là mốc thử nghiệm, không dùng suy ra rating chính thức. Dữ liệu được bao gồm trong bản sao lưu JSON.

## V2.4 beta – Personal Coach (cá nhân hóa 60 phút)

Mở phần **Giáo án cá nhân hóa 60 phút** trên trang chính.

1. Nhấn **Nạp điểm đã lưu** để dùng dữ liệu V2.3/Học viện, hoặc nhập đủ 6 kết quả thủ công (0–20).
2. Chọn nhóm giáo án 1.0–2.0, 2.0–2.5 hoặc 2.5–3.0; nhấn **Tạo giáo án 60 phút**.
3. Hệ thống sắp xếp ba kỹ năng cần ưu tiên và chọn một bài cụ thể cho mỗi kỹ năng trong tổng thư viện 24 bài. Giáo án 10 + 12 + 12 + 15 + 6 + 5 = 60 phút.
4. Sau khi tập, nhập kết quả 20 lần kiểm tra của kỹ năng ưu tiên số một; nhấn **Lưu kết quả buổi tập**.
5. Lần sau hệ thống sử dụng điểm mới để gợi ý ba ưu tiên khác nếu cần, và luân phiên bài tập.

**Giới hạn:** Các điểm có thể là tự đo, chưa đồng nhất mức độ khó; việc chọn bài là bộ quy tắc offline chứ chưa phải AI. Kế hoạch lưu cục bộ tại `pickleup_plans_v24`, được xuất/nhập trong bản sao lưu JSON tương thích phiên bản trước. Người dùng cần nhập điểm từ cuộc hội thoại ChatGPT theo cách thủ công vì website không kết nối dữ liệu trò chuyện.

**Mã nguồn:** [personalized-core.js](personalized-core.js) (quy tắc + 24 drill), [personalized-ui.js](personalized-ui.js) (giao diện), [tests/personalized-core.test.js](tests/personalized-core.test.js) (kiểm thử).

**Kiểm thử tại máy tính** (yêu cầu Node.js): `node --test tests/personalized-core.test.js`.

**Roadmap:** [ROADMAP.md](ROADMAP.md).

## V2.5 beta – Chế độ tập luyện trên sân

- Trong **Giáo án cá nhân hóa 60 phút**, nhập đủ sáu điểm rồi tạo giáo án (hoặc chọn kế hoạch đã lưu).
- Chọn **Vào chế độ tập trên sân**. Một kế hoạch có sáu phần: khởi động 10 phút, ba drill 12/12/15 phút, kiểm tra 6 phút, thả lỏng 5 phút.
- Trong phần đang tập, xem hướng dẫn, lưu ý kỹ thuật và sơ đồ vector của bài; dùng **Bắt đầu**, **Tạm dừng**, **Phần tiếp theo**, **Phần trước** hoặc **Đặt lại**.
- Khi hết giờ của một phần, đồng hồ dừng. Hãy nhấn **Phần tiếp theo** khi bạn sẵn sàng, không tự chuyển trong khi chưa hoàn thành hoạt động thực tế.
- Kết thúc phần kiểm tra hoặc buổi tập, nhấn **Nhập kết quả sau tập** để chuyển tới ô ghi kết quả trong Personal Coach V2.4.
- Trạng thái thời gian tạm thời lưu tại `pickleup_practice_state_v25` cho giáo án đang chọn, có thể khôi phục sau tải lại trang. Đồng hồ dùng thời gian thực khi ứng dụng bị đưa xuống nền; âm báo và hoạt động khi khóa màn hình tùy thuộc trình duyệt, **chưa được bảo đảm**.
- Sơ đồ sân là hình minh họa cho 24 drill, không phải hình đo kích thước chuẩn và không thay thế kiểm tra quy tắc đánh bóng.
- Mã nguồn: `practice-clock.js`, `practice-runner.js`, `practice-diagrams.js`; test tại `tests/practice-clock.test.js`.

### Kiểm thử lập trình

Chạy `node --test tests/personalized-core.test.js tests/practice-clock.test.js` trên máy có Node.js. Cần kiểm thử thủ công PWA trên điện thoại thực tế trước khi dùng rộng rãi.

## V2.6 beta – Lịch sử nhiều lần tập và giao diện di động

- Trong **Chế độ tập luyện trên sân**, mở từng bài tập 1–3, thực hiện 20 lượt rồi nhập số lượt thành công (0–20) và ghi chú ngắn, chọn **Lưu một lần tập**. Có thể lưu nhiều lần cho cùng drill.
- Mở mục **Lịch sử luyện tập nhiều lần**, chọn kỹ năng và bài để xem từng lượt cùng biểu đồ. Hệ thống **chỉ so sánh cùng mã drill, nhóm cấp độ và loại kiểm tra**; một kết quả đơn lẻ không được coi là cải thiện.
- Khi **lưu kết quả kiểm tra cuối buổi lần đầu** ở Personal Coach, nhật ký ghi một kết quả `assessment`. Việc sửa lại điểm không tạo thêm lượt giả.
- Trên điện thoại, nút điều khiển lớn hơn, form hỗ trợ nhập số và đồng hồ được bám trong khu vực tập. Tùy chọn **Giữ màn hình sáng** dùng Screen Wake Lock nếu trình duyệt cho phép; không đảm bảo khi khóa màn hình/chuyển app.
- Dữ liệu nằm trong `localStorage` ở khóa `pickleup_training_log_v26`, giữ tối đa 1.000 lượt gần đây; dữ liệu lịch sử cũ vẫn nguyên và hoạt động song song. Bản sao lưu JSON gồm mảng `trainingLog`, dữ liệu cũ vẫn phục hồi bình thường.
- Dùng `training-log-core.js` và `training-history-ui.js`. Kiểm thử qua `node --test tests/training-log.test.js`.

**Đánh giá:** Các số lượt thành công là kết quả luyện tập cá nhân. Ngay cả khi cùng mã drill, các điều kiện thực tế và độ khó có thể thay đổi nên biểu đồ không phải rating thi đấu.

**Trạng thái:** V2.6 beta đã có mã nguồn nhưng chưa kiểm thử trực tiếp trên iPhone/Android thật. Đọc [ROADMAP.md](ROADMAP.md) để biết tiêu chí phát hành.
