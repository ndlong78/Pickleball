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

## Bản vá giao diện V2.6.1 – iPhone & iPad

PickleUp đã bổ sung `responsive.css` (nạp sau các style cũ) và `mobile-ui.js` để hỗ trợ:
- iPhone: thiết kế một cột, nút chạm ≥44px, ô nhập không tự zoom, thanh điều hướng dưới có khoảng tránh Home Indicator.
- iPad dọc: khu vực huấn luyện và đồng hồ chuyển bố cục một cột thoáng hơn.
- iPad ngang: điều hướng nhanh phía trên, đồng hồ và hướng dẫn hiển thị hai cột khi đủ chỗ.
- Biểu đồ/nhật ký dài được cuộn trong khung, không kéo tràn trang.
- PWA: cache phiên bản mới cho CSS và JavaScript.

**Cách kiểm tra bản mới**: kết nối mạng, tải lại trang PickleUp. Với bản đã thêm vào màn hình chính, đóng rồi mở lại ứng dụng và tải lại khi có mạng. Trước khi xóa dữ liệu trình duyệt hoặc PWA, hãy xuất tệp sao lưu kết quả.

**Kiểm thử**: đã thêm cấu hình Playwright Chromium/WebKit và workflow GitHub Actions chạy trên năm kích thước iPhone/iPad. Đây là mô phỏng trình duyệt, không thay thế nghiệm thu trên thiết bị Apple. Xem [RESPONSIVE_QA.md](RESPONSIVE_QA.md) để thực hiện checklist thực tế.

**Lưu ý**: V2.6.1 sửa bố cục và thao tác, không thay đổi các khóa dữ liệu luyện tập từ V2.4 đến V2.6.

## Điều hướng cố định trên tất cả thiết bị (V2.6.2)

Thanh menu bốn mục **🎯 HLV cá nhân · ⏱ Trên sân · 📈 Tiến bộ · 📚 Giáo án** luôn hiển thị ở **cạnh dưới cửa sổ** khi cuộn trang, trên **PC, iPad ngang/dọc và iPhone**.
- PC: menu gọn, nằm giữa phía dưới; không còn một menu bốn mục khác trùng lặp ở phía trên.
- iPad/iPhone: menu trải toàn chiều rộng, chừa khoảng `safe-area` cho Home Indicator.
- Truy cập từng mục bằng nút; phần đang đọc được đánh dấu khi cuộn.
- Nội dung cuối trang có khoảng trống để menu không che nút/lịch sử.
- Dùng `responsive.css` và `mobile-ui.js`, PWA cache đổi sang `pickleup-shell-v2-6-universal-menu`.

Kiểm tra: `npm run test:responsive` thực hiện smoke test cho iPhone/iPad và thêm PC 1440px; kiểm tra menu luôn cố định, điều hướng tới cả bốn mục và thao tác lưu kết quả. Đây là kiểm thử trình duyệt mô phỏng, chưa thay cho thử trực tiếp trên thiết bị của người dùng.

## V3.0 beta – Học viện chiến thuật 3.0–4.0

Trong mục **📚 Giáo án** ở menu cố định, chọn cấp độ **3.0–3.5** hoặc **3.5–4.0** và chọn tuần 37–80. Giáo án 60 phút gồm khởi động 10, ba bài tập 12/12/15, kiểm tra 6, thả lỏng 5 phút.

Thư viện V3 gồm **44 bài nâng cao** và giữ nguyên 36 bài V2 (tổng 80). Nội dung chuyên sâu tập trung vào third-shot drop, drop/drive, reset, transition zone, phản công ở kitchen, quyết định chiến thuật và phối hợp đánh đôi. Sơ đồ là **minh họa tình huống**, không phải bản vẽ điểm rơi chính xác.

Ngay sau Học viện là:
- **Kiểm tra kỹ năng nâng cao**: sáu mục (third shot, reset, di chuyển, counter, đánh đôi, ra quyết định), mỗi mục nhập số lần đạt 0–20. Các ngưỡng là nội bộ, **không chứng nhận 3.5, 4.0 hoặc DUPR**.
- **Nhật ký trận đấu**: nhập tỷ số một trận đánh đơn/đôi, trọng tâm cần cải thiện và ghi chú ngắn; không cần tên đối thủ.
- **Dashboard tiến bộ**: lọc theo từng cấp độ; thống kê tiến độ trên tổng 80 giáo án hoặc riêng nhóm đã chọn.

