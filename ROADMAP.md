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
| V2.3 | Kiểm tra chuyển cấp, nhận diện lỗ hổng kỹ năng | Chưa làm |
| V2.4 | Giáo án thích ứng dựa trên điểm yếu | Chưa làm |
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
