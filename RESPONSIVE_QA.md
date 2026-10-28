# PickleUp – iPhone / iPad responsive QA

Cập nhật: 27/10/2026 · Phiên bản giao diện: V2.6.1 responsive

## Thiết kế đã chỉnh
- Điện thoại ≤749 px: các nhóm giáo án và nội dung tập luyện thu về một cột; tuần học hiển thị hai cột; nút bấm cao tối thiểu 44–48 px.
- iPad dọc 750–1023 px: khu vực huấn luyện và đồng hồ không chia hai cột quá hẹp; đồng hồ có bốn nút cùng hàng khi đủ chỗ.
- iPad ngang 1024–1199 px: huấn luyện viên một cột, bộ đếm giờ/hướng dẫn bố trí hai cột, điều hướng nhanh trên thanh trên.
- Bổ sung viewport-fit=cover, padding safe-area iOS và chừa chỗ dưới cùng cho Home Indicator.
- Thanh điều hướng nhanh cố định dưới cho màn hình ≤1023 px: HLV, Trên sân, Tiến bộ, Giáo án.
- Ngăn Safari tự zoom khi chạm ô nhập: font-size 16px khi dùng thiết bị cảm ứng.
- Biểu đồ có vùng cuộn riêng, không để trang cuộn ngang vì dữ liệu dài.
- Khi nhập dữ liệu trên iPhone/iPad, thanh điều hướng dưới ẩn để không che bàn phím.
- Nút cài ứng dụng PWA được dời lên trên thanh điều hướng dưới.

## Automated viewport smoke tests
Mã nguồn: `tests/responsive.spec.cjs`, `playwright.config.cjs`, workflow `.github/workflows/responsive.yml`.

Các khung nhìn: iPhone SE 320x568, iPhone 390x844, iPhone Plus 430x932, iPad dọc 820x1180 và iPad ngang 1180x820, chạy trên Chromium và WebKit (mô phỏng engine Safari, không thay thế máy iOS thật).

Quy trình: `npm install`, `npx playwright install chromium webkit`, `npm run test:responsive`.

Bài test:
- Phát hiện tràn chiều ngang; kiểm tra thanh điều hướng theo cỡ màn hình.
- Tạo giáo án dựa trên sáu điểm mẫu, mở chế độ trên sân, kiểm tra nút bấm ≥44 px.
- Ghi một lượt tập và thấy ngay thống kê lịch sử.

## Checklist trên thiết bị thực tế (chưa đánh dấu nghiệm thu)
- [ ] Safari trên iPhone SE / iPhone thường: mở trang, cuộn từ đầu tới cuối không có cuộn ngang.
- [ ] iPhone có Dynamic Island và Home Indicator: header/footer không bị cắt, thanh điều hướng không che nút.
- [ ] iPad dọc: huấn luyện, đồng hồ, biểu đồ đều đủ rộng, không cắt chữ.
- [ ] iPad ngang: thanh điều hướng trên hoạt động, bố cục hai cột đúng tại chế độ trên sân.
- [ ] Chạm các ô số/ghi chú: không tự zoom, bàn phím không che nút xác nhận.
- [ ] Bật PWA từ màn hình chính, tắt/bật mạng, tải lại sau một buổi luyện tập.
- [ ] Đổi chiều màn hình liên tục trong lúc đồng hồ đang chạy.
- [ ] Sao lưu trước khi xóa dữ liệu Safari; thử khôi phục trên thiết bị khác.

## Giới hạn
Mã nguồn responsive và bài test đã thêm vào repository; chưa có xác nhận thử nghiệm trực tiếp trên iPhone/iPad thật. GitHub Actions cần chạy thành công để chốt nghiệm thu tự động. Chưa đo tương phản màu và các tình huống bật chữ hệ thống cực lớn trên mọi phiên bản iOS.

## Điều hướng thống nhất V2.6.2 – mọi thiết bị

- [x] Mã nguồn đã cấu hình cho thanh điều hướng bốn mục luôn cố định cạnh dưới (bao gồm PC ≥1024px).
- [x] Đã cập nhật test WebKit/Chromium để kiểm tra menu vẫn hiện diện ở khung PC 1440px, iPad và iPhone sau khi cuộn.
- [ ] Chạy thành công workflow và kiểm tra thực tế menu không che nội dung ở cuối trang.
- [ ] Trên iPhone/iPad: thử khi bàn phím mở, xoay màn hình và dùng PWA từ Home Screen.
- [ ] Trên PC: kiểm tra ở độ phóng đại 100%, 125%, 150% và màn hình nhỏ.

## V3.2 – Kiểm tra báo cáo chiến thuật trên các thiết bị

