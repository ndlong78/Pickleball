# V5.25.0 — C3b: CMS thêm bài mới, app chỉ nạp bài đã xuất bản

## Thay đổi
- **App chỉ nạp bài "Đang dùng" (published).** Bài nháp, chờ duyệt và ngừng dùng vẫn nằm trong `curriculum.js` nhưng không hiện cho người tập. Dữ liệu cũ trỏ tới bài không còn trong thư viện được giữ nguyên.
- **CMS: + Thêm bài mới.** Chọn cấp độ (gồm `4.0–4.5`, `4.5–5.0`), kỹ năng và trọng tâm chiến thuật; bài nhận mã kế tiếp, trạng thái Nháp, cấu trúc buổi 60 phút cố định. Có nút bỏ bài mới chưa xuất bản.
- **Kiểm tra nội dung (CMS và CI):** mã bài mới phải lớn hơn mọi mã đã có và bắt đầu ở revision 1/phiên bản đề 1; `week` khớp mã bài; bài từ 3.0 phải là bài chiến thuật có trọng tâm. Tệp hiện hành phải dùng adapter mới có lọc trạng thái.
- **Người tập chưa thấy gì khác:** vẫn 80 bài 1.0–4.0. `curriculum.js` chỉ đổi dòng adapter cuối tệp; 80 bài giữ nguyên từng byte.

## Tương thích và triển khai
- Không đổi localStorage/IndexedDB, SQL/RPC/RLS, Auth hay dependency.
- Trước khi chuyển một bài 4.0+ sang "Đang dùng": migration 8 phải chạy trên Supabase staging và app cần bộ lọc cấp độ mới (PR sau). Xem [docs/LESSON_DOMAIN_C3.md](docs/LESSON_DOMAIN_C3.md).
- App/assets/PWA `5.25.0` (`pickleup-shell-v5-25-0-stable`); test nâng cấp xóa cache 5.24.0.
