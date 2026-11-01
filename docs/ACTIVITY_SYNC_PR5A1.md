# PR5a1 — activity event sync foundation

Nền main `0ef0547ae594f931694bc5c98198943a81b586f9` sau PR21. [Main regression](https://github.com/ndlong78/Pickleball/actions/runs/41312915014):192 unit +320 browser pass, không flaky; [backend](https://github.com/ndlong78/Pickleball/actions/runs/41312915012) và [Pages](https://github.com/ndlong78/Pickleball/actions/runs/41312914167) success cùng merge SHA. Không PR mở trùng khi bắt đầu.

## Phạm vi

PR5a tách foundation PR5a1 trước domain/source UI tiếp theo: academy_attempts, skill_assessments, training_entries, match_records. Chưa đổi nguồn các trang điểm/đánh giá/nhật ký hoặc tự upload dữ liệu cũ; PR4c vẫn chỉ preferences/checkins. Auth/import/sync flags false, không staging credentials/SMTP, provisioning hoặc production. Không tự merge.

Giữ V5.5.0 vì API additive chưa nối activity UI/runtime. Module activity-core mới không được page-loader nạp tự động. PR nối UI phải bump build/assets/cache và có consent riêng; consent của preferences/checkins không cho phép gửi events. Mixed old repository/reader bị upgrade_required trước I/O; caller tích hợp phải kiểm tra capability POLICIES và dùng bundle đồng bộ. Không coi foundation là PR5a đã hoàn tất.

## RPC và dữ liệu

Migration additive `20261101000200_activity_event_fence.sql` thêm apply_event_operation với cùng signature/epoch binding PR4b, chỉ4 event kinds và put/delete. Không sửa apply_operation, importer hoặc apply_sync_operation; không nới RLS/DML. API role NOLOGIN/non-BYPASSRLS, FORCE RLS và search_path rỗng giữ nguyên. Auth adapter eventRpc có allowlist riêng prepare_sync/apply_event_operation/pull_changes, token ghim theo owner/generation và abort/ignore khi đổi account.

RPC kiểm epoch dưới cùng sync_heads row lock với mutable/import và operation_core trong một transaction. Shared append-only sync_operation_epochs bind user+operation UUID+epoch+request hash; không đổi body, adopt legacy receipt, dùng UUID cũ qua epoch mới hoặc lẫn capability. Client entity key là UUID lowercase canonical; UUID command/event/entity ổn định và không dedupe theo score/date. Cùng client_event_id chỉ một event/user; hai lượt thật có cùng nội dung vẫn giữ hai identity. HTTP200 có thể là conflict/invalid/reset_required, không phải ack.

Events bất biến; create expected0, delete đúng revision thành tombstone, không restore hoặc sửa nội dung tại cùng entity. Manual training_entries bắt buộc plan_id cùng owner và plan đang hợp lệ; legacy orphan giữ legacy_plan_id, không tạo plan giả. Self scale2, stage/advanced scale20 với đúng bộ6 metrics/band. Conditions null là unknown; không mặc định cùng điều kiện. Occurred_at null chỉ cho legacy, không thay bằng thời điểm import.

## Policy và local state

Caller chọn rõ policy=activity-events-1 và callback enabled trả true. Mặc định vẫn preferences-checkins-1; không auto RPC/sender/timer khi login. Repository schema1 không đổi stores/keys; events dùng cursor key `[namespace,'activity-events-1']`, lease activitySenderLease; mutable giữ `[namespace,1]` và senderLease. Trường protocol của cursor IDB là slot cũ, không là wire protocol: RPC vẫn1. getActivitySnapshot chỉ4 event domains; getDomainSnapshot/export PR4c vẫn2 mutable domains.

Pull đọc tất cả changes theo H/epoch/counter nhưng chỉ cache4 kinds vào slot riêng; bootstrap bắt đầu0 dù mutable cursor đã đi qua lịch sử đó. Whole bounded cycle commit bases+cursor nguyên tử; quota/invalid page/cap/CAS giữ snapshot/cursor cũ. Caps kế thừa201 pages/10050 changes/16MiB; không trim để giả thành công. Full reset chỉ thay bases thuộc policy, giữ cả pending/frozen requests và cache khác.

Sender freeze UUID/body/epoch/CAS trước I/O; dependency delete chỉ bind từ predecessor ack. Ack nguyên tử record/outbox và cursor localVersion của đúng policy, không nhảy afterRevision qua changes chưa đọc. Retry/backoff/401/8-attempt ceiling/explicit forceRetry giữ nguyên request; quota ack rollback thì replay receipt. A→B đóng scope, bỏ late replies, queue A không sang B. Lease advisory độc lập từng policy; receipt/row lock server bảo đảm cuối. Activity summary chỉ4 kinds và báo otherPending; summary mutable cũ vẫn giữ cảnh báo unsupported pending, không gửi chúng.

Conflict/invalid/epoch reset giữ queue và archive basis để inspect/export; PR4 mutable resolution API từ chối event (unsupported_resolution). Chưa event resolution/repair UI hoặc API mới; không tự tạo event UUID khác, rebind epoch, merge hoặc force. Trường hợp blocked cần review/repair ở PR tích hợp sau, không rollout trước gate này.

## Projection và bảo toàn lịch sử

activity-core validate payload/row trước activity I/O/cache/ack; giữ canonical rows, nullable unknown/provenance và pending riêng. Project giữ mọi event identity, loại tombstones khỏi view; không cắt theo giới hạn500/1000 legacy. latestAcademy chọn occurred_at không future, tie bằng UUID ổn định, không coi updated_at/server commit order là ngày tập. Không tạo attempt từ legacy_score_snapshots hoặc attendance từ điểm/assessments/matches/timer.

Comparison key chỉ khi conditions được biết rõ; Academy phải cùng lesson/skill/level/content_version/lesson snapshot, training cùng exercise/skill/level/kind/plan ID immutable và conditions. Unknown conditions/orphan không chứng minh comparable. Giữ scale/type assessments riêng; chưa suy rating hoặc phân tích matches. Các projection này chưa được core/UI legacy sử dụng.

## Kiểm chứng và giới hạn

Unit fake-IDB/model; native-IDB Chromium/WebKit với mock RPC được ghi riêng. Test bootstrap >500, duplicate-content distinct IDs, immutable content/tombstone, exact replay/restart, event/mutable cursor và lease isolation, epochs/late A→B, quota rollback, malformed page/ack, mixed assets/default-off/offline. Không gọi mock là Auth/RLS evidence.

Supabase local CI thêm pgTAP RPC grants/owner/epoch/append và8 REST tests, gồm duplicate client_event_id, same-owner plan FK, concurrent replay/CAS, epoch lock wait và event rollback→mutable commit không gap. Giữ toàn bộ regression/DB/Auth suites. Real browser GoTrue/Mailpit/SDK trên2 engines: A bootstrap events rồi logout/B isolation; B nhập prerequisite plan qua importer/RPC thật, gửi4 event kinds qua standalone API,502 sau commit→native reload→exact retry; mutable cursor/checkins/18 keys giữ nguyên. Đây chưa phải activity product UI. Không thêm recipients hoặc quota SMTP; không log token/OTP/payload hay Auth artifacts.

Máy làm việc vẫn CDN403 khi tải browser; full browser/Supabase kiểm trong Actions ephemeral. Exact HEAD/counts/fail/flaky lấy ở PR. Chưa staging SMTP/Managed gateway, physical devices, restore/deletion/backup drill, event conflict repair/source UI, full V6 backup round-trip/purge, near-cap/load/eviction, background scheduling hoặc PR5b plans/selections source. Pilot dữ liệu thật vẫn đóng theo policy backup/privacy/repair/consent.

CI HEAD đầu7a03154 có331 browser pass +1 flaky: WebKit390 raw rescue, checkbox chưa đổi trạng thái và retry đạt. Test chỉ chờ fragment visible, trong khi loader/settings và initial router scroll có thể chưa hoàn tất. Đã đổi điều kiện chờ sang loader + fonts + frame cuộn, thêm fixture giữ late module để chứng minh readiness không dựa vào visibility. CI thêm5 lượt WebKit390 rescue với retries=0; full suite giữ retry config cũ, không nới timeout/assert hoặc bỏ test. Exact kết quả HEAD cuối ở PR, không coi lượt flaky đầu là clean gate.
