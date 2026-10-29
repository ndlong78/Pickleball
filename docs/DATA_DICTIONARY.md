# PickleUp V6 — data dictionary và legacy inventory

Đề xuất PR0, chưa phải SQL đang chạy. Baseline `8f99fcb329cbac89b92413929dcdd113fd87790e`, V5.1.0. [Kiến trúc](ARCHITECTURE_V6_DATABASE.md) quyết định quyền ghi/CAS; [runbook](MIGRATION_RUNBOOK.md) quyết định import/rollback.

## 1. Toàn bộ storage keys hiện có

Inventory từ toàn bộ JS ứng dụng (không tính tests/node_modules): **18 localStorage keys**, không có user database IndexedDB/sessionStorage hiện hành. CacheStorage của SW là asset cache. Bảng ghi shape đang lưu, không hứa validator cũ kiểm tra mọi trường của shape đó. Dấu “—” nghĩa không có trong backup tổng `schemaVersion:1`.

| localStorage key | Shape/ý nghĩa; module sở hữu ghi | Field backup tổng | Đích V6 |
|---|---|---|---|
| `pickleup_scores` | Object index `0`…`5` → `{score:0..20,date}`; `weekly-practice.js`, backup | `scores` | `legacy_score_snapshots`, không biến sáu điểm mới nhất thành lịch sử nhiều lượt |
| `pickleup_assessment_v1` | `{schemaVersion:1,answers:{serve,return,dink,volley,position,strategy},date}`; mỗi answer 0/1/2; `assessments-and-backup.js` | `assessment` | `skill_assessments` type self, thang 0–2 riêng |
| `pickleup_academy_v2` | Object `PU-001`…`PU-080` → `{score,date}`; `academy-page.js` | `academy` | `legacy_score_snapshots` Academy latest + projection attempts, không tạo duplicate history |
| `pickleup_academy_history_v44` | Array `{id:lessonId,skill,level,score,date}`, tối đa 500 khi append; academy/trends | `academyHistory` | `academy_attempts` |
| `pickleup_stage_checks_v23` | Array `{id,level,values:{6 skills},average,ready,date}`; `stage-assessment.js` | `stageChecks` | `skill_assessments` type stage, 0–20 |
| `pickleup_advanced_checks_v3` | Array `{id,level,values:{third,reset,movement,counter,doubles,decision},average,ready,date}`; `advanced-readiness.js` | `advancedChecks` | `skill_assessments` type advanced, không đổi metric thành sáu skill cơ bản |
| `pickleup_plans_v24` | Array plan version `2.4`, `{id,createdAt,level,scores,exercises[3],checkpoint,minutes,completedAt,checkScore,…}`; `personalized-ui.js` | `personalPlans` | `personal_plans` source basic, snapshot + CAS sửa điểm |
| `pickleup_advanced_plans_v31` | Array plan version `3.1`, advanced metrics/scores, 3 exercises `ADV-PU-*`, matchFocus optional; `advanced-coach-ui.js` | `advancedPlans` | `personal_plans` source advanced |
| `pickleup_selected_plan_v31` | `{source:'basic'|'advanced',id}`; hai coach UI | `selectedPlan` | `user_selections`, mapping tới plan UUID cùng owner |
| `pickleup_practice_state_v25` | `{planId,index:0..6,remaining:0..900,running,deadline,ended}`; `practice-runner.js`/clock | — | Local device state, không sync running timer |
| `pickleup_training_log_v26` | Array `{id,planId,exerciseId,skill,level,kind:'drill'|'assessment',hits:0..20,attempts:20,date,note,conditions?}`; training-log-core, runner/coach gọi ghi | `trainingLog` | `training_entries`, không attendance |
| `pickleup_match_journal_v3` | Array `{id,date,mode:'singles'|'doubles',ours,theirs,focus,note,doublesIssue?}`; `match-journal.js` | `matchJournal` | `match_records` |
| `pickleup_academy_last_lesson_v4` | String ID lesson (không phải JSON string); Academy/Journey/goals/plan/insights UI | — | `user_selections.selected_academy_lesson_id` |
| `pickleup_academy_steps_v41` | Object lesson ID → array indices 0…5; Academy | — | Local checklist theo device; giữ raw trong export V6 |
| `pickleup_academy_focus_v42` | Object lesson ID → index 0…5; Academy | — | Local focus theo device; không nhầm focus timer (chỉ RAM) |
| `pickleup_weekly_goal_v46` | `{days:1..5,level}`; goals UI/core | `weeklyGoal` | `user_preferences.target_days,level_band` + cờ configured |
| `pickleup_week_plan_v47` | `{minutes:20|30|45|60,gentle:boolean}`; plan UI/core | `weeklyPlan` | `user_preferences.session_minutes,gentle` |
| `pickleup_week_checkins_v48` | `{schemaVersion:1,entries:{'YYYY-MM-DD':{status:'done'|'skipped',minutes,lessonId:null|PU-id,updatedAt}}}`; checkins/Journey UI/core | `weeklyCheckins` | `practice_checkins`, clear mới là tombstone CAS |

