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
| V3.0 beta | 44 giáo án 3.0–4.0, kiểm tra kỹ năng chuyên sâu, nhật ký trận đấu | Đã đưa mã nguồn; cần kiểm thử thiết bị và HLV duyệt |
| V3.1 beta | Personal Coach 3.0–4.0, đồng hồ, sơ đồ, điểm sau tập và lịch sử kế hoạch | Đã cập nhật mã nguồn; cần QA trên sân/thiết bị |
| V3.2 beta | Phản hồi sau trận → báo cáo tiến bộ cùng bài → gợi ý giáo án theo lựa chọn người tập | Đã cập nhật mã nguồn; chờ kiểm thử trình duyệt và thực địa |
| V3.3 beta | Ghi điều kiện tập, so sánh tương đương và theo dõi tình huống đánh đôi | Đã cập nhật mã nguồn; cần nghiệm thu thiết bị và sư phạm |
| V3.4 beta | Phân loại bảy trang, tách module, router tĩnh tương thích PWA | Đã triển khai mã nguồn; còn nghiệm thu UX và CI |
| V3.5 beta | Tải JS/CSS theo trang, PWA cache lõi, đo tốc độ tại thiết bị | Đã triển khai; chờ nghiệm thu browser và đo tốc độ |
| V3.6 beta | Web Vitals cục bộ, đo route và versioned assets chống cache cũ | Đã đưa mã nguồn; cần benchmark và QA iOS |
| V3.7 beta | Tách HTML theo trang, giảm DOM khởi động, cache fragments | Đã triển khai mã nguồn; còn CI và kiểm thử thiết bị thật |
| V3.8 beta | Benchmark profile thiết bị, tối ưu render Học viện/Dashboard, PWA migration | Đã triển khai mã nguồn; chờ kết quả CI và thiết bị thật |
| V4.0 | 4.0–5.0: chiến thuật đôi và thi đấu áp lực | Kế hoạch |
| V5.0 | Tài khoản/đồng bộ, quản trị huấn luyện viên, phân tích video có quyền riêng tư | Ý tưởng dài hạn |

## Phạm vi nội dung dự kiến
- 1.0–2.0: 8 buổi
- 2.0–2.5: 12 buổi
- 2.5–3.0: 16 buổi
- Tổng 36 buổi cơ bản; 3 drill mỗi buổi.
- 3.0–3.5: 20 buổi mới; 3.5–4.0: 24 buổi mới, đưa tổng thư viện lên 80 buổi.
- 4.0–5.0: dự kiến phát triển sau khi có phản hồi tập luyện và thi đấu thực tế.

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

## V2.6.2 – Thanh điều hướng cố định thống nhất

- [x] Menu bốn mục hiện diện trên mọi cỡ màn hình: PC, iPad dọc/ngang và iPhone.
- [x] Trên PC menu cố định giữa cạnh dưới; trên thiết bị hẹp menu chiếm hết chiều rộng và chừa vùng an toàn iOS.
- [x] Loại bỏ menu điều hướng trùng trên header.
- [x] Cập nhật màu nhấn mục đang đọc theo vị trí cuộn hoặc khi điều hướng.
- [x] Dự phòng không gian ở cuối trang để menu không đè nội dung.
- [x] Cập nhật cache PWA, test menu cố định và điều hướng ở các kích thước gồm PC 1440px.
- [ ] Nghiệm thu trực tiếp trên Safari iPhone/iPad và Chrome/Edge PC; xác minh hành vi khi bàn phím ảo mở.

## V3.0 beta – Chiến thuật từ 3.0 đến 4.0

