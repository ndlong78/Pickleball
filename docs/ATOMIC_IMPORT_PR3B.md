# PR3b — atomic import RPC protocol1 (chưa bật UI)

Nền main702d456, PR15 đã merge; không có PR mở trùng lúc bắt đầu. PR3a là rescue/inventory preview, **không domain validation**. PR3b bổ sung backend transaction/security contract, để review và test độc lập trước PR3c (mapping/quarantine/overlap/account consent và UI). Không gọi backend này là importer UI hoàn chỉnh; không bật upload/sync hoặc thay nguồn dữ liệu của tám route. App/PWA giữ5.3.0, không provision/deploy cloud.

Migration forward `20261030000100_atomic_import.sql` không sửa hai migrations PR1a. Thêm source_item_count, backfill từ counts cũ, tăng record revision và append canonical change dưới per-user lock. Chỉ nhận manifest mới tối đa1.000.000 source items; legacy column hỗ trợ tổng5 counters int32 để không làm mất dữ liệu hợp lệ cũ. Không trim source theo cap.

## RPC và HTTP200 domain statuses

Tất cả RPC định danh bằng auth.uid, owner pickleup_api NOLOGIN/non-BYPASSRLS, search_path rỗng. Giữ FORCE RLS, anon deny, client direct DML deny; helpers chỉ private/owner. Lỗi HTTP thật (JWT/permission/network/binding kiểu tham số) vẫn là lỗi; HTTP200 phải kiểm `status`, không suy đã commit.

`begin_import(p_operation_id uuid,p_source_fingerprint text,p_manifest_hash text,p_adapter_version text,p_source_schema text,p_source_item_count integer,p_excluded jsonb={invalid:0,unresolved:0,local_only:0},p_protocol_version=1)`

- Fingerprint/manifest hash lowercase SHA256 hex64; adapter/schema≤40 ký tự. Counts không âm, tổng excluded≤source total. unresolved>0 trả needs_review, chưa tạo manifest: mọi lựa chọn phải được review trước begin.
- Cùng owner/fingerprint chỉ một manifest. Cùng metadata resume trả manifest hiện tại; metadata khác trả conflict/manifest_changed (không tự reinterpret bằng adapter mới). Cùng operation ID/request replay receipt, ID khác request invalid.
- fingerprint/manifest_hash là định danh nội dung từ client, không phải chữ ký chứng minh user đã consent. RPC không có raw file để tự xác minh full manifest/item membership. PR3c bắt buộc bind immutable preview+account+hash+nhóm chọn, xác nhận rescue/quarantine và invalidate nếu input/account đổi. Chưa có UI này nên không gọi RPC từ frontend.

`import_batch(p_operation_id uuid,p_import_id uuid,p_expected_revision text,p_items jsonb,p_protocol_version=1)`

- Tối đa100 items,512KiB JSONB text/depth12; đây là cap batch, không full file. Mỗi item: source_path(string1–500), kind(allowlist10 domains), expected_revision(decimal string), payload(object), mode(apply/reuse), entity_key(string≤100 hoặc null/absent).
- mode apply chỉ put. Singleton dùng self, check-in ngày ISO literal; UUID-create expected0 bắt buộc key null/absent, server cấp UUIDv8 ổn định theo owner+fingerprint+kind+path. Response trả target_key. Plans import batch trước, lấy UUID rồi đưa vào selections/training batch sau; chưa có reference syntax cho plan mới trong cùng batch. Snapshot source/level vẫn bất biến theo PR1a.
- Cùng source_path/request giữa batch replay mapping, không đếm lại; hash khác invalid/source_path_reused. Duplicate/missing paths trong cùng batch reject trước write. Hai phần tử giống nội dung nhưng khác path vẫn là hai item, không tự dedupe theo điểm/date.
- mode reuse là **liên kết do user chọn** sau preview, không khẳng định nội dung hai record giống nhau. Payload phải {}, target own row phải còn sống, revision khớp; không ghi business row. PR3c phải hiện đối chiếu và lựa chọn giữ cả hai/liên kết; server không tự suy reuse.
- Định dạng/type/constraint/CAS dùng chung private operation_core với apply_operation. Import context chỉ RPC nội bộ truyền để server gán source_kind=legacy, fingerprint/path; client không được mass-assign owner/revision/provenance. legacy_score_snapshots mở qua importer, không mở manual apply_operation.
- Một lỗi/conflict dù ở item cuối rollback **tất cả** business writes, mappings, item receipts, change log và head increments trong batch. Trả status invalid/conflict +batch_rolled_back:true; manifest vẫn staging, có thể repair/re-preview rồi retry. Không lưu failure receipt của batch đã rollback; network retry cùng operation/request thành công replay đúng receipt.
- Manifest revision CAS serialize batch, và cùng per-user lock với manual writes bảo vệ counter theo commit. local engine/namespace/source path không tự chuyển sang account khác. Không force update, restore tombstone hoặc delete từ importer.

