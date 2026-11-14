# C3 — Mở rộng mã bài và cấp độ 4.0–5.0

Trạng thái: **C3a (V5.24.0), C3b (V5.25.0) và bộ lọc cấp độ theo thư viện (V5.26.0) đã code.** Thư viện vẫn 80 bài 1.0–4.0. **Migration 8 đã được owner áp dụng trên Supabase staging ngày 14/11/2026** qua bản SQL Editor, kết quả báo `INSTALLED / 20261114000100` (owner báo; chưa có kiểm chứng độc lập từ CI với DB staging).

## 1. Quyết định của owner (14/11/2026)
- Bài 4.0–5.0 chia **hai nhóm `4.0–4.5` và `4.5–5.0`**, cùng cách chia 0,5 điểm như các cấp dưới.
- Nội dung do Claude soạn ở trạng thái **nháp**, HLV duyệt rồi mới xuất bản qua CMS.

## 2. Miền dữ liệu mới
| | Trước | Từ C3a |
|---|---|---|
| Mã bài | `PU-001`…`PU-080` | `PU-001`…`PU-999` và `PU-1000`…`PU-9999` |
| Cấp độ | 5 nhóm tới `3.5–4.0` | thêm `4.0–4.5`, `4.5–5.0` |

- Mỗi bài chỉ có **một cách viết**: `PU-081` hợp lệ; `PU-0081`, `PU-81`, `PU-000` bị từ chối. Regex client: `^PU-(?:0(?:0[1-9]|[1-9][0-9])|[1-9][0-9]{2,3})$`; SQL dùng cùng biểu thức.
- Áp dụng cho: nội dung (`content-core`), lượt điểm Học viện, điểm gần nhất, lựa chọn bài, check-in gắn bài, trạng thái thực hành trên thiết bị, mục tiêu tuần (cấp độ), sao lưu V1, nhập vào tài khoản.
- **Không đổi:** giáo án cá nhân, nhật ký tập, kiểm tra chuyển cấp và kiểm tra nâng cao vẫn giới hạn 1.0–4.0 (client và ràng buộc bảng riêng); mã bài tập `ADV-PU-037…080` giữ nguyên.
- `tests/lesson-domain.test.js` quét repo: không còn regex cũ, mọi chỗ dùng đúng một biểu thức, và migration SQL khớp danh sách cấp độ.

## 3. Migration 8 (`20261114000100_lesson_domain_expansion.sql`)
- Thay ràng buộc của hai domain `pickleup_private.lesson_id`, `pickleup_private.level_band` và ràng buộc `source_key` của `legacy_score_snapshots`. **Chỉ nới**: mọi giá trị cũ vẫn hợp lệ, không viết lại hàng, không đổi quyền, RLS, hàm hay RPC.
- CI: reset từ rỗng, nâng cấp từ fixture cũ, pgTAP `007_lesson_domain.test.sql`, và chạy bản SQL Editor trên DB 7 migration.

### Áp dụng trên staging (operator, khi sẵn sàng)
1. Xác nhận đúng project staging `rfeoeagklmaqmkcdhprb` và lịch sử đang là 7 migration (mới nhất `20261111000100`).
2. Mở [staging_upgrade_20261114000100.sql](../supabase/manual/staging_upgrade_20261114000100.sql) từ đúng commit đã merge, dán vào SQL Editor, chạy một lần. Bản này tự kiểm tra PostgreSQL 17, lịch sử migration và tên ràng buộc; sai thì dừng, không đổi gì.
3. Kết quả mong đợi: `INSTALLED / 20261114000100`. Kiểm tra chỉ đọc:
   ```sql
   select version from supabase_migrations.schema_migrations order by version;
   select 'PU-081'::pickleup_private.lesson_id, '4.5–5.0'::pickleup_private.level_band;
   ```
- **Rollback:** migration chỉ nới miền nên không cần hoàn tác để app cũ chạy tiếp. Nếu buộc phải thu hẹp lại, chỉ làm được khi chưa có hàng nào dùng giá trị mới; đó là migration riêng, phải kiểm đếm trước.