**Đã triển khai**
- [x] Giữ nguyên mã 36 buổi cơ bản (PU-001..PU-036). Thêm 20 giáo án 3.0–3.5 và 24 giáo án 3.5–4.0 (PU-037..PU-080).
- [x] 11 nhóm tình huống nâng cao, 44 tiêu đề/bài kiểm tra khác nhau, ba drill cho mỗi buổi, tổng 60 phút.
- [x] Các trọng tâm: third-shot drop, chọn drop/drive, cú thứ năm, reset và transition, dink dưới áp lực, counter volley, phối hợp đánh đôi, phòng thủ sang phản công.
- [x] Bổ sung bộ lọc cấp độ Học viện và sơ đồ chiến thuật minh họa theo 11 tình huống.
- [x] Dashboard thống kê theo cấp độ: không gộp khó/dễ mà không thể chọn lọc, tiến độ được tính dựa trên 80 buổi.
- [x] Kiểm tra riêng sáu kỹ năng chiến thuật nâng cao cho hai nhóm 3.0–3.5 và 3.5–4.0, lưu lịch sử cục bộ.
- [x] Nhật ký trận đấu đơn/đôi: lưu tỷ số, kỹ thuật trọng tâm và ghi chú, không yêu cầu tên đối thủ.
- [x] Bản sao lưu JSON hỗ trợ 80 kết quả học viện và hai nguồn mới `advancedChecks`, `matchJournal`; không xóa dữ liệu V2.
- [x] Tài nguyên V3 cache trong PWA; thêm kiểm thử hồi quy `tests/advanced-curriculum.test.js`.
- [x] Giữ nguyên menu bốn mục cố định dưới trên PC/iPad/iPhone.

**Chưa nghiệm thu ổn định**
- [ ] Chạy workflow và kiểm thử thực tế theo iOS Safari, Android Chrome, desktop.
- [ ] Huấn luyện viên đối chiếu từng bài với luật hiện hành, mức vận động và khả năng tiến bộ thực tế.
- [ ] Xác thực ngưỡng 13/15 của kiểm tra chuyên sâu bằng dữ liệu tập thật; tuyệt đối không sử dụng làm rating DUPR.
- [x] V3.1 đã tích hợp Personal Coach 3.0–4.0 với đồng hồ; hiện cần QA thực tế và kiểm chứng bài tập.
- [ ] Nhật ký trận hiện lưu tỷ số một trận, chưa phân tích điểm số theo rally hoặc vị trí.

**Kế tiếp:** V3.1 kiểm thử sư phạm, cải thiện biểu đồ chiến thuật và mở Personalized Coach riêng cho 3.0–4.0; V4.0 sau khi nghiệm thu mới mở 4.0–5.0.

## V3.1 beta – Cá nhân hóa huấn luyện nâng cao

**Đã triển khai**
- [x] Bộ tạo kế hoạch nâng cao theo sáu kết quả thực hành: third-shot, reset, movement, counter volley, doubles và quyết định cú đánh.
- [x] Ưu tiên ba kỹ năng có điểm thấp nhất, chọn ba bài từ đúng nhóm 3.0–3.5 hoặc 3.5–4.0, tránh lặp bài mới tập khi còn lựa chọn.
- [x] Kế hoạch 60 phút: khởi động 10, ba drill 12/12/15, kiểm tra 6 và thả lỏng 5 phút.
- [x] Form nạp điểm V3.0 hoặc nhập điểm thủ công; có lịch sử giáo án và kết quả sau tập.
- [x] Tích hợp cùng đồng hồ hiện hữu, sơ đồ sân chiến thuật và form ghi kết quả ngay trong chế độ tập.
- [x] Nhật ký nhiều lần tập hỗ trợ mã `ADV-PU-037` đến `ADV-PU-080`; so sánh theo cùng bài, cấp độ và loại bài kiểm tra.
- [x] Lưu riêng tại `pickleup_advanced_plans_v31`; chọn giáo án tại `pickleup_selected_plan_v31` và không thay khóa lưu điểm V2.
- [x] Tích hợp xuất/nhập JSON, PWA offline, test kỹ năng và kiểm thử luồng nâng cao trên iPhone/iPad/PC.
- [x] Giữ nguyên thanh menu bốn mục cố định trên mọi thiết bị.

**Giới hạn**
- [ ] Chạy xác nhận CI WebKit/Chromium và kiểm thử thủ công trên iPhone/iPad/PWA cài màn hình chính.
- [ ] Huấn luyện viên kiểm chứng độ khó, thiết bị cần thiết, lỗi phổ biến và kỹ thuật đúng luật trên 44 buổi nâng cao.
- [ ] Mỗi bài đang ghi 20 tình huống; muốn dùng tiến bộ chính xác cần chuẩn hóa độ khó và đối tác cấp bóng.
- [ ] Chưa có đồng bộ tài khoản hoặc phân tích video. Rating 3.0–4.0 là nhóm giáo án nội bộ, không phải DUPR.

