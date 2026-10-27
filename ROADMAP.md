# PICKLEUP — PRODUCT ROADMAP
Cập nhật: 27/10/2026

## Mục tiêu sản phẩm
PWA huấn luyện Pickleball bằng tiếng Việt từ nhập môn đến 5.0. Điểm ứng dụng là đánh giá nội bộ, KHÔNG phải DUPR hoặc xác nhận rating thi đấu.

## Tiêu chuẩn giáo án
Mỗi buổi 60 phút: 10 phút khởi động + 3 drill (12/12/15 phút) + 6 phút kiểm tra + 5 phút thả lỏng.
Mỗi drill cần có cách tổ chức, điều kiện thực hiện, tiêu chí quan sát. Cần an toàn, đúng luật, theo dõi cải thiện và hạn chế lặp nguyên bài.

## Trạng thái phiên bản
| Phiên bản | Phạm vi | Trạng thái |
|---|---|---|
| V1.0 | 6 buổi mẫu, đồng hồ, lưu tiến bộ | Đã đưa mã nguồn |
| V1.1 | PWA, tự đánh giá 6 kỹ năng, backup/restore | Đã đưa mã nguồn |
| V2.0 beta | 36 buổi 1.0–3.0, bộ lọc, lưu kết quả riêng | Đã đưa mã nguồn |
| V2.1 beta | 36 bài với cách triển khai theo kỹ năng, vùng mục tiêu, kỹ thuật và sơ đồ sân minh họa | Đã đưa mã nguồn; cần kiểm thử thực địa |
| V2.2 beta | Dashboard 6 kỹ năng, tỷ lệ hoàn thành, kết quả từng tuần và ưu tiên luyện tập | Đã đưa mã nguồn; cần kiểm thử giao diện |
| V2.3 beta | Kiểm tra 6 kỹ năng, lưu lịch sử, đánh giá chuyển nhóm giáo án nội bộ | Đã đưa mã nguồn; cần kiểm thử và hiệu chỉnh ngưỡng |
| V2.4 beta | Tạo giáo án cá nhân từ 6 điểm, 24 drill, ưu tiên 3 kỹ năng, lịch sử và đo tiến bộ | Mã nguồn đã triển khai; cần kiểm thử trên thiết bị |
| V2.5 beta | Chế độ trên sân: đồng hồ theo 6 phần, sơ đồ cho 24 drill, điều khiển và tiếp tục sau tải lại | Đã đưa mã nguồn; cần kiểm thử trình duyệt/thiết bị |
| V2.6 beta | Mobile-first: kết quả nhiều lần/cùng drill, biểu đồ so sánh cùng cấp độ và giữ màn hình sáng nếu hỗ trợ | Đã cập nhật mã nguồn; chờ kiểm thử thiết bị |
| V3.0 | 3.0–4.0: chiến thuật, reset, third shot, nhật ký trận | Kế hoạch |
| V4.0 | 4.0–5.0: chiến thuật đôi và thi đấu áp lực | Kế hoạch |
| V5.0 | Tài khoản/đồng bộ, quản trị huấn luyện viên, phân tích video có quyền riêng tư | Ý tưởng dài hạn |

## Phạm vi nội dung dự kiến
- 1.0–2.0: 8 buổi
- 2.0–2.5: 12 buổi
- 2.5–3.0: 16 buổi
- Tổng 36 buổi cơ bản; 3 drill mỗi buổi.
- 3.0–5.0: dự kiến phát triển sau khi có phản hồi từ tập luyện thực tế.

## Định nghĩa hoàn thành V2.1
- [x] 36 mã buổi học ổn định PU-001...PU-036.
- [x] Có mục tiêu, setup, ba drill, sai lầm, tiêu chí đánh giá.
- [x] Hiển thị sơ đồ sân dạng minh họa chung.
- [x] Không đổi key lưu điểm cũ: pickleup_scores, pickleup_academy_v2, pickleup_assessment_v1.
- [ ] Kiểm thử trực tiếp bằng trình duyệt và màn hình nhỏ.
- [ ] Huấn luyện viên rà soát bài tập, đặc biệt tính đúng luật và tiến độ giữa cấp độ.
- [x] Sơ đồ theo sáu nhóm kỹ năng (minh họa cơ bản, chưa là bản vẽ vị trí chính xác cho từng drill).
- [ ] Kiểm thử và hiệu chỉnh hình minh họa theo từng bài cụ thể, phù hợp đúng luật.
- [ ] Kiểm thử sao lưu/khôi phục trên ít nhất hai trình duyệt.