`finish_import(p_operation_id uuid,p_import_id uuid,p_expected_revision text,p_accept_quarantine boolean=false,p_protocol_version=1)`

Recompute actual applied/reused từ mapping ledger; tổng actual+excluded phải bằng source total, unresolved=0, không nhận counts từ caller lúc finish. invalid/quarantine>0 đòi accept_quarantine=true (null không bypass). Chỉ khi đủ mới chuyển committed và append change/receipt. Quarantine raw/source export phải còn ở client; server chỉ giữ counts/report code, không chứa raw backup. committed không đồng nghĩa mọi source item đã nhập: counts/quarantine/local-only vẫn hiện rõ. Một file lớn có nhiều batch; không gọi cả file atomic.

`get_import_status(p_import_id uuid,p_protocol_version=1)` đọc canonical own manifest/revision string, account khác hoặc ID không tồn tại cùng mã import_not_available. begin/batch/finish cũng trả import.revision là decimal string. source_item_count/counters bị chặn ở phạm vi số nguyên JS biểu diễn chính xác.

## Shared worker và tương thích

`apply_operation` giữ nguyên signature/grants/protocol1, wrapper luôn truyền context null; request digest manual giữ đúng byte contract PR1a, receipt cũ replay sau upgrade. Worker không có EXECUTE cho authenticated/anon, không expose qua PostgREST. Không có hai bản core logic khác nhau cho manual/import. Các constraints và checks timezone/plan/FK/append/tombstone cũ không được nới để ép dữ liệu legacy vào: dữ liệu thiếu mapping/conditions/timestamp/timezone hoặc orphan cần PR3c phân loại, giữ raw và review; backend không tự bịa default attendance/date hoặc plan.

## Kiểm chứng và giới hạn

`scripts/test_import.py`:14 REST/SQL tests, PostgreSQL/PostgREST thật, synthetic A/B/anon, rollback item cuối/CAS, lost-response replay/path hash, cap/malformed/mass-assignment, stable IDs/explicit reuse, plan→training FK owner, counts/quarantine, receipt compatibility, batch concurrency và manual writer rollback giữ cursor không gap. `--standalone` chỉ container pickleup-pr1a-postgres loopback, dùng Auth SQL/JWT fixture, không gọi là GoTrue evidence.

Backend CI chuẩn giữ pgTAP180 cũ +15 checks mới,9 REST/concurrency cũ,14 import tests và Auth GoTrue/Mailpit thật. Auth suite bổ sung OTP→verify A/B→begin/batch/replay/finish→private pull→B-deny-A→refresh/logout. Upgrade từ schema-only vẫn chạy; thêm upgrade2→3 giữ manifest counts/change log và manual receipt cũ. Frontend unit/Chromium/WebKit regression giữ nguyên. Counts/URLs/exact HEAD/flaky ở PR.

Chưa staging/production/SMTP cloud, chưa UI mapping/consent/resume/export quarantine hoặc end-to-end browser import, chưa load benchmark, kill-switch client queue/sync engine. Manifest full-item hashes/membership proof và repair thay adapter chưa có API; không được coi client metadata hash là server-verified source consent. Không mở importer trên app trước PR3c và các gate tương ứng. Không cần production secrets cho PR3b.