**Đề xuất kế tiếp:** V3.2 nghiệm thu mobile + trải nghiệm thực địa và báo cáo kỹ năng sau trận, sau đó mới mở V4.0.

## V3.2 beta – Tactical Insights và QA thiết bị

**Đã triển khai trong mã nguồn**
- [x] Tạo báo cáo từ 10 trận gần nhất trong nhật ký V3.0, nhóm lại theo 6 kỹ năng nâng cao.
- [x] So sánh số lần thực hiện đúng cho cùng mã bài, cùng cấp độ và cùng kiểu kiểm tra từ V2.6/V3.1; hiển thị số mẫu và mức chênh lệch.
- [x] Chọn cấp độ trong báo cáo và đồng bộ khi đổi cấp độ của HLV nâng cao.
- [x] Nút người dùng chủ động đưa trọng tâm sau trận vào giáo án; không tự động thay đổi kết quả kiểm tra.
- [x] Mô hình V3.1 chấp nhận tùy chọn `matchFocus` mà vẫn đọc được các kế hoạch cũ.
- [x] Mobile-first layout, giữ menu cố định bốn mục; kiểm tra smoke flow Chromium/WebKit cho iPhone/iPad/PC.
- [x] Cập nhật PWA offline và README. Không thêm máy chủ, không chuyển dữ liệu cá nhân ra ngoài.

**Chưa nghiệm thu**
- [ ] Chạy thành công toàn bộ CI/Playwright và test PWA trên iPhone/iPad thật.
- [ ] Kiểm tra tình huống dữ liệu cũ, sửa điểm và sao lưu/khôi phục trên hai thiết bị.
- [ ] Huấn luyện viên rà soát mapping tình huống trận đấu vào nhóm kỹ năng và thống nhất protocol kiểm tra 20 lần.
- [ ] Không thể kết luận thay đổi trình độ hoặc nguyên nhân thắng/thua dựa trên dữ liệu hiện có.

**Hướng tiếp theo:** V3.3 thử nghiệm trên sân, dashboard theo điều kiện tập và phân tích tình huống đánh đôi; chỉ tiến tới V4.0 sau nghiệm thu sư phạm.

## V3.3 beta – Practice Conditions & Doubles Review

**Đã triển khai mã nguồn**
- [x] Cách cấp bóng, tốc độ bài tập và độ rộng vùng mục tiêu cho từng lượt tập mới; lưu trong bản ghi theo schema tùy chọn để bảo toàn dữ liệu V2.6/V3.1.
- [x] Kiểm tra dữ liệu đầu vào và chặn lưu lượt mới khi chưa chọn đủ ba điều kiện, không làm mất bản ghi cũ.
- [x] Báo cáo lọc theo cấp độ, nhóm dữ liệu cùng bài, loại đánh giá và ba điều kiện; loại các bản ghi cũ thiếu điều kiện khỏi phép so sánh tương đương.
- [x] Nhật ký đánh đôi bổ sung một tình huống cần cải thiện (tùy chọn); tổng hợp tối đa 20 trận gần đây có phân loại.
- [x] Lịch sử lần tập cũ hiện phân nhóm theo điều kiện và ghi rõ dữ liệu thiếu điều kiện.
- [x] CSS mobile-first, menu cố định PC/iPad/iPhone giữ nguyên.
- [x] PWA cache mới và kiểm thử Node + Playwright/Chromium/WebKit trong repository.

**Chưa nghiệm thu**
- [ ] Xác nhận pipeline GitHub Actions đạt và thao tác đúng trên iPhone/iPad thật, cả chế độ PWA offline.
- [ ] Huấn luyện viên rà soát giao thức 20 lượt kiểm tra theo từng drill để bảo đảm độ khó tương đương.
- [ ] Kiểm thử thao tác phục hồi bản sao lưu cũ/mới trên hai trình duyệt và trường hợp dung lượng lưu trữ đầy.
- [ ] Xem lại yêu cầu nhập điều kiện sau thử nghiệm thực tế để tránh làm buổi tập bị gián đoạn.
- [ ] Không suy ra DUPR hay quan hệ nhân quả từ chênh lệch điểm.

**Sau V3.3:** Dùng phản hồi trên sân để chuẩn hóa bài kiểm tra và cải thiện chiến thuật đánh đôi trước khi mở giáo án 4.0–5.0.

