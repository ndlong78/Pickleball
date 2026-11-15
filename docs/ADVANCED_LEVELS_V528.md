# V5.28.0 — HLV cá nhân nâng cao, kiểm tra nâng cao và phân tích trận lên 4.0–5.0

Trạng thái: **đã code (V5.28.0)**. Migration 9 (`20261115000100`) **chưa áp dụng trên Supabase staging**; khách (guest) dùng được ngay không cần database.

## 1. Phạm vi
| Phần | Trước | Từ V5.28.0 |
|---|---|---|
| HLV cá nhân **nâng cao** (`coach`, tạo giáo án 60 phút, đồng hồ trên sân) | 3.0–3.5, 3.5–4.0 | + 4.0–4.5, 4.5–5.0 |
| **Đánh giá kỹ năng nâng cao** (sáu chỉ số third/reset/movement/counter/doubles/decision) | 3.0–3.5, 3.5–4.0 | + 4.0–4.5, 4.5–5.0 |
| **Phân tích chiến thuật** trên trang Thi đấu (so sánh lượt đo, gợi ý trọng tâm sau trận) | 3.0–4.0 | 3.0–5.0 |
| Đánh giá buổi tập (V3.3) | 1.0–4.0 | 1.0–5.0 |
| **Nhật ký trận** (`match-journal`) | không có chiều cấp độ | không đổi |
| HLV cá nhân **cơ bản** và **Kiểm tra chuyển cấp V2.3** | 1.0–3.0 | **không đổi** (kiểm tra chuyển cấp V2.3 dẫn sang Đánh giá nâng cao từ 3.0) |

Nhật ký trận không gắn cấp độ nên không cần đổi; phần phân tích bên dưới nó là phần đã mở rộng.

## 2. Mốc đạt (đề xuất, chưa hiệu chỉnh)
Mốc nội bộ = trung bình sáu chỉ số ≥ A **và** từng chỉ số ≥ M.

| Nhóm | A | M | Ghi chú |
|---|---|---|---|
| 3.0–3.5 | 13 | 8 | giữ nguyên |
| 3.5–4.0 | 15 | 10 | giữ nguyên |
| **4.0–4.5** | **16** | **11** | mới; tiếp nối nhịp tăng 1–2 điểm mỗi nhóm; mục tiêu /20 của bài 4.0–4.5 là 14–15 |
| **4.5–5.0** | **17** | **12** | mới; mục tiêu /20 của bài 4.5–5.0 là 15–16 |

- Không phải DUPR, không chứng nhận trình độ; chỉ dùng để chọn giáo án.
- Hai mốc mới do Claude đề xuất cùng với 24 bài chưa có HLV duyệt; HLV nên chỉnh sau khi có dữ liệu thật.
- Mốc nằm ở hai nơi phải khớp nhau: `advanced-readiness.js` (khách) và `GATES` trong `modules/data/activity-source-core.js` (tài khoản). `tests/advanced-levels.test.js` kiểm cả hai khớp và tăng dần theo cấp.

## 3. Mã bài tập nâng cao
`ADV-PU-` + mã bài từ 037. Mẫu chuẩn mới: `^ADV-PU-(?:0(?:3[7-9]|[4-9][0-9])|[1-9][0-9]{2,3})$` (037…9999, một cách viết cho mỗi bài), giới hạn `week` 1…9999. Dùng ở: `advanced-coach-core`, `training-log-core`, `tactical-insights-core`, `modules/data/{activity-core,import-core,plan-core}` và migration 9. Test quét repo để không còn mẫu cũ (037…080).

## 4. Dữ liệu và tương thích
- **Không đổi khóa localStorage**, không migrate. Phiên bản giáo án vẫn `3.1`.
- Bản app cũ (≤ 5.27) coi giáo án/kiểm tra/lượt đo ở 4.0+ là dữ liệu không hợp lệ: **không ghi đè** (giao diện nâng cao đã chặn ghi khi danh sách cũ không hợp lệ) nhưng sẽ không tạo thêm được cho tới khi cập nhật; sao lưu V1 tạo từ bản mới có thể bị bản cũ từ chối. Rủi ro nhỏ, cùng loại với V5.24.0.
- Chế độ tài khoản (pilot, ẩn trên site công khai): cần migration 9, nếu chưa chạy thì server từ chối bản ghi 4.0+ và chúng nằm chờ trên thiết bị, không mất.