Dữ liệu mới lưu tại `pickleup_advanced_checks_v3` và `pickleup_match_journal_v3`. Bản **Tải bản sao lưu đầy đủ** gồm dữ liệu V2 và V3, file khôi phục cũ vẫn được chấp nhận. Dữ liệu không tự đồng bộ các thiết bị.

**Giới hạn beta**: Học viện có 3.0–4.0, nhưng Personal Coach tự tạo giáo án và đồng hồ riêng vẫn chỉ hỗ trợ 1.0–3.0. Các bài cần huấn luyện viên rà soát trước khi công bố chính thức.

Kiểm thử nội dung: `npm run test:unit` (gồm `tests/advanced-curriculum.test.js`), kiểm tra giao diện `npm run test:responsive`. Tài liệu chính: [ROADMAP.md](ROADMAP.md).

## V3.1 beta – Personal Coach nâng cao 3.0–4.0

1. Trong **🎯 HLV cá nhân**, chọn đường dẫn **HLV nâng cao 3.0–4.0**.
2. Làm bài **Kiểm tra nâng cao** để ghi sáu điểm (third-shot, reset, di chuyển, counter volley, phối hợp đánh đôi, quyết định chiến thuật), hoặc nhập trực tiếp số lần đúng 0–20 cho mỗi kỹ năng.
3. Chọn **3.0–3.5** hay **3.5–4.0**, rồi nhấn **Tạo buổi tập 60 phút**.
4. Hệ thống chọn ba kỹ năng điểm thấp nhất; lấy bài từ 44 giáo án nâng cao, luân phiên để tránh lặp, phân bổ 10 + 12 + 12 + 15 + 6 + 5 phút.
5. Nhấn **Vào chế độ tập trên sân** để dùng đồng hồ sáu phần và xem sơ đồ kỹ thuật. Có thể ghi nhiều lượt thử 20 lần sau từng drill.
6. Sau kiểm tra cuối buổi, nhập kết quả và lưu; lần tạo bài tiếp theo sẽ ưu tiên dữ liệu kiểm tra cập nhật nếu mới hơn dữ liệu kiểm tra V3.0.
7. Chọn lại giáo án từ nhật ký V3.1 để tiếp tục. Trang nhớ lựa chọn cơ bản/nâng cao đã dùng lần gần nhất.

**Dữ liệu và riêng tư:** Giáo án lưu tại `pickleup_advanced_plans_v31`, lựa chọn đang sử dụng tại `pickleup_selected_plan_v31`, không yêu cầu đăng nhập hoặc chuyển dữ liệu lên máy chủ. Bản sao lưu JSON bao gồm kế hoạch mới; lịch sử V2 vẫn giữ nguyên. Nhật ký 20 lần thử nhận mã nâng cao `ADV-PU-037`…`ADV-PU-080`.

**Giới hạn:** Hiện là công cụ cá nhân hóa dựa trên quy tắc, không phải mô hình AI huấn luyện thực tế. Số lượt thành công chỉ có thể so sánh khi cùng độ khó và điều kiện. Nhóm 3.0–4.0 không phải rating DUPR.

**Kiểm thử:** `npm run test:unit` bao gồm `tests/advanced-coach.test.js`, `npm run test:responsive` kiểm tra tạo giáo án nâng cao, đồng hồ và lưu kết quả trên các kích thước màn hình. Xem [ROADMAP.md](ROADMAP.md) để biết danh sách việc chưa nghiệm thu.

## V3.2 beta – Báo cáo chiến thuật liên kết nhật ký trận và huấn luyện

