# C3 — Mở rộng mã bài và cấp độ 4.0–5.0

Trạng thái: **C3a (V5.24.0) đã code**: app và migration 8 chấp nhận miền mới. **Chưa có bài mới, chưa đổi giao diện.** Migration 8 chỉ chạy trên Supabase local/CI; **chưa áp dụng trên staging**.

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

## 6. Việc tiếp theo
- **Bộ lọc cấp độ trong app** (Học viện, Tiến bộ, mục tiêu tuần) còn viết cứng 5 cấp và chữ "80 buổi"; phải lấy theo thư viện bài **trước khi** xuất bản bài 4.0+. Hiện bài 4.0+ đã xuất bản chỉ thấy được ở bộ lọc "Tất cả".
- **C3c:** bản nháp nội dung `4.0–4.5` và `4.5–5.0` để HLV duyệt.