## 5. Migration 9 — `20261115000100_advanced_levels_extension.sql`
Chỉ **nới**; không viết lại hàng, không đổi quyền, chủ sở hữu, RLS hay RPC.
- `pickleup_private.plan_ok(jsonb,text,text)`: `create or replace` (giữ chữ ký, chủ sở hữu, `immutable`, `search_path=''`, các quyền EXECUTE); chỉ đổi mẫu mã bài tập nâng cao và giới hạn `week` thành 1…9999. Đã so sánh `pg_get_functiondef` trước/sau: khác đúng hai dòng.
- `personal_plans`: ràng buộc nguồn/cấp độ — nâng cao nhận thêm 4.0–4.5, 4.5–5.0.
- `skill_assessments`: ràng buộc loại/cấp độ — `advanced` nhận thêm hai nhóm; `stage` vẫn chỉ 1.0–3.0.
- `training_entries`: ràng buộc `exercise_id` nhận `ADV-PU-037…9999`.
- Ba ràng buộc không tên được tìm theo nội dung và phải **duy nhất**, nếu không migration dừng trước khi đổi gì.

### Áp dụng trên staging (operator)
1. Xác nhận đúng project staging `rfeoeagklmaqmkcdhprb` và lịch sử migration đang là 8 bản (mới nhất `20261114000100`).
2. Mở [staging_upgrade_20261115000100.sql](../supabase/manual/staging_upgrade_20261115000100.sql) từ đúng commit đã merge, dán vào SQL Editor, chạy một lần. Bản này tự kiểm PostgreSQL 17, lịch sử migration, sự tồn tại của `plan_ok` và miền mã bài/cấp độ của migration 8; sai thì dừng, không đổi gì.
3. Kết quả mong đợi: `INSTALLED / 20261115000100`. Kiểm tra chỉ đọc:
   ```sql
   select version from supabase_migrations.schema_migrations order by version;
   select count(*) from pg_constraint where conname in ('personal_plans_source_level_check','skill_assessments_type_level_check','training_entries_exercise_id_check');
   ```
   Phiên bản cuối phải là `20261115000100` và đếm ra 3.
- **Rollback:** migration chỉ nới nên không cần hoàn tác để app cũ chạy tiếp. Thu hẹp lại chỉ làm được khi chưa có hàng nào dùng giá trị mới (cần migration riêng, đếm trước).

## 6. Đã kiểm chứng và chưa kiểm chứng
- **Đã kiểm chứng (máy phát triển, PostgreSQL 16):** 9 migration chạy từ trống trên schema thật; cả 8 tệp pgTAP (001–008, qua bản giả lập sáu hàm pgTAP vì máy không có extension) pass; bản SQL staging chạy trên DB 8 migration có dữ liệu sẵn cho `INSTALLED`/`VERIFIED`, giữ nguyên hàng cũ và tự dừng khi lịch sử sai; test 008 fail đúng 8 mục "được nhận" trước migration.
- **Chưa kiểm chứng:** PostgreSQL 17 và pgTAP thật, Supabase local đầy đủ — chỉ CI chạy được; DB staging thật; thiết bị thật.

## 7. Giới hạn đã biết
- **Luân phiên ở 4.0–5.0 (đã khắc phục ở V5.29.0):** V5.28.0 chỉ có 12 bài mỗi nhóm nên ô "third" lặp ở buổi thứ ba. V5.29.0 bổ sung 16 bài (`PU-105…120`, mỗi nhóm 20 bài) cho `third-drop`, `transition-reset`, `kitchen-pressure`, `doubles-coverage`; đo trên sáu buổi liên tiếp: hai ô đầu không lặp, ô thứ ba có 4 bài khác nhau; không bài nào lặp trong cùng một buổi.
- Mục tiêu /20, mốc đạt và nội dung 24 bài chưa có HLV duyệt.
- Kiểm tra chuyển cấp V2.3 vẫn dừng ở 3.0; từ 3.0 dùng Đánh giá kỹ năng nâng cao.
