# V5.27.0 — C3c: 24 bài nháp 4.0–4.5 và 4.5–5.0 chờ HLV duyệt

## Thay đổi
- `curriculum.js` có thêm **24 bài nháp** `PU-081…PU-104`: 12 bài `4.0–4.5`, 12 bài `4.5–5.0`, hai bài cho mỗi nhóm trọng tâm (quyết định cú thứ ba, reset nâng cao, counter volley, đội đôi nâng cao, thủ sang công, ra quyết định).
- Tất cả ở trạng thái **Nháp**: không hiện cho người tập. Thư viện đã xuất bản vẫn 80 bài 1.0–4.0; 80 bài cũ giữ nguyên từng byte.
- Nội dung do Claude soạn, **chưa có HLV duyệt và chưa thử trên sân**. Danh sách, giới hạn và cách duyệt: [docs/DRAFT_LESSONS_4_0_5_0.md](docs/DRAFT_LESSONS_4_0_5_0.md).

## Tương thích và hiệu năng
- Không đổi code ứng dụng, localStorage/IndexedDB, SQL/RPC/RLS hay Auth.
- `curriculum.js` sau gzip: 13,9 KB → 24,0 KB (đo bằng `gzip -c`), do tệp chứa cả bài nháp.
- App/assets/PWA `5.27.0` (`pickleup-shell-v5-27-0-stable`); test nâng cấp xóa cache 5.26.0.