Tất cả 14 nhóm backup có thể được restore ghi lại bởi `assessments-and-backup.js`; đó là writer chung ngoài writer nghiệp vụ trong bảng. Readers/route dependencies đầy đủ ở mục 2 [kiến trúc](ARCHITECTURE_V6_DATABASE.md). Performance metrics/web vitals giữ runtime, không là dữ liệu người chơi cần migrate. Timer tuần mẫu và Academy focus timer không có key riêng.

## 2. Validator và giới hạn legacy cần giữ tương thích

- Sáu skill cơ bản: serve/return/dink/volley/position/strategy. Level: `1.0–2.0`, `2.0–2.5`, `2.5–3.0`, `3.0–3.5`, `3.5–4.0` (en dash trong chuỗi legacy); basic stage/plan chỉ 3 band đầu, advanced chỉ 2 band cuối. Mã chuẩn V6 có mapping rõ, không replace chuỗi tùy tiện.
- Backup tổng chỉ nhận `app:'PickleUp', schemaVersion:1`, `scores` bắt buộc là object và file **≤1.000.000 bytes**. Các field sau là optional. Date ở scores chỉ kiểm string; Academy latest importer kiểm score/ID nhưng không bắt date hợp lệ; stageChecks không kiểm đầy đủ date/id/average. V6 cần quarantine thiếu timestamp, không tự dùng năm 1970 hoặc thời điểm import như thời điểm tập.
- Academy history validator: max500, lesson regex, skill regex `[a-z][a-z-]{0,39}` (rộng hơn enum domain), level string ≤30, score nguyên 0–20, date parse được ≤40 ký tự. Không siết rồi âm thầm mất những legacy rows được validator cũ nhận.
- Stage writer không cap nhưng importer cap300; basic plans importer cap100; advanced checks cap200 và writer cắt200; advanced plans validator cap100. Dữ liệu trên máy vượt limit backup importer vẫn phải raw-export và preview được, không trim để “hợp lệ”.
- Training log cap1000, ID/planId ≤100; exercise basic `skill-[1-4]` hoặc `ADV-PU-037`…`080`; note ≤240, conditions optional. Match cap500, score hai bên nguyên0–99, note≤280, focus allowlist trong match-journal, doublesIssue optional. Giữ các enum này trong schema versioned, không suy từ free text.
- Conditions nếu có gồm feed `partner|machine|rally`, pace `slow|moderate|match`, target `wide|standard|narrow`; thiếu thì unknown/legacy, không mặc định là cùng điều kiện. DoublesIssue `middle|communication|transition|third|none`.
- Checkins max1095 ngày; done minutes nguyên5–180, skipped minutes null; lessonId nullable; updatedAt parse được ≤40; `change()` không nhận ngày tương lai. `valid()` nhận shape ngày hợp lệ nhưng không kiểm tương lai. Clear V5 xóa entry, không lưu dấu vết; **không thể tái tạo tombstone lịch sử từ chỗ trống**.
- Default goal3/band đầu và plan45/gentle false là read fallback, không chứng minh user từng cấu hình. Backup exporter normalize defaults, có thể không phân biệt chưa lưu. V6 lưu configured/provenance rõ khi có evidence; backup thiếu evidence để unknown, không tự đánh dấu hoàn thành bước Journey.

