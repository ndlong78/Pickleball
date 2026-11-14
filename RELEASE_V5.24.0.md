# V5.24.0 — C3a: nền cho bài 4.0–5.0 (mã bài và cấp độ mở rộng)

## Thay đổi
- **Mã bài** hợp lệ mở rộng từ `PU-001…080` thành `PU-001…999` và `PU-1000…9999` (mỗi bài một cách viết) ở mọi chỗ kiểm tra dữ liệu của app.
- **Cấp độ** thêm `4.0–4.5` và `4.5–5.0` cho nội dung, lượt điểm Học viện, mục tiêu tuần và nhập dữ liệu. Giáo án cá nhân, nhật ký tập và các bài kiểm tra chuyển cấp/nâng cao vẫn trong 1.0–4.0.
- **Migration 8** (additive) nới hai domain `lesson_id`, `level_band` và ràng buộc mã bài của `legacy_score_snapshots`; có bản SQL Editor cho staging và pgTAP.
- Dữ liệu khách tham chiếu một bài không có trong thư viện (ví dụ bài do bản mới hơn thêm) không còn làm ẩn hay ghi đè phần dữ liệu còn lại.
- **Người tập chưa thấy gì khác:** vẫn 80 bài 1.0–4.0, giao diện không đổi.

## Tương thích và triển khai
- Không đổi/xóa khóa localStorage, không migrate dữ liệu khách, không đổi RLS/RPC/Auth hay dependency.
- Migration 8 **chưa áp dụng trên Supabase staging**; app V5.24.0 chạy bình thường với DB 7 migration vì chưa có dữ liệu nào dùng miền mới.
- Bài `PU-081+` chỉ được xuất bản ở bản phát hành sau. Thứ tự và hướng dẫn: [docs/LESSON_DOMAIN_C3.md](docs/LESSON_DOMAIN_C3.md).
- App/assets/PWA `5.24.0` (`pickleup-shell-v5-24-0-stable`); test nâng cấp xóa cache 5.23.0.