## V3.4 beta – Tách trang & module theo chức năng

**Đã triển khai**
- [x] Phân loại nội dung từ website một trang thành bảy trang: Tổng quan, HLV cá nhân, Trên sân, Học viện, Tiến bộ, Thi đấu, Dữ liệu.
- [x] URL trang `?page=`, liên kết tới section `#id`, hỗ trợ liên kết cũ và Back/Forward.
- [x] Giữ menu bốn mục cố định trên PC/iPad/iPhone và bổ sung điều hướng đủ bảy trang.
- [x] Tách JavaScript lớn khỏi `index.html` thành bốn module nghiệp vụ, giảm mã nhúng và giữ nguyên chức năng.
- [x] Bổ sung router/catalog/style cho trang, giữ DOM module đã mount để không reset timer khi đổi trang.
- [x] Các nút chuyển HLV ↔ sân ↔ lưu điểm và chiến thuật → HLV dùng đúng route.
- [x] Nhật ký trận đứng trước báo cáo chiến thuật; điều khiển xóa điểm mẫu đưa sang Dữ liệu.
- [x] Cập nhật PWA precache, kiểm thử unit và Playwright.
- [x] Tài liệu kỹ thuật [ARCHITECTURE.md](ARCHITECTURE.md).

**Chưa nghiệm thu**
- [ ] Kiểm thử CI/browser thực tế trên iPhone/iPad/PC (URL sâu, Back, offline, PWA update).
- [ ] Đo tốc độ tải trang từng page để quyết định lazy-load các module nặng ở phiên bản kế tiếp.
- [ ] Kiểm thử chuyển luồng giữa HLV, timer, kết quả và sao lưu trên nhiều thiết bị.
- [ ] Chưa có server-side routing; dùng query routing phù hợp GitHub Pages, không chia thành nhiều bản HTML độc lập.

**Ưu tiên V3.5:** kiểm thử giao diện thực tế và cải thiện performance/lazy loading trước khi tăng giáo trình 4.0–5.0.

## V3.5 Beta – Page Loading Performance

- [x] Không tải đồng loạt JS của cả 7 trang từ `index.html`; bộ khởi động chỉ còn 5 script.
- [x] Dynamic lazy-loading của từng trang với kiểm soát thứ tự phụ thuộc và tái sử dụng module.
- [x] Khởi tạo an toàn khi JS được tải sau `DOMContentLoaded`.
- [x] Chỉ yêu cầu `tactical-insights.css` và `training-evaluation.css` ở các trang sử dụng.
- [x] Hoãn font tải ngoài mà vẫn có font hệ thống dự phòng.
- [x] SW precache 14 tài nguyên lõi; cache script/style của trang sau khi đã truy cập.
- [x] Thêm bảng đo thời gian nạp module cho từng trang trong Dữ liệu, chỉ đo trên thiết bị.
- [x] Mở rộng test Node và Playwright để phát hiện tải trùng/lỗi luồng đa trang.
- [ ] Xác nhận GitHub Actions, WebKit/Chromium và kết quả iPhone/iPad thực.
- [ ] Đo Lighthouse/LCP/CLS/INP khi online và sau cache; so sánh với V3.4.
- [ ] Tối ưu tiếp HTML/DOM và kết hợp/giảm tệp nhỏ dựa trên số liệu thực tế.

**Thỏa hiệp offline:** trang chưa được mở online có thể chưa đủ module để hoạt động offline. Chi tiết trong [PERFORMANCE.md](PERFORMANCE.md).

## V3.6 beta – Đo tốc độ hiển thị và bảo đảm asset mới

- [x] Dùng PerformanceObserver cho FCP/LCP/CLS/interaction latency ước tính (khi trình duyệt hỗ trợ).
- [x] Đo thời gian route SPA tới khung hình sau khi module hoàn tất, tách khỏi số liệu lần mở trang đầu.
- [x] Nâng trang Dữ liệu thành dashboard hiệu năng cục bộ; không gửi telemetry.
- [x] Gắn version query `v=3.6.0` cho boot JS/CSS và các module tải theo trang.
- [x] Cập nhật cache PWA V3.6 để giảm nguy cơ script/CSS cũ sau deploy.
- [x] Bổ sung kiểm thử Node `tests/web-vitals.test.js` và browser route metrics.
- [ ] Nghiệm thu thực tế WebKit/Chromium, iPhone/iPad và kiểm tra nâng cấp PWA.
- [ ] Đo Lighthouse/Core Web Vitals để có baseline thực tế trước khi công bố cải thiện tốc độ.
- [ ] Tối ưu HTML/DOM và request mạng tiếp theo dựa trên báo cáo, không phỏng đoán.