## Kiến trúc hiện tại
- GitHub Pages tĩnh, không máy chủ dữ liệu.
- index.html: UI; curriculum.js: dữ liệu giáo án; sw.js: PWA offline cache.
- localStorage: điểm, bài tự đánh giá và lịch sử.
- Dữ liệu của các trình duyệt không tự đồng bộ. Sao lưu trước khi xóa cache.

## Rủi ro và nguyên tắc
- Tiến bộ trình độ cần luyện tập thường xuyên, có phản hồi huấn luyện và thi đấu, không thể được chứng minh chỉ bằng 20 cú đánh.
- Tránh các bài tập đòi hỏi quá sức; tăng khó theo kỹ năng đã kiểm chứng.
- Giữ hỗ trợ offline nhưng cập nhật cache khi phiên bản đổi; kiểm tra cập nhật PWA thực tế.
- Khi thêm backend, phải có phương án đồng ý xử lý dữ liệu, bảo mật và sao lưu.

## V2.2 – tiêu chí nghiệm thu
- [x] Hiển thị 6 nhóm kỹ năng, số giáo án đã lưu và tỷ lệ thành công trung bình.
- [x] Biểu đồ kết quả theo tuần, biểu đồ thanh theo kỹ năng.
- [x] Gợi ý nội dung tập dựa trên kỹ năng yếu nhất có dữ liệu.
- [x] Đọc dữ liệu V2.1, không thay đổi khóa localStorage; PWA cache mã mới.
- [ ] Kiểm thử trình duyệt/điện thoại thật và trường hợp điểm bị lỗi.
- [ ] Ghi lịch sử nhiều lần thực hiện trong cùng buổi; hiện lưu kết quả gần nhất của mỗi tuần.
- [ ] Đánh giá trọng số độ khó để so sánh công bằng giữa các kỹ năng.

## V2.3 – Nghiệm thu
- [x] Nhập 6 kỹ năng (mỗi kỹ năng 0–20), kết quả và đề xuất ôn tập.
- [x] Ba nhóm giáo án 1.0–2.0, 2.0–2.5, 2.5–3.0.
- [x] Lưu lịch sử kiểm tra riêng, hỗ trợ sao lưu/khôi phục.
- [x] PWA cache module đánh giá.
- [ ] Huấn luyện viên xác định bài kiểm tra tiêu chuẩn riêng cho từng kỹ năng.
- [ ] Hiệu chỉnh ngưỡng 11/14/16 bằng dữ liệu thực tế, không dùng làm chứng nhận rating.
- [ ] Kiểm thử end-to-end trình duyệt và thiết bị.

## V2.4 – Personalized Training Engine (beta)

**Đã triển khai**
- [x] Nạp sáu điểm từ kiểm tra V2.3 gần nhất; nếu chưa có thì lấy bài học Học viện V2 và cho nhập/sửa thủ công.
- [x] Chọn ba kỹ năng có điểm thấp nhất; xử lý trường hợp bằng điểm một cách nhất quán.
- [x] 24 bài tập cụ thể chia sáu kỹ năng, bốn bài mỗi kỹ năng; xoay vòng để tránh lặp ngay khi tạo kế hoạch mới.
- [x] Lập buổi 60 phút gồm khởi động 10, ba bài 12/12/15, kiểm tra 6 và thả lỏng 5 phút.
- [x] Lưu kế hoạch, nguồn điểm đầu vào, kết quả sau buổi tập và chênh lệch điểm ưu tiên.
- [x] Dùng kết quả sau buổi tập cập nhật đầu vào của giáo án tiếp theo; không ghi đè kết quả bài kiểm tra V2.3.
- [x] Sao lưu và khôi phục kế hoạch tương thích định dạng JSON cũ; phiên bản PWA cache mới.
- [x] Bộ test thuần Node tại `tests/personalized-core.test.js`.