- Mở mục **Phân tích chiến thuật V3.2** bằng liên kết trong **HLV nâng cao** hoặc **Nhật ký thi đấu**.
- Phần **Trọng tâm sau trận** tổng hợp **tối đa 10 trận gần nhất**, đếm số lần người chơi tự ghi nhận kỹ năng cần luyện. Đây là dữ liệu định tính, không phải điểm kiểm tra.
- Phần **Tiến bộ cùng bài tập** chọn cấp độ 3.0–3.5 hoặc 3.5–4.0, chỉ so sánh những lần tập có cùng mã bài, cùng cấp độ và cùng loại kiểm tra. Cần ít nhất hai lần đo mới tính chênh lệch.
- Chọn **Đưa trọng tâm này vào HLV nâng cao** để chủ động ưu tiên kỹ năng được ghi nhận nhiều sau trận. Có thể chỉnh hoặc bỏ lựa chọn trong ô **Ưu tiên theo nhật ký trận đấu**. Không tự đổi sáu điểm kỹ năng gốc.
- Thuật toán chỉ chọn một kỹ năng ưu tiên khi người tập yêu cầu; hai bài còn lại lấy từ các kỹ năng có điểm kiểm tra thấp nhất. Nếu bỏ chọn, HLV hoạt động như V3.1.
- Mọi dữ liệu vẫn ở trình duyệt, sử dụng các khóa V3/V3.1 hiện có: `pickleup_match_journal_v3`, `pickleup_training_log_v26`, `pickleup_advanced_plans_v31`. Lựa chọn `matchFocus` là trường tùy chọn trong kế hoạch V3.1, tương thích kế hoạch đã lưu.
- PWA cache V3.2 thêm `tactical-insights-core.js`, `tactical-insights-ui.js`, `tactical-insights.css`.

**Kiểm thử:** `npm run test:unit` gồm `tests/tactical-insights.test.js`; `npm run test:responsive` gồm kiểm tra giao diện Chromium/WebKit kích thước iPhone, iPad, PC. Các bài kiểm thử tự động chưa thay thế nghiệm thu thực tế trên sân.

**Giới hạn:** Số lần nhắc tới một kỹ năng sau trận phụ thuộc cảm nhận người chơi, không chứng minh nguyên nhân thắng/thua. Biểu đồ cùng bài vẫn có sai khác người cấp bóng, mặt sân, mệt mỏi. Đây không phải rating DUPR hoặc AI phân tích video.

## V3.3 beta – Đánh giá điều kiện tập và phối hợp đánh đôi

**Mục tiêu:** So sánh kết quả bài tập một cách thận trọng bằng cách ghi thêm điều kiện thực hiện. Dữ liệu cũ không bị xóa hoặc sửa.

1. Trong **⏱ Trên sân**, chọn từng phần bài tập; sau 20 lượt kiểm tra, nhập số lần đúng và chọn đầy đủ **Cách cấp bóng** (bạn tập / máy bắn / pha bóng), **Tốc độ** (chậm / vừa / gần thi đấu), **Vùng mục tiêu** (rộng / tiêu chuẩn / hẹp). Kết quả mới sẽ lưu vào khóa cũ `pickleup_training_log_v26` cùng trường `conditions` tùy chọn.
2. Mở **Tiến bộ trong điều kiện tương đương**. Chọn nhóm trình độ, xem số lượt đủ điều kiện và kết quả của nhóm gồm cùng mã bài, cấp độ, loại kiểm tra và cả ba thông tin điều kiện. Mỗi nhóm cần ít nhất hai lần đo.
3. Trong **Nhật ký thi đấu**, nếu đánh đôi, có thể chọn một tình huống phối hợp cần cải thiện: bỏ khoảng giữa, giao tiếp, di chuyển lên kitchen, xử lý cú thứ ba, hoặc không có vấn đề cụ thể. V3.3 tổng hợp tối đa 20 trận đánh đôi gần nhất đã ghi phân loại.
4. Các lượt tập và trận cũ không có trường mới **vẫn hợp lệ**. Hệ thống chỉ phân tách chúng ra thành dữ liệu chưa ghi đủ điều kiện, không tự suy diễn rằng chúng tương đương.
5. Bản sao lưu/khôi phục JSON sử dụng các khóa cũ và chấp nhận trường bổ sung; dữ liệu lưu trong trình duyệt, không tự đồng bộ đa thiết bị.

**Hạn chế khoa học:** Ngay cả khi cách cấp bóng, tốc độ và vùng mục tiêu trùng nhau, sự khác nhau về đối tác, vị trí sân, mệt mỏi và việc đếm lượt cũng có thể ảnh hưởng kết quả. Chênh lệch 0–20 không chứng minh quan hệ nguyên nhân hoặc thay thế xếp hạng DUPR.

**Mã nguồn V3.3:** `practice-conditions.js`, `training-evaluation-core.js`, `training-evaluation-ui.js`, `training-evaluation.css`. Kiểm thử `npm run test:unit` và `npm run test:responsive`, gồm `tests/training-evaluation.test.js`, `tests/evaluation-responsive.spec.cjs`. Cần nghiệm thu thêm trên thiết bị iOS thực tế.