- [x] Bổ sung tối ưu thực tế: bỏ `advanced.css` khỏi đường tải trang Tổng quan; chuyên trang mới tải khi cần, không nạp trùng.


## V3.7 Beta – Lazy HTML fragments & DOM reduction

- [x] Tách 12 khối giao diện chuyên môn ra khỏi `index.html` thành sáu mảnh HTML độc lập theo trang.
- [x] Giảm HTML khởi động ~42% về số ký tự; không nhầm với mức tăng hiệu năng thực tế.
- [x] Tải và kiểm tra fragment trước khi chạy JavaScript UI, không khởi tạo trùng.
- [x] Duy trì DOM/state khi Back/Forward và chuyển trang; cuộn đến deep link sau khi fragment có mặt.
- [x] Giữ module dùng chung và menu cố định bốn mục trên PC/iPad/iPhone.
- [x] Cache fragment theo lượt truy cập online; cập nhật phiên bản tài nguyên `3.7.0`.
- [x] Kiểm tra unique ID và mapping trang; bổ sung test Node/Playwright cho thiết bị responsive.
- [ ] Xác minh GitHub Actions/Chromium/WebKit chạy thành công.
- [ ] Kiểm thử offline/cache migration PWA V3.6 → V3.7 và dữ liệu cũ trên iPhone/iPad thật.
- [ ] Đo Lighthouse/TTFB/LCP/CLS/INP và thời gian route trước/sau để có số liệu hiệu năng thực.

**Ưu tiên V3.8:** tối ưu module DOM có chi phí dựng lớn dựa vào số liệu đo thật, kiểm tra tiếp sao lưu và cập nhật PWA.

## V3.8 Beta – Device profile benchmark, render optimization, PWA migration

- [x] Bộ benchmark tự động cho 4 profile màn hình, nhãn giả lập, có artifact JSON.
- [x] Giảm dựng lại DOM không cần thiết ở Học viện; dashboard cập nhật biểu đồ theo lô.
- [x] Nâng phiên bản PWA và bổ sung kiểm thử nâng cấp cache từ V3.6/V3.7.
- [x] Thêm test/CI cho thời gian tải và offline sử dụng trang đã cache.
- [ ] Xác nhận toàn bộ GitHub Actions chạy thành công trong Chromium/WebKit; sửa nếu phát hiện lỗi.
- [ ] Chạy benchmark thiết bị vật lý iPhone/iPad/PC và lưu số liệu trước–sau.
- [ ] Dùng kết quả thực tế để quyết định bước tối ưu tiếp theo (DOM, CSS, hydration).

## V3.9 Beta – Khắc phục CI và ổn định PWA

- [x] Đọc log GitHub Actions V3.8, xác nhận 54/55 unit tests đạt; lỗi duy nhất đến từ phép chờ 2 khung hình không xác định trong test Web Vitals.
- [x] Đổi test Web Vitals sang chờ điều kiện hoàn thành có deadline thay vì đợi số lượt event-loop cố định.
- [x] Giữ tài nguyên JS/CSS phiên bản cố định trong cache, không ghi đè ngầm bằng byte của release khác.
- [x] Nâng tên cache, URL tài nguyên và version package lên 3.9.0.
- [x] Đồng bộ các kiểm thử PWA/browser với phiên bản mới.
- [ ] Xác nhận CI V3.9 hoàn tất; sửa các lỗi browser nếu kết quả phát sinh.
- [ ] Chạy nghiệm thu trên iPhone/iPad thật, kiểm tra offline sau cập nhật, theo dõi Core Web Vitals.

**Trạng thái:** mã nguồn đã cập nhật, các workflow mới đang được GitHub Actions xử lý. Không công bố tốc độ cải thiện khi chưa có benchmark thành công.

## Kiểm tra CI V3.9 – 28/10/2026