## 4. Thứ tự phát hành bắt buộc
Bản app cũ (≤ 5.23.0) coi mã `PU-081+` hoặc cấp 4.0+ là dữ liệu hỏng: lịch sử điểm khách có thể bị đọc thành rỗng và **bị ghi đè khi lưu lượt mới**, tệp sao lưu bị từ chối. Vì vậy:
1. **V5.24.0 (bản này):** app chấp nhận miền mới, chưa có nội dung nào dùng nó.
2. **Áp dụng migration 8 trên staging** trước khi có bài mới được xuất bản; nếu chưa, lượt điểm bài mới của tài khoản bị server từ chối và nằm chờ trên thiết bị (không mất).
3. **Bài `PU-081+` chỉ được xuất bản ở bản phát hành sau V5.24.0**, khi người dùng đã nhận bản PWA mới. Không gộp bài mới vào cùng bản với C3a.

## 5. C3b (V5.25.0): thêm bài qua CMS, chỉ nạp bài đã xuất bản
- Adapter trong `curriculum.js` và `advanced-curriculum.js` chỉ đưa bài `status = published` vào thư viện của app. Bài `draft`, `review`, `retired` vẫn nằm trong tệp cho CMS và lịch sử. Dữ liệu người tập trỏ tới bài không còn trong thư viện được giữ nguyên (đã có test từ C3a).
- Tệp hiện hành **bắt buộc** dùng adapter mới; adapter V5.21–V5.24 chỉ được chấp nhận cho tệp base khi CI so sánh, để một bản CMS cũ không thể xuất tệp làm lộ bài nháp.
- CMS: **+ Thêm bài mới** tạo bài nháp với mã kế tiếp, `revision 1`, phiên bản đề 1, cấu trúc 10 + 12/12/15 + 6 + 5 phút. Bài từ 3.0 là bài chiến thuật (`advanced`, có `focus`); bài dưới 3.0 thì không.
- Validator: `week` bằng số trong mã bài; bài mới phải có mã lớn hơn mọi mã đã có (không dùng lại mã) và bắt đầu ở revision 1/phiên bản đề 1.

## 6. Bộ lọc cấp độ theo thư viện (V5.26.0)
- `advanced-curriculum.js` công bố `PICKLEUP_LESSON_LEVELS` (các cấp có ít nhất một bài đã xuất bản), `PICKLEUP_LESSON_RANGE` và `PICKLEUP_FILL_LEVELS(select)`.
- Bốn bộ lọc `#academyLevel`, `#wgLevel` (mục tiêu tuần), `#aiLevel` (biểu đồ tiến bộ), `#dbLevel` (Tổng quan tiến bộ) giữ các lựa chọn trong markup và tự thêm cấp mới khi có bài. Tiêu đề Học viện ("N buổi tập từ … đến …") và nhãn "Toàn bộ …" tính theo thư viện.
- Với thư viện hiện tại (80 bài) giao diện không đổi; có test cho cả hai trường hợp.
- Chưa đổi: HLV cá nhân, kiểm tra chuyển cấp/nâng cao, nhật ký trận và đánh giá buổi tập vẫn 1.0–4.0 theo thiết kế C3a. Câu mô tả "44 giáo án chiến thuật…" trong Học viện là văn bản tĩnh, cần sửa cùng lúc xuất bản bài mới.

## 7. Điều kiện để xuất bản bài 4.0+
1. Migration 8 trên staging: **đã xong** (owner, 14/11/2026).
2. App có bộ lọc cấp độ mới: từ V5.26.0.
3. Người dùng đã nhận bản PWA ≥ 5.24.0 (bản cũ hơn có thể ghi đè lịch sử khách khi gặp mã bài mới): nên chờ vài ngày sau khi V5.26.0 phát hành.
4. HLV duyệt nội dung và chuyển trạng thái sang "Đang dùng" qua CMS.

## 8. C3c (V5.27.0): bản nháp nội dung
24 bài nháp `PU-081…104` đã có trong `curriculum.js` ở trạng thái `draft`; xem [DRAFT_LESSONS_4_0_5_0.md](DRAFT_LESSONS_4_0_5_0.md). Việc còn lại thuộc HLV/owner: duyệt, sửa và xuất bản theo mục 7.