## 3. Quy ước database V6

Mọi dữ liệu private: `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`; UUID `id` cho entity/event, server timestamps `created_at/updated_at timestamptz`, `revision bigint >=1`, `deleted_at timestamptz NULL` khi có soft-delete. Event nội dung bất biến; tombstone chỉ qua delete RPC. Index unique `(user_id,id)` để composite FK chống tham chiếu chéo. Server-managed không nhận từ client. bigint cursor serialize thành decimal string trong JS để tránh mất precision >2^53.

`occurred_at timestamptz NULL` là thời điểm hoạt động nếu source hợp lệ; `recorded_at` server nhận, `client_created_at` metadata không quyết định conflict. `source_kind`, `legacy_source_id`, `source_path`, `source_fingerprint` theo dõi provenance. Không dùng legacy ID toàn cục làm PK. Missing timestamps/unknown enum được giữ raw/quarantine, không ép vào bảng chuẩn sai nghĩa.

| Bảng | Key / cột riêng và constraint | Write policy |
|---|---|---|
| `profiles` | PK user_id; timezone IANA hợp lệ, display_name nullable ≤80 | CAS; không copy email khỏi Auth |
| `user_preferences` | PK user_id; target_days1–5, level_band enum5 bands, session_minutes20/30/45/60, gentle bool, goal_configured nullable bool/provenance | CAS; chỉ mục tiêu hiện tại |
| `personal_plans` | id UUID; source basic/advanced; legacy_id nullable, schema_version, level_band, plan_snapshot JSONB, check_score0–20 nullable, completed_at nullable | Create snapshot, sửa kết quả CAS; không coi completed_at là attendance |
| `academy_attempts` | id UUID; client_event_id UUID unique/user, lesson_id PU-001…080, skill/level, score integer0–20, occurred_at, content_version/snapshot, conditions nullable | Append event; không unique theo lesson hoặc score |
| `skill_assessments` | id/event UUID unique/user; assessment_type self/stage/advanced, scale2 hoặc20, scores JSONB, level nullable tùy type, average/ready optional derived snapshot, occurred_at | Append; self6 skill0–2, stage6 skill0–20, advanced6 metric0–20; kiểm exact keys và type |
| `legacy_score_snapshots` | id UUID, source_namespace weekly/academy, source_key, score0–20, source_date nullable, source raw reference; unique/user/import item | Giữ latest cũ chưa có event; không tính thêm lượt nếu history tương ứng đã có |
| `practice_checkins` | PK `(user_id,local_date date)`; status done/skipped hoặc null khi tombstone, minutes integer5–180 nếu done; skipped/tombstone null minutes; lesson_id nullable; timezone_at_entry nullable cho legacy unknown, manual provenance | CAS cho done/skipped/clear; deleted_at khác null loại khỏi statistics; server validate không future trong timezone snapshot |
| `training_entries` | id/event UUID unique/user; legacy_id, plan_id UUID nullable, legacy_plan_id giữ khi orphan, exercise_id, skill, level, kind, hits0–20, attempts=20, note≤240, conditions JSONB, occurred_at | Append, giữ orphan lịch sử có chú thích; không tạo plan giả |
| `match_records` | id/event UUID unique/user; mode, ours/theirs integer0–99, focus allowlist11, note≤280, doubles_issue nullable enum, occurred_at | Append; tombstone khi xóa; không thu thập tên đối thủ mặc định |
| `user_selections` | PK user_id; selected_academy_lesson_id nullable; selected_personal_plan_id nullable; composite FK `(user_id,plan_id)` | CAS; target phải cùng owner và không deleted; restore selection sau plan |
| `legacy_imports` | id UUID; unique `(user_id,source_fingerprint)`; adapter_version, source_schema, manifest_hash, status staging/committed/needs_review, counts/report | Import RPC; receipt completion chỉ sau reconcile; không lưu nguyên backup plaintext mặc định |
| `legacy_import_items` | unique `(user_id,import_id,source_path)`; target entity/id, item_hash, batch/status/report code; composite FK import cùng owner | Chống retry theo item, giữ mapping/correction/conflict; không client DML |
| `sync_receipts` | unique `(user_id,operation_id)`; request_hash, protocol_version, result_code/result_revision, created_at | Private server ledger, response chỉ operation của user; giữ suốt pilot |
| `sync_heads` | PK user_id; server_revision bigint monotonic trong transaction lock | Private counter, không client DML |
| `sync_changes` | PK `(user_id,server_revision)`; entity_kind allowlist, entity_key, record_revision, row_snapshot JSONB, deleted_at | Private log có RLS/owner filter, đọc qua pull RPC; không public SELECT cả ledger |

