# PR1a — PostgreSQL/RLS và sync RPC protocol 1

Baseline: main `369dbca5c47eb1ff6255d4a61ad08da13ce150ed`, PR #10/#11 đã merge, frontend vẫn5.1.0. PR1a thêm backend **local/test**; không provision Supabase cloud, đổi UI/JS, storage keys, backup importer hoặc PWA cache. [Policy pilot](PILOT_OPERATING_POLICY.md) tiếp tục áp dụng. Auth OTP UI, session lifecycle và SMTP là PR1b; không coi JWT fixture trong test là đã kiểm chứng login.

## 1. Schema và giới hạn triển khai

`supabase/migrations/20261029000100_schema.sql` tạo12 bảng public có dữ liệu private và3 bảng private ledger, đều ENABLE + FORCE RLS, FK user_id tới auth.users với ON DELETE CASCADE. Tên/cột và legacy mapping ở [dictionary](DATA_DICTIONARY.md).

- Authenticated chỉ SELECT own rows, kể cả tombstones để đối soát. Anon không có quyền private data/RPC. Cả own/cross-user direct INSERT/UPDATE/DELETE đều bị revoke; không có đường REST upsert bỏ qua CAS.
- RPC owner là `pickleup_api`: NOLOGIN, NOINHERIT, non-superuser, non-BYPASSRLS, không member của authenticated. Bảng do migration role sở hữu, FORCE RLS vẫn áp dụng cho function role. INSERT/UPDATE policy kiểm user_id=auth.uid(); role thường không có DELETE. Search path RPC rỗng, identifier động lấy từ allowlist; không SECURITY DEFINER dưới postgres/service_role. Migration cấp SET membership tạm cho chính migration actor khi ALTER OWNER rồi tắt SET; không cấp cho client. REVOKE/GRANT function ACL chạy dưới đúng new owner trước khi tắt SET; không dựa quyền superuser của migration actor. pgTAP cấp SET tạm cho admin test actor trong transaction rollback để kiểm constraints độc lập. Role name dùng quote_ident qua format(%I), tránh nhánh CURRENT_USER của utility hook trong image Supabase17.6.1.029 đã gây segmentation fault khi kiểm thử. Identity helper SQL-standard bind auth.uid ở creation, không cần sửa grants của Auth schema do Supabase quản lý.
- Functions validator thuần trong pickleup_private có grants cần thiết cho CHECK; schema private không được expose qua PostgREST. Client không có SELECT/DML trên sync_heads/receipts/changes. Operator/admin vẫn là trust boundary đặc quyền.
- CHECK/domain constraints giới hạn level/skill/lesson ID, scores, minutes, conditions, timezone, size/depth và shape JSON. Self assessment0–2 tách stage/advanced0–20; advanced metrics khác sáu skill cơ bản. Snapshot plan validate bằng cả basic và advanced core fixtures hiện hành.
- Composite FK bảo vệ plan/import reference cùng user. Selection chỉ chọn plan chưa deleted; xóa plan đang được chọn trả invalid/dependency thay vì tự xóa selection hoặc lịch sử. Training history có FK vẫn tồn tại khi plan soft-delete.
- Timestamps/revision/owner và provenance không được client gán. `plan_snapshot`/source/level bất biến sau create; kết quả `check_score/completed_at` là cột mutable có CAS. Adapter tương lai phải merge các cột này vào projection legacy, không đọc kết quả mới từ snapshot cũ.

RPC write được bật cho9 domain: profiles, user_preferences, personal_plans, academy_attempts, skill_assessments, practice_checkins, training_entries, match_records, user_selections. Các bảng legacy_score_snapshots/legacy_imports/legacy_import_items đã có constraints/RLS/indexes nhưng **chưa mở RPC write**: PR3 sẽ thêm atomic importer, receipts/reconcile và kiểm chứng mapping. Không có endpoint client tự đánh dấu import committed.

Caps hiện thực: payload256 KiB, plan snapshot64 KiB, event row16 KiB, depth12; pull1–200 changes. Import batch cap512 KiB/100 items còn là hợp đồng PR3, không phải endpoint đã tồn tại. Ngưỡng này chưa có load benchmark; quotas/rate limits và ledger GC thuộc PR6.