**Cần hoàn thiện trước khi phát hành ổn định**
- [ ] Chạy `node --test tests/personalized-core.test.js` và kiểm tra UI trên iPhone Safari, Android Chrome, máy tính, cả online/offline.
- [ ] Kiểm thử nhập điểm sai, lưu đầy bộ nhớ, hai thiết bị khác nhau và sao lưu/khôi phục.
- [ ] Huấn luyện viên rà soát độ phù hợp và điều chỉnh mục tiêu theo độ khó drill.
- [x] Bổ sung nhật ký nhiều lần tập của cùng bài tại V2.6, vẫn giữ dữ liệu tổng kết V2.4.
- [ ] Đồng bộ chọn bài tập với mô-đun đếm giờ và hướng dẫn hình sân, hiện bài được hiển thị dạng giáo án văn bản.

**Nguyên tắc:** Giáo án được chọn bởi bộ quy tắc xác định, chưa sử dụng mô hình AI. Không suy ra cấp độ DUPR, không tự chuyển rating và không đảm bảo đạt 5.0 theo số tuần.

## V2.5 beta – Chế độ tập trên sân

**Phạm vi đã thực hiện**
- [x] Đồng hồ theo sáu phần của giáo án cá nhân hóa (10, 12, 12, 15, 6, 5 phút = 60 phút).
- [x] Điều khiển bắt đầu/tạm dừng, phần trước/tiếp theo, đặt lại. Chuyển phần bằng thao tác người chơi; không tự báo đã hoàn thành bài nếu mới hết giờ.
- [x] Hẹn giờ dựa trên mốc thời gian để hạn chế sai lệch khi tab bị throttling hoặc trình duyệt tải lại.
- [x] Lưu trạng thái tạm trên thiết bị với khóa `pickleup_practice_state_v25`, chỉ khôi phục khi chọn đúng kế hoạch. Dữ liệu kết quả và giáo án V2.4 vẫn dùng khóa cũ.
- [x] Mô-đun sơ đồ vector cho 24 bài tập ở sáu nhóm kỹ năng, trình bày vị trí xuất phát, hướng di chuyển/hướng bóng và vùng minh họa.
- [x] Chuyển nhanh từ Personal Coach sang chế độ tập, và từ phần kiểm tra sang ô ghi kết quả cuối buổi.
- [x] Cache các mô-đun mới trong PWA để sử dụng sau khi đã tải phiên bản khi có mạng.
- [x] Thêm bộ test Node cho countdown engine (`tests/practice-clock.test.js`).

**Chưa nghiệm thu chính thức**
- [ ] Kiểm thử hiển thị và điều khiển thực tế trên iPhone Safari, Chrome Android và máy tính; kiểm thử khóa màn hình, âm báo, tab nền.
- [ ] Kiểm tra thủ công với người chơi trên sân để hiệu chỉnh 24 sơ đồ (sơ đồ chỉ minh họa, không đo chính xác kích thước/điểm rơi).
- [ ] Kiểm thử end-to-end đầy đủ việc lưu kết quả, offline, khôi phục dữ liệu và cập nhật bản PWA mới.
- [ ] Kích hoạt giữ sáng màn hình hoặc âm báo đáng tin cậy chỉ sau khi kiểm thử thiết bị; hiện timer không phát thông báo ngoài ứng dụng.
- [ ] Chưa tự động phân tích video, chưa xếp hạng thi đấu chính thức.

**Bước kế tiếp**
- V2.6 beta: đã thêm giao diện di động, lưu từng lần tập và biểu đồ so sánh cùng bài/cấp độ. Cần kiểm thử thực địa.
- V3.0: mở rộng giáo trình và bài kiểm tra chuyên sâu lên 3.0–4.0 khi V2.1–2.5 đã được kiểm chứng.

## V2.6 beta – Mobile Training Log