Từ GitHub Actions run 40638439251: bước Node unit test đã đạt; Chromium/WebKit responsive còn lỗi. Các lỗi đã xác định gồm (1) kế hoạch được chọn ở HLV trước khi module Trên sân tải xong nên player không nhận kế hoạch; đã sửa bộ tải bằng cách phát lại sự kiện `pickleup:plan-selected` sau khi module Court sẵn sàng; (2) test page-fragments còn kiểm tra URL HTML phiên bản 3.7.0 dù runtime là 3.9.0; đã đồng bộ; (3) test lưu lượt tập chưa kiểm tra player sẵn sàng trước khi thao tác. CI mới được kích hoạt và phải chờ kết quả từ GitHub trước khi đánh dấu hoàn thành. Không xem 98 bài browser đã qua là toàn bộ suite đạt.

## V3.9 Stable – Đóng gói phát hành

- [x] CI trước phát hành trên commit `ea862e9f4`: unit và Chromium/WebKit responsive đều thành công.
- [x] Version `3.9.0`, sửa cache-first cố định cho tài nguyên phiên bản, thêm regression test SW.
- [x] Release notes và hướng dẫn nâng cấp.
- [ ] Xác nhận CI xanh sau toàn bộ các commit đóng gói bản Stable.
- [ ] Nghiệm thu PWA trên thiết bị iPhone/iPad vật lý.

## Xác nhận CI Node.js 24 – 28/10/2026

