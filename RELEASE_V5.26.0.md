# V5.26.0 — Bộ lọc cấp độ theo thư viện bài

## Thay đổi
- **Bộ lọc cấp độ** ở Học viện, mục tiêu tuần, biểu đồ tiến bộ và Tổng quan tiến bộ tự thêm cấp có bài đã xuất bản (ví dụ `4.0–4.5`). Trước đây 5 cấp viết cứng nên bài 4.0+ chỉ thấy ở "Tất cả".
- **Tiêu đề Học viện** ("N buổi tập từ … đến …") và nhãn "Toàn bộ …" tính theo thư viện.
- **Người tập chưa thấy gì khác:** thư viện vẫn 80 bài 1.0–4.0 nên các bộ lọc và tiêu đề giữ nguyên.

## Triển khai
- Owner đã áp dụng migration 8 trên Supabase staging ngày 14/11/2026 (`INSTALLED / 20261114000100`).
- Điều kiện còn lại để xuất bản bài 4.0+: [docs/LESSON_DOMAIN_C3.md mục 7](docs/LESSON_DOMAIN_C3.md).
- Không đổi localStorage/IndexedDB, SQL/RPC/RLS, Auth hay dependency.
- App/assets/PWA `5.26.0` (`pickleup-shell-v5-26-0-stable`); test nâng cấp xóa cache 5.25.0.