## 2. apply_operation

```text
apply_operation(
  p_operation_id uuid,
  p_kind text,
  p_entity_key text,
  p_action text,                 -- put | delete | restore
  p_expected_revision text,      -- decimal string, '0' for create
  p_payload jsonb = {},
  p_protocol_version integer = 1
)
```

Singleton key là `self`; check-in dùng ngày ISO `YYYY-MM-DD`; entity khác dùng UUID. RPC tự lấy owner từ auth.uid(). `put` tạo khi expected0, cập nhật khi expected bằng revision hiện tại; patch chỉ gồm field allowlist và type đúng. Không có force/LWW. Unknown field hoặc field server-managed bị reject. Payload delete phải rỗng, ngoại trừ check-in được gửi timezone_at_entry để clear một ngày chưa có record theo ngày địa phương đúng.

Mỗi request hợp lệ lấy row lock trên sync_heads(user_id), kể cả lúc user có write đầu tiên. Request hash được tạo từ canonical JSONB của kind/key/action/expected/payload/protocol. Receipt cùng operation_id/hash trả đúng kết quả cũ với `replayed:true`; cùng ID khác request trả invalid. Counter, business row, change và receipt nằm trong một transaction; rollback không để lại revision hoặc receipt đã commit.

Kết quả là JSON envelope: `status=applied|conflict|invalid|auth_required|upgrade_required`; applied có row, server_revision, epoch, replayed. Conflict revision có row hiện tại **của chính user** hoặc null nếu không có row visible; không lộ existence/content của owner khác. Invalid trả code tổng quát, không SQL constraint details. PostgREST HTTP200 có thể chứa domain conflict/invalid; adapter phải kiểm status, không coi mọi200 là đã đồng bộ. Permission/JWT errors vẫn là lỗi HTTP thực.

Events append-only: không sửa event đã tồn tại; user có thể delete bằng tombstone. Mutable tombstone không nhận put để tự sống lại; restore cần expected revision chính xác và payload hợp lệ. Clear ngày chưa tồn tại vẫn tạo tombstone rev1; stale create expected0 sẽ conflict. Nội dung event đã xóa không restore qua protocol1.

Check-in done5–180 phút, skipped minutes null; clear status/minutes/lesson null. Ngày tương lai bị reject theo timezone hợp lệ; clear chưa có timezone dùng UTC nếu không cung cấp snapshot timezone. PR2/4 phải gửi timezone đã xác nhận. Không có trigger/side effect tạo check-in từ điểm, timer hoặc training event. Timezone được giữ theo ngày literal, không dời lịch sử.

## 3. pull_changes và bootstrap

```text
pull_changes(
  p_after_revision text = '0', p_limit integer = 100,
  p_high_water text = null, p_epoch uuid = null,
  p_protocol_version integer = 1
)
```

Lần đầu lấy epoch/high_water H và trang changes trong `(after,H]` theo server_revision. Các trang tiếp theo gửi lại epoch và H; sau hoàn tất mới mở vòng mới không cố định H. `next_revision`, H, server_revision, record_revision và row.revision đều là decimal strings để JS không mất precision. Table REST SELECT trả kiểu bigint SQL gốc; adapter V6 phải dùng canonical RPC cho sync revisions, không parse bigint trực tiếp thành Number.

Per-user lock làm thứ tự counter trùng thứ tự commit; transaction chậm không bị transaction sau vượt qua. Pull không chờ lock ghi và không nhìn uncommitted rows. Commit mới sau H thuộc vòng tiếp theo. Epoch mismatch, cursor vượt head hoặc cursor>0 thiếu epoch trả reset_required; future H và page limit sai trả invalid. User chưa có mutation có H0/epoch null; sau first write bắt đầu epoch riêng.

Pilot giữ toàn change log. Bootstrap/resync thực hiện replay từ0 tới một H cố định rồi dựng latest state, thay vì dùng snapshot pagination thay đổi giữa chừng. Chưa có compaction/minimum-cursor GC; PR6 phải thiết kế trước khi xóa ledger. Restore vận hành phải đổi epoch theo [runbook](MIGRATION_RUNBOOK.md); chưa có job restore production trong PR1a. Client giữ pending/conflicts trong lúc resync thuộc PR2/4.