Lượt [GitHub Actions #40643096905](https://github.com/ndlong78/Pickleball/actions/runs/40643096905) ở commit `d28ce9a5e8d` đã **SUCCESS**: xác nhận Node.js 24, cài browser, JavaScript unit test và Playwright responsive đều thành công. Các commit tiếp theo chỉ thay đổi tài liệu cấu hình phát hành; chưa có phép đo iPhone/iPad vật lý. Phiên bản package `3.9.0`, service worker `pickleup-shell-v3-9-stable`.

## V4.0 Beta – Trải nghiệm học tập có tính liên tục

- Học viện ghi nhớ bài học được chọn gần nhất bằng `pickleup_academy_last_lesson_v4` (localStorage), tự khôi phục khi quay lại hoặc tải lại trang.
- Thanh tiến độ hiển thị số giáo án đã có kết quả hợp lệ (điểm 0–20) trên tổng 80 bài; không tự nhận là đã thành thạo hoặc đã hoàn thành kỹ thuật.
- Nút **Tiếp tục bài gần nhất** và **Bài chưa hoàn thành tiếp theo** dùng dữ liệu Học viện hiện có, không làm mất hoặc di chuyển dữ liệu điểm cũ.
- Giao diện responsive có nút mục tiêu chạm ít nhất 44px; Playwright có test trải nghiệm Học viện ở 390/820/1440px.
- PWA shell và asset lên `4.0.0-beta.1`, tách cache khỏi V3.9 Stable.
- Trạng thái: Beta; cần kiểm tra CI trên commit mới và nghiệm thu iPhone/iPad thật trước khi gọi Stable.

## V4.1 Beta – Thực hành theo từng bước

- [x] Mỗi giáo án Học viện có checklist sáu bước: khởi động, ba bài tập, kiểm tra, thả lỏng.
- [x] Tiến độ checklist lưu trong `pickleup_academy_steps_v41`, độc lập với điểm `/20` tại `pickleup_academy_v2`.
- [x] Hỗ trợ bỏ đánh dấu và làm lại checklist của riêng giáo án hiện tại mà không xóa điểm.
- [x] Thêm kiểm thử Playwright cho 390px, 820px và 1440px; kiểm tra lưu, khôi phục và reset.
- [x] Version `4.1.0-beta.1`, cache PWA riêng.
- [ ] Xác nhận CI V4.1 trên commit mới và nghiệm thu thiết bị thật.

## V4.2 Beta – Chế độ luyện tập tập trung

- [x] Học viện: bật/tắt chế độ hiển thị một bước tại một thời điểm, đọc hướng dẫn và chuyển bước trước/sau.
- [x] Ghi nhớ bước hiện tại theo từng giáo án với `pickleup_academy_focus_v42`.
- [x] Đánh dấu hoàn thành từ chế độ tập trung đồng bộ checklist V4.1 mà không sửa điểm đánh giá `/20`.
- [x] Tối ưu nút chạm cho điện thoại, máy tính bảng và PC; bổ sung bài test responsive V4.2.
- [x] Phiên bản `4.2.0-beta.1`, service worker cache riêng `pickleup-shell-v4-2-focus`.
- [ ] Xác nhận CI trên commit đóng gói cuối cùng và kiểm thử thực tế trên điện thoại.

## V4.2 Stable – Phát hành

- [x] Node.js 24 CI beta xanh: #40653222296.
- [x] Đồng hồ từng bước, tạm dừng khi ẩn trang, chuyển bước có xác nhận thủ công.
- [x] Chốt package v4.2.0, tách PWA cache stable và cập nhật hồi quy.
- [x] [Release notes](RELEASE_V4.2.0.md).
- [ ] Xác nhận CI của chính commit Stable cuối cùng.
- [ ] Nghiệm thu thực tế iPhone/iPad PWA offline.

## V4.3 Beta – Gợi ý luyện tập theo điểm thực tế

- [x] Gợi ý kỹ năng điểm thấp nhất dựa trên kết quả Học viện đã lưu, hoặc bài khởi đầu khi chưa có điểm.
- [x] Mở giáo án đề xuất ngay trên Học viện, không thay đổi dữ liệu điểm.
- [x] Thêm kiểm thử đề xuất theo dữ liệu và tình huống chưa có dữ liệu.
- [x] Version `4.3.0-beta.1` và cache PWA riêng, đồng bộ kiểm thử phiên bản.
- [ ] Xác nhận CI trên commit mới; chưa nghiệm thu iPhone/iPad vật lý.

## V4.4 Beta – Lịch sử và xu hướng kết quả Học viện

- [x] Lưu tối đa 500 lượt kiểm tra Học viện trong `pickleup_academy_history_v44` (không ghi đè điểm mới nhất V4.3).
- [x] Tính trung bình tối đa 3 lượt gần nhất theo cùng kỹ năng và cùng cấp độ, hiển thị biến động điểm khi có từ 2 lượt.
- [x] Không giả định lịch sử cho điểm cũ chỉ có một bản ghi; vẫn gợi ý từ dữ liệu V4.3 trước đây.
- [x] Sao lưu và khôi phục trường `academyHistory` với kiểm tra dữ liệu, giữ tương thích file backup cũ.
- [x] Unit tests cho giới hạn dữ liệu, trường hợp giảm/tăng điểm và phân loại cấp độ; Playwright 390px/820px/1440px.
- [x] Chạy unit tests trước khi cài browser, hủy các CI cũ bị phiên bản mới thay thế.
- [ ] Đạt CI của commit cuối cùng và kiểm thử PWA thực tế trên thiết bị.

## V4.5 Beta – Skill Insights trên trang Tiến bộ

- [x] Biểu đồ tối đa 12 lượt theo từng kỹ năng và cấp độ (không trộn độ khó cấp độ).
- [x] Chỉ tính biến động xu hướng từ các lượt kiểm tra lặp lại **cùng giáo án**, tối đa 6 lượt để tránh so sánh các bài khác nhau.
- [x] Bộ lọc cấp độ và kỹ năng, tóm tắt số lượt, điểm trung bình và chiều hướng thay đổi.
- [x] Gợi ý điều chỉnh thực hành với dữ liệu ít, giảm điểm, ổn định hoặc cải thiện.
- [x] Liên kết về Học viện và tiếp tục đúng giáo án được đề xuất.
- [x] Giữ nguyên localStorage V4.4 và xử lý một điểm V4.3 cũ mà không giả định xu hướng.
- [x] Node.js 24 unit tests + Playwright Chromium/WebKit ở 390/820/1440 px.
- [x] CI commit V4.5 cuối: [GitHub Actions #40668170539](https://github.com/ndlong78/Pickleball/actions/runs/40668170539) — success (Node.js 24, Unit, Chromium, WebKit).
- [ ] Nghiệm thu PWA trên iPhone/iPad vật lý và thử offline.

**Giới hạn:** Điểm từ bài khác nhau không phản ánh trực tiếp tiến bộ kỹ năng; nhận định chiều hướng chỉ từ cùng bài kiểm tra, tốt nhất thực hiện trong điều kiện tương tự.