**Phạm vi hiện có**
- [x] Ghi số lần thành công trên 20 lần cho từng drill trong ba giai đoạn bài tập trên sân, hỗ trợ ghi chú ngắn.
- [x] Mỗi lần thực hiện được lưu thêm vào nhật ký `pickleup_training_log_v26` (tối đa 1000 lượt gần nhất), không ghi đè bài trước.
- [x] Ghi lần kiểm tra cuối buổi khi người chơi hoàn thành kế hoạch V2.4 lần đầu. Chỉnh sửa lại điểm cũ không giả làm một lần tập mới.
- [x] Biểu đồ so sánh **cùng mã drill + cùng cấp độ + cùng loại đánh giá**; cần ít nhất hai lần mới tính tăng/giảm.
- [x] Lọc theo sáu kỹ năng và drill, xem 12 lần gần nhất, ghi chú từng lần.
- [x] Trình bày thân thiện điện thoại: trường số 16px, mục tiêu chạm >=44px, đồng hồ có vị trí bám khi cuộn trong khu vực.
- [x] Tùy chọn `Screen Wake Lock` nếu trình duyệt hỗ trợ. Không bảo đảm hoạt động khi khóa màn hình, chuyển app hoặc tiết kiệm pin.
- [x] Bản sao lưu/khôi phục JSON mang theo `trainingLog` và kiểm tra schema; mã nguồn từ các phiên bản trước vẫn tương thích.
- [x] PWA cache V2.6, bài test Node tại `tests/training-log.test.js`.

**Giới hạn và kiểm thử còn lại**
- [ ] Xác nhận chạy website và cài PWA trên iOS Safari, Android Chrome, máy tính.
- [ ] Kiểm thử thực tế trên sân cùng huấn luyện viên: thước đo '20 lần đạt' phải phù hợp cho từng drill.
- [ ] So sánh xu hướng chỉ có ý nghĩa tương đối nếu giữ giống người cấp bóng, mục tiêu và điều kiện.
- [ ] Đo/hiệu chỉnh không mất dữ liệu khi trình duyệt đầy quota hoặc người dùng xóa dữ liệu cục bộ.
- [ ] Chưa hỗ trợ đồng bộ đa thiết bị, báo cáo video hay xếp hạng DUPR.

**Tiếp theo**: kiểm thử nghiệm thu V2.6 và rà soát sư phạm trước khi phát triển giáo trình V3.0 (3.0–4.0).

## V2.6.1 – Responsive iPhone / iPad hotfix

**Đã cập nhật mã nguồn**
- [x] Bổ sung CSS responsive cuối trang: điện thoại ≤749px, iPad dọc 750–1023px, tablet ngang 1024–1199px; xử lý hình, biểu đồ và ô nhập tránh tràn ngang.
- [x] Bổ sung vùng an toàn Safari `viewport-fit=cover`, padding cho tai thỏ/Home Indicator.
- [x] Điều hướng dưới cho điện thoại và iPad dọc; điều hướng trên cho iPad ngang.
- [x] Touch target ≥44px cho các nút chính, cỡ chữ ô nhập ≥16px trên màn hình cảm ứng và xử lý khi bàn phím đang mở.
- [x] Responsive PWA cache với `responsive.css` và `mobile-ui.js`.
- [x] Có test tự động Chromium/WebKit ở năm kích thước iPhone/iPad, triển khai workflow CI.
- [x] Tài liệu [RESPONSIVE_QA.md](RESPONSIVE_QA.md) hướng dẫn kiểm thử thực tế.

**Chưa kết luận nghiệm thu**
- [ ] Kiểm tra kết quả pipeline CI và sửa mọi lỗi còn lại.
- [ ] Kiểm tra bằng iPhone/iPad thật trên Safari, PWA đã cài, bàn phím, khi xoay màn hình.
- [ ] Phân tích phản hồi trực quan và độ dễ dùng trực tiếp từ người tập.

**Lưu ý**: chỉ thay đổi trình bày, không thay đổi các điểm hoặc lịch sử luyện tập trước đây.
