# V5.27.0 — C3c: Học viện có 24 bài 4.0–4.5 và 4.5–5.0

## Thay đổi
- **Xuất bản 24 bài mới** `PU-081…PU-104`: 12 bài `4.0–4.5`, 12 bài `4.5–5.0`, hai bài cho mỗi nhóm trọng tâm (quyết định cú thứ ba, reset nâng cao, counter volley, đội đôi nâng cao, thủ sang công, ra quyết định). Học viện thành **104 bài 1.0–5.0**.
- Bộ lọc cấp độ ở Học viện, mục tiêu tuần, biểu đồ tiến bộ và Tổng quan tiến bộ có thêm `4.0–4.5`, `4.5–5.0`; các dòng mô tả số bài được cập nhật.
- 80 bài cũ giữ nguyên từng byte.

## Giới hạn cần biết
- Nội dung do Claude soạn và được xuất bản theo yêu cầu owner; **chưa có HLV duyệt, chưa thử trên sân**, mục tiêu /20 là đề xuất ban đầu. Trang Học viện ghi rõ điều này và nhắc giảm lực, dừng khi đau.
- HLV cá nhân, kiểm tra chuyển cấp/nâng cao, nhật ký trận và đánh giá buổi tập vẫn chỉ tới 4.0.
- Một máy còn chạy bản ≤ 5.23.0 mà đọc dữ liệu có bài mới (tệp sao lưu từ bản mới, tab cũ chưa tải lại) có thể coi là dữ liệu hỏng. Chi tiết: [docs/DRAFT_LESSONS_4_0_5_0.md](docs/DRAFT_LESSONS_4_0_5_0.md).

## Tương thích và hiệu năng
- Không đổi localStorage/IndexedDB, SQL/RPC/RLS hay Auth. Migration 8 đã chạy trên Supabase staging (owner báo).
- `curriculum.js` sau gzip: 13,9 KB → 24,0 KB (đo bằng `gzip -c`).
- App/assets/PWA `5.27.0` (`pickleup-shell-v5-27-0-stable`); test nâng cấp xóa cache 5.26.0.