Composite FK selection tới plan cần kiểm cả trạng thái soft-delete bằng RPC/trigger; FK SQL đơn thuần chỉ kiểm tồn tại. Plan delete phải clear selection có revision/change log trong cùng transaction, hoặc trả dependency conflict có preview; không cascade âm thầm xóa lịch sử training. Legacy plan ID trùng giữa hai source/import không unique toàn user: mapping `(user,import,source,path)` là nguồn chuẩn, source/legacy_id chỉ candidate trùng để review.

Đề xuất giới hạn mới để triển khai và test trong PR1: operation≤256 KiB UTF-8, plan_snapshot≤64 KiB, event JSON≤16 KiB, import batch≤100 items và≤512 KiB, pull page≤200 changes; JSON object exact schema, depth≤12. Import file raw lớn hơn limit legacy chia local batches, không silently truncate. Đây là cap V6 mới cần benchmark, không mô tả là giới hạn đang chạy. Cột số/range/enum/FK/CHECK được DB enforce; JSON schema/size enforce cả RPC và DB function/constraint versioned, không chỉ JS.

Index ban đầu: user_id là prefix của PK/unique hoặc index riêng cho mọi bảng RLS; `(user_id,occurred_at DESC,id)` trên event tables; `(user_id,lesson_id,occurred_at DESC,id)` cho Academy; checkins PK theo user/date; change log PK hỗ trợ cursor. Không thêm duplicate index user_id nếu prefix đã đủ. Kiểm `EXPLAIN` trên synthetic pilot trước thêm index.

## 4. IndexedDB V6 dự kiến

| Store | Key và nội dung | Bất biến |
|---|---|---|
| `records` | `[namespace,kind,id]`, server base/revision + local overlay/provenance | Không overwrite overlay khi pull |
| `outbox` | `[namespace,operation_id]`, immutable request, expected_revision, depends_on, state, attempt metadata | Ghi cùng local record trong một transaction |
| `conflicts` | `[namespace,conflict_id]`, base/local/remote/revision + quyết định | Không mất local intent; resolve gửi operation mới |
| `sync_cursor` | `[namespace,protocol]`, last revision/H | Cập nhật cùng transaction apply page |
| `import_receipts` | `[namespace,fingerprint,adapter_version]`, manifest/item map/counts | Resume sau crash, không đánh complete trước server ack |
| `legacy_snapshots` | `[installation_id,snapshot_id]`, raw text 18 keys/unknown PickleUp keys, absent markers, hashes | Local/export riêng, không tự upload |
| `device_state` | `[namespace,device_id,key]`, timer/checklist/focus | Không sync giữa thiết bị |
| `metadata` | schema version, feature flags, lock leases, auth generation, migration checkpoint | IDB upgrade không xóa pending; close/versionchange có UX retry |

DB namespace là cách ly ứng dụng, không phải mã hóa chống người dùng cùng browser/OS. Quyền và hạn chế ở [THREAT_MODEL](THREAT_MODEL.md). Không lưu auth secret trong các backup/outbox/raw snapshots; legacy snapshot chỉ allowlist app keys + unknown prefix đã được preview.