Migration thứ hai backfill rows của schema-only trước khi expose RPC: từng row có change snapshot, counter theo user và revision giữ nguyên. Đây là đường upgrade đã test bằng dữ liệu giả; không phải importer localStorage V5.

## 4. Chạy chuẩn bằng Supabase local

Yêu cầu Docker local, Supabase CLI **2.54.11**, Python3. Không nhận DATABASE_URL/project_ref/cloud credentials cho test harness.

```bash
SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io supabase start -x studio,mailpit,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta
supabase db reset --local
supabase test db
python3 scripts/test_backend.py
supabase stop --no-backup
```

Chỉ chạy reset trong project local ephemeral. Config project_id=`pickleup-v6`, PostgreSQL17, public là schema API duy nhất, API URL dùng trong harness phải là loopback54321. CLI2.54.11 được pin để tái lập image/schema; nâng CLI/image phải review và chạy lại ma trận. Seed rỗng; tests tự tạo user thuộc domain `.invalid` rồi rollback/cleanup. CLI local keys chỉ lấy vào memory test, không log/dump status hay commit vào frontend.

`.github/workflows/backend-checks.yml` chạy mọi PR vào main, push backend liên quan và manual dispatch, permissions contents:read, không secrets/deploy. Job upgrade: reset tới migration schema-only → synthetic seed → migration up local → verify data/CAS/bootstrap; sau đó reset DB rỗng, pgTAP và REST/concurrency. Cleanup always. CI Node24/unit/browser hiện hữu giữ nguyên.

## 5. Môi trường fallback và chứng cứ

Executor hiện tại dùng Docker VFS, image Supabase PostgreSQL đầy đủ không giải nén được vì dung lượng. Registry ECR mặc định cũng bị network policy chặn; không nới network hoặc đổi storage driver. Đã dùng PostgreSQL17.6-bookworm + PostgREST12.2.3 từ Docker Hub và pgTAP1.2.0 thuần SQL từ Debian để kiểm chứng local.

`scripts/fixtures/standalone_auth.sql` chỉ tạo context Auth tối thiểu cho fallback, **không phải migration hay mock database**, không được dùng để deploy Supabase. Mode `python3 scripts/test_backend.py --standalone` chỉ chấp nhận container tên `pickleup-pr1a-postgres` và API URL dùng trong harness phải là loopback54321; JWT secret là test-only cố định trong harness. Migrator CLI2.54.11 cũng đã áp dụng thành công cả hai migration vào một database probe rỗng trên PostgreSQL17 loopback. Local fallback chưa kiểm GoTrue/Kong/full-stack CLI startup; CI chuẩn dùng Supabase local đầy đủ và không mode này. Test Auth OTP, refresh/session switching và email vẫn thuộc PR1b.

Database tests kiểm trên PostgreSQL thật, không mock: grants/RLS từng bảng, own/cross-user/anon, constraints/null/type/size, same-owner FK, snapshots core, mutable CAS, event uniqueness, replay/hash mismatch, tombstone/restore, bigint string và cursor/epoch. Python suite thêm REST CRUD-deny matrix và các transaction chờ lock thật trong pg_stat_activity để kiểm commit/rollback, cùng operation đồng thời và high-water pagination khi có commit mới.

Số test và CI run/SHA cuối cùng ghi ở Pull Request, lấy từ logs. Không gọi success có flaky là clean run. Flaky cache-upgrade Chromium đã ghi ở PR #11 được giữ riêng; PR1a không sửa SW/test ứng dụng để che lỗi. Chưa QA thiết bị thật, chưa cloud staging/production, chưa benchmark tải hoặc security review độc lập.

## 6. PR1b

Thêm Auth adapter + UI opt-in, OTP/local mail capture trước rồi staging SMTP khi được kết nối; guest còn hoạt động. Kiểm callback dưới `/Pickleball/`, expiry/refresh, logout và account switching với response in-flight. Không tự import/signup sync, không dùng production secrets. IndexedDB/outbox và conflict UI chưa có trong PR1a; các hợp đồng RPC ở trên là đầu vào cho PR2–PR4.
