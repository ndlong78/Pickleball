# V5.28.0 — HLV cá nhân nâng cao, kiểm tra nâng cao và phân tích trận lên 4.0–5.0

## Thay đổi
- **HLV cá nhân nâng cao** tạo được giáo án 60 phút cho nhóm **4.0–4.5** và **4.5–5.0** từ các bài 4.0–5.0 của Học viện (sáu chỉ số, ba ưu tiên, luân phiên bài, đồng hồ trên sân, điểm sau tập).
- **Đánh giá kỹ năng nâng cao** có thêm hai nhóm. Mốc đạt đề xuất: 4.0–4.5 trung bình ≥ 16 và từng mục ≥ 11; 4.5–5.0 trung bình ≥ 17 và từng mục ≥ 12 (**chưa hiệu chỉnh trên sân**, không phải DUPR).
- **Phân tích chiến thuật** trang Thi đấu và **đánh giá buổi tập** nhận các nhóm mới; lượt đo ở các nhóm không bao giờ trộn nhau.
- Nhật ký trận không gắn cấp độ nên không đổi. HLV cơ bản và Kiểm tra chuyển cấp V2.3 vẫn 1.0–3.0 (phần chuyển cấp V2.3 nay trỏ sang Đánh giá nâng cao từ 3.0).
- Mã bài tập nâng cao hợp lệ từ `ADV-PU-037` đến `ADV-PU-9999` (trước đây dừng ở 080); `week` tới 9999.
- **Migration 9** `20261115000100` (additive) cho Supabase staging, kèm bản SQL Editor, pgTAP 008 và bước CI nâng cấp. **Chưa áp dụng trên staging**; chế độ khách không cần.
- Lưu ý nội dung: ở 4.0–5.0 mỗi nhóm chỉ 12 bài nên luân phiên ngắn hơn (có thể lặp lại bài sau khoảng hai buổi); trang HLV có ghi chú.

## Tương thích và dữ liệu
- Không đổi/xóa khóa localStorage, không migrate; phiên bản giáo án vẫn `3.1`; không đổi RLS/RPC/Auth hay dependency.
- Bản app ≤ 5.27 sẽ không đọc được dữ liệu 4.0+ (không bị ghi đè, nhưng không tạo thêm được tới khi cập nhật).
- Chi tiết, cách áp dụng migration và phần đã/chưa kiểm chứng: [docs/ADVANCED_LEVELS_V528.md](docs/ADVANCED_LEVELS_V528.md).
- App/assets/PWA `5.28.0` (`pickleup-shell-v5-28-0-stable`); test nâng cấp xóa cache 5.27.0.