- [x] Đã bổ sung Playwright smoke test `tests/tactical-responsive.spec.cjs` cho iPhone 390px, iPad dọc 820px, iPad ngang 1180px và PC 1440px.
- [x] Luồng kiểm tra: lưu trận → thấy gợi ý → người tập chạm áp dụng → tạo giáo án → xác nhận điểm kiểm tra giữ nguyên → thanh menu vẫn hiển thị và không tràn ngang.
- [ ] Xác minh kết quả test Chromium/WebKit trong GitHub Actions.
- [ ] Kiểm tra thật trên iOS Safari/PWA (bàn phím số, nút đề xuất, xoay màn hình, cache mới).

## V3.3 – Thử nhập điều kiện và nhật ký đánh đôi

- [x] Thêm smoke test iPhone 390px, iPad dọc 820px, iPad ngang 1180px và PC 1440px tại `tests/evaluation-responsive.spec.cjs`.
- [x] Kiểm tra form chưa đủ điều kiện không lưu nhầm; hai lần đủ và trùng điều kiện báo chênh lệch +5/20.
- [x] Kiểm tra ghi tình huống đánh đôi và menu cố định còn xuất hiện.
- [ ] Chạy pipeline WebKit/Chromium và sửa mọi lỗi nếu có.
- [ ] Kiểm tra riêng iPhone SE 320px khi bàn phím nhập liệu mở; iPad xoay ngang/dọc; offline sau cập nhật service worker.
- [ ] Chụp/đánh giá thủ công tiêu chí không cuộn ngang, không bị menu che nút.

## V3.6 – Web Vitals, cache phiên bản và iOS Safari

- [x] Có bộ kiểm thử cấu trúc JS cho PerformanceObserver, route timing và cache URL phiên bản.
- [x] Có smoke test mở Tổng quan → Học viện → Dữ liệu, kiểm tra thẻ đo hiệu năng.
- [ ] Chạy Playwright/CI với Chromium và WebKit; ghi nhận lỗi browser nếu có.
- [ ] Thử trên iPhone/iPad: trang tải đầu, chuyển trang, tắt/bật mạng và cập nhật PWA từ 3.5.
- [ ] Trên Safari không hỗ trợ một chỉ số, hiển thị '—' thay vì coi là 0.

- [x] Kiểm thử unit đảm bảo `advanced.css` không bị tải trên trang Tổng quan, nhưng chỉ nạp một lần khi chuyển giữa HLV và Thi đấu.


## V3.7 – Quy trình nghiệm thu các trang HTML động

- [x] Bổ sung kiểm thử Node xác nhận mỗi `id` thuộc đúng một nguồn HTML, không trùng nhau.
- [x] Thêm Playwright iPhone 390px, iPad 820/1180px, PC 1440px: Home chưa hydrate Coach; mở Coach → Court → Coach vẫn giữ trường nhập, URL deep link và Back hoạt động.
- [ ] Xác nhận kết quả thực thi Chromium/WebKit trong CI.
- [ ] Kiểm tra Safari iOS: bàn phím đang mở khi đổi trang, cuộn đến anchor sâu, giao diện menu dưới không bị che.
- [ ] Kiểm tra offline: cache các trang cần dùng khi có Internet, sau đó tắt mạng và mở lại PWA.

## V3.8 QA

- [x] Test benchmark viewport 390×844, 820×1180, 1180×820 và 1440×900 trên Chromium/WebKit; báo cáo là giả lập.
- [x] Test tạo cache đời cũ, kích hoạt worker V3.8, xác minh dọn cache và giữ localStorage.
- [x] Test offline cho trang Học viện đã mở khi có mạng.
- [ ] Chạy xác minh CI và kiểm tra nâng cấp bản đã cài lên màn hình chính của iPhone/iPad.
- [ ] Đo thời gian thực và cảm nhận thao tác ở sân pickleball.

## Kiểm tra CI V3.9 – 28/10/2026

Từ GitHub Actions run 40638439251: bước Node unit test đã đạt; Chromium/WebKit responsive còn lỗi. Các lỗi đã xác định gồm (1) kế hoạch được chọn ở HLV trước khi module Trên sân tải xong nên player không nhận kế hoạch; đã sửa bộ tải bằng cách phát lại sự kiện `pickleup:plan-selected` sau khi module Court sẵn sàng; (2) test page-fragments còn kiểm tra URL HTML phiên bản 3.7.0 dù runtime là 3.9.0; đã đồng bộ; (3) test lưu lượt tập chưa kiểm tra player sẵn sàng trước khi thao tác. CI mới được kích hoạt và phải chờ kết quả từ GitHub trước khi đánh dấu hoàn thành. Không xem 98 bài browser đã qua là toàn bộ suite đạt.
