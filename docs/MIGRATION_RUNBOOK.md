# PickleUp V6 — migration và rollout runbook

**Hiện hành — 12/11/2026:** main `5767079` /5.17.0 sau #45 đã merge/deploy Pages và Cloudflare; backend xanh. UI sau merge có603 pass/1 flaky WebKit820 nên **chưa đạt clean run**. [Bản sửa kiểm thử reload](POSTMERGE_V5_17.md) đợi Settings khởi tạo xong và kiểm lại cache A/B/guest; đang PR, chưa merge. Không thay runtime/build/IndexedDB3/SQL/Auth config hoặc mở signup/pilot. Các mốc thấp hơn là lịch sử.


**Bản vá sau audit #41 (đang PR, chưa áp dụng Managed):** migration7 `20261111000100` thêm first-epoch legacy guard; user đã có head phải dùng writer fenced cho8 kind, profile PR1a giữ nguyên. Source có7 migrations/17 bảng/10 public RPC; staging operator trước đó mới xác nhận6/16/10. [Hợp đồng, giới hạn và SQL Editor6→7](LEGACY_EPOCH_GUARD.md). Các mốc sáu migrations dưới đây là baseline lịch sử, không phải bộ upgrade mới.

**Trạng thái 06/11/2026:** Main `c849a16cb77aaaa6295a3683e14d172582542a3b` / V5.13.0 sau [#34](https://github.com/ndlong78/Pickleball/pull/34). [UI42029535372](https://github.com/ndlong78/Pickleball/actions/runs/42029535372):321 unit +528 browser Chromium/WebKit +10 lượt WebKit bổ sung pass,0 fail/flaky/retry; [backend42029535288](https://github.com/ndlong78/Pickleball/actions/runs/42029535288):275 pgTAP/45 REST và Auth local thật hai engines pass; [Pages42029534340](https://github.com/ndlong78/Pickleball/actions/runs/42029534340) success cùng merge SHA. Cứu hộ toàn bộ cache account và preview tệp chỉ đọc đã merge/deploy; chưa full restore/purge hoặc backup toàn cloud. Năm flags false, URL/key trống; chưa có bằng chứng Managed staging/SMTP/pilot. [Tiến độ/gates](V6_PROGRESS_REVIEW.md), [hướng dẫn staging](SUPABASE_STAGING_DEPLOYMENT.md).

## 1. Rủi ro restore hiện tại cần thiết kế bù

`modules/assessments-and-backup.js` xuất 14 nhóm, không phải raw dump18 keys. Parse trực tiếp từng key có thể làm export thất bại nếu JSON hỏng. Goal/plan/checkins đi qua reader normalize fallback nên có thể che raw lỗi hoặc trạng thái chưa cấu hình. Restore validate trước rồi confirm, nhưng ghi nhiều `localStorage.setItem()` tuần tự, **không có transaction/rollback** nếu quota/security error xảy ra giữa chừng. Optional thiếu thường giữ dữ liệu hiện tại; assessment null/thiếu thì remove; selectedPlan null không clear lựa chọn cũ. Không suy “restore thành công” là bản sao chính xác mọi khóa.

Home còn có export `pickleup-ket-qua.json` shape `{app,exportedAt,records:[{week,skill,score,total,date}]}` không có schemaVersion/scores, **không được importer tổng hiện tại nhận**. V6 cần adapter nhận diện riêng (week1–6 → key0–5, total=20), preview chứ không reject nhầm hoặc coi là full backup. Không có bằng chứng lịch sử tất cả định dạng V1–V5 ngoài source hiện tại: thu thập fixtures đã ẩn danh trước khi cam kết tương thích toàn bộ phiên bản.

## 2. Chuẩn bị môi trường và gates

Operator triển khai staging với dữ liệu giả theo [SUPABASE_STAGING_DEPLOYMENT](SUPABASE_STAGING_DEPLOYMENT.md): đối chiếu ref/history, dry-run sáu migrations, readonly metadata checks, Dashboard Auth/SMTP và frontend clone riêng. Đây chưa là quyền production hoặc bằng chứng đã cấu hình Managed; không chạy harness local vào cloud.

**Hiện thực PR1a:** xem [BACKEND_PR1A](BACKEND_PR1A.md) để chạy migrations, upgrade fixture, pgTAP và REST/concurrency tests. Backend CI local đã có trong PR1a; các mục cloud/staging/import/restore dưới đây vẫn là gates tương lai. Không dùng fixture Auth standalone thay Supabase Auth thật khi deploy.

1. Owner duyệt provider/region/budget/auth/staging-only; tạo môi trường staging tách project/SMTP/redirect production. Operator giữ quyền production, Codex không cần production credentials.
2. PR1a thêm `supabase/config.toml`, migrations versioned, seed giả, pgTAP và backend workflow. Review schema/downgrade/backup trước áp dụng. Chỉ reset DB ephemeral cục bộ; staging deploy có approval riêng trong quy trình owner đã cấp, production không dùng `db reset`.
3. Mọi migration đi expand → backfill/reconcile → switch read → contract ở PR tương lai. Không drop legacy column/key hay sửa SQL migration đã deploy; lỗi dùng forward fix. Pin Supabase CLI/dependency versions và ghi DB schema/protocol compatibility window (ít nhất client pilot trước đó). Server trả upgrade_required cho client không tương thích, giữ pending export được.
4. Restore drill staging từ backup trước pilot; target theo policy hiện hành là RPO24h/RTO1 ngày làm việc, chưa phải SLA đã đạt. Xác minh counts, RLS, auth mapping và cursor epoch; restore DB cũ phải đổi sync epoch để mọi client full-resync, tránh cursor trỏ quá head và receipt bị mất. Replay account deletion markers trước mở lại server.

## 3. Thu thập an toàn trên từng thiết bị

- Giữ nguyên origin `https://ndlong78.github.io/Pickleball/`; đổi hostname/browser/PWA storage không tự mang dữ liệu. Với origin cũ không truy cập được, dùng JSON do người dùng tải lên, không truy tìm dữ liệu từ thiết bị khác.
- Trước chuyển: tải backup V1 tương thích và **raw rescue export** gồm giá trị nguyên văn18 keys, marker absent/empty, schema/source/version/hashes, device-local fields và unknown `pickleup_*` đã preview. Không xuất token/session/Supabase SDK keys hoặc dump toàn origin; raw hỏng vẫn xuất text được. UI đã có từ PR3a, không gồm toàn bộ dữ liệu account V6; giữ file ngoài browser.
- Chụp snapshot local khi UI writer đang quiesce; localStorage không snapshot atomic nên detect thay đổi trước/sau theo per-key hashes và retry có thông báo. Multi-tab legacy không tuân lock thì yêu cầu đóng tab khác hoặc báo dữ liệu đang đổi, không claim snapshot nhất quán.
- Lưu rescue file ngoài trình duyệt, không chỉ IDB vì quota/eviction có thể mất cả hai. Không xóa/cắt/sửa legacy storage. `navigator.storage.persist()` nếu được hỗ trợ chỉ giảm nguy cơ eviction, không thay backup.

## 4. Preview và consent

Guest được chọn “Giữ trên máy / Nhập lên tài khoản / Bỏ qua”; đăng nhập không tự upload. Preview hiển thị account đích, nguồn/thiết bị, số lượng từng nhóm, valid/invalid/unknown/overlap/conflict/orphan, dung lượng và các trường local-only. Không có attendance tạo từ timer/checklist/điểm. LessonId check-in null giữ null, không điền bằng bài đang chọn.

Đọc raw bằng adapter versioned, validate **không ghi**, giữ field/path lỗi và original payload trong local quarantine/export. Missing optional field nghĩa không có dữ liệu nguồn, không xóa server hoặc gán default. Không tự dựng timestamp/conditions/goal history. Check-in date giữ literal, timezone chưa biết cần user review, không đổi ngày qua UTC. Trường advancedChecks và hai nhóm metric phải được giữ, blueprint mapping ngắn ban đầu chưa liệt kê đủ.

Consent gắn account UUID + manifest hash + adapter version + nhóm đã chọn. Nếu account/snapshot thay đổi thì preview/confirm lại. Hủy trước upload không tạo remote data; hủy sau một số batch phải nói rõ đã nhập gì, không gọi là atomic toàn bộ file.

## 5. Idempotency, overlap và batching

1. Fingerprint file gồm SHA-256 canonical JSON payload + schema/source format (object keys sort đệ quy, **array giữ thứ tự**, không coerce date/number/string). Với fingerprint dữ liệu loại `exportedAt` khỏi semantic payload để cùng dữ liệu export lần khác không thành nguồn mới; lưu riêng raw file hash/manifest hash để audit. Raw local snapshot fingerprint dùng sorted key→raw-value/absent mapping. Adapter_version lưu riêng; nâng adapter không được biến cùng item thành event mới tự động.
2. Server tạo/tiếp tục `legacy_imports` unique `(user_id,source_fingerprint)`. Mỗi item có source_path gồm field + array index hoặc object key; deterministic UUID từ user-scoped import identity + path, receipt/item_hash giữ ổn định. Hai dòng cùng nội dung trong **một mảng** vẫn là hai item, không dedupe theo điểm/date. Batch có operation_id ổn định, retry dùng cùng request/hash. Server scope owner từ auth.
3. Cùng fingerprint retry/resume là no-op cho item đã ack, khác hash cùng path bị reject. Import lại với adapter mới là repair/reconcile có preview, không auto-create lại tất cả.
4. Hai backup **khác fingerprint** có thể chứa cùng lịch sử. Nếu có legacy record ID ổn định: so sánh source namespace + ID + content hash, identical là candidate reuse, ID trùng nhưng nội dung khác là conflict. Academy history không có event ID: matching lesson/score/date chỉ là overlap candidate. UI cho chọn giữ cả hai hoặc liên kết với row đã nhập; lưu mapping quyết định. Không hứa tự dedupe chính xác khi dữ liệu không có identity. Lịch sử trên hai thiết bị khác nhau phải giữ được nếu user xác nhận là các lượt riêng.
5. Academy latest là snapshot, không append thành attempt khi history đã có; giữ cả provenance nhưng projection không đếm hai lần. Legacy scores tuần mẫu không chuyển thành event tập mới. Orphan selected plan cần chọn lại; training entry orphan giữ legacy reference, không làm mất lịch sử.
6. Order: manifest → plans/assessments/events/snapshots → prefs/checkins có CAS → selections. Mỗi batch là DB transaction items + change log + receipts. Một row invalid làm batch rollback, preview/report và retry batch hợp lệ sau xác nhận; không silently drop. File lớn dùng staging checkpoint, không transaction kéo dài toàn file.
7. Prefs/check-in ngày trùng/plan ID content đổi: show diff và expected_revision, không blanket replace toàn account. Import write cũng qua cùng per-user counter/lock và constraints sync.
8. Reconcile: tổng source items = reused + applied + invalid/quarantine + unresolved + local-only (phân loại loại trừ nhau); counts theo group và hash/mapping, pull lại canonical rows kiểm reference/minutes/score/date. Chỉ complete receipt khi mọi nhóm được user chấp nhận và không còn batch pending. “Complete với quarantine” phải ghi rõ count chưa nhập, file export còn giữ.

## 6. Chuyển nguồn, rollback và kill switch

Sau reconcile mới đổi feature flag của domain sang IDB/repository. Chưa đổi tất cả route cùng lúc. Không để route A đọc legacy trong khi route B sửa IDB cùng domain; integration gate phải kiểm mọi reader/write path của domain. Một migration marker không thay bằng chứng counts và snapshot.

Kill switch tắt network sync, giữ local writes/outbox và trạng thái “chưa đồng bộ”; không clear dữ liệu hoặc gửi tới project khác. Rollback frontend về V5.1 chỉ đọc **legacy snapshot cũ** nên chưa thấy dữ liệu mới V6; phải cảnh báo trước. Để tiếp tục làm việc với dữ liệu mới: export V6 đầy đủ gồm server base/pending/conflicts/device state/provenance (không auth secrets), và export V1 compatibility với preview giới hạn500/1000/1095 + nhóm không biểu diễn được. Không tự ghi ngược/cắt vào keys V5 để giả rollback đầy đủ.

Rollback một import đã commit: user xem diff, chỉ tombstone rows do import tạo mà chưa có thay đổi phụ thuộc sau đó, CAS ở revision hiện tại; rows reused không xóa. Preferences/checkins đã sửa tiếp không restore snapshot cũ đè lên. Có dependents/conflict thì dừng và resolve. Mỗi compensating operation có receipt/change log; không chạy SQL DELETE hàng loạt theo ngày import. Raw legacy và rescue exports vẫn nguyên.

Xóa account/export dữ liệu là workflow riêng: yêu cầu reauth/confirmation, dừng writes và drain hoặc export pending, xóa server theo auth FK và private ledgers, xác nhận backup retention. Các thiết bị offline có thể còn cache, cần reconnect purge/tự xóa trên máy; không hứa remote wipe offline.

## 7. CI backend và regression hiện hành

Backend workflow đã hiện thực, nay gồm upgrade fixtures/reset/241 pgTAP/37 REST/Auth thật/Mailpit và browser Chromium/WebKit; counts phải đọc lại đúng HEAD ở từng run. Các scripts `test:data`, `test:sync`, `test:db` dưới đây là tên đề xuất từ PR0, chưa phải npm scripts; lệnh hiện hành ở [BACKEND_PR1A](BACKEND_PR1A.md), `package.json` và `.github/workflows/backend-checks.yml`. Staging/restore không thuộc CI local.

Hiện `responsive.yml`: Node24, npm install, unit, Chromium+WebKit; pull_request vào main không path filter, push main có paths và bỏ qua Markdown. Playwright CI retries=1: success có retry không phải clean run. Không sửa retries/assertions để có xanh.

PR1a thêm `backend-checks.yml` chạy pull_request + push main khi `supabase/**`, `modules/data/**`, data/sync tests/package/workflow liên quan; manual dispatch. Required aggregator luôn chạy nếu được cấu hình required check, không để path-skipped treo merge gate. `permissions: contents:read`, không `pull_request_target` chạy code fork với secrets, không production credentials, không cloud deploy trong PR.

Các job: pin CLI → start Supabase local/ephemeral → apply từ DB rỗng và upgrade từ previous schema seed giả → `supabase test db` (pgTAP) → lint/constraints/RLS/RPC tests → stop cleanup always. Các key local test sinh bởi ephemeral runtime chỉ dùng loopback, không copy vào frontend artifact. Scripts dự kiến `test:data`, `test:sync`, `test:db`, giữ `test:unit`, `test:responsive`; test patterns phải thực sự include suite mới (Playwright hiện dùng explicit testMatch). Integration browser test dùng fake network cho unit và local Supabase cho auth/RLS E2E; không claim mock là RLS security evidence.

Ma trận bắt buộc:

| Nhóm | Acceptance test |
|---|---|
| Security | A own read/create/update/delete; B/anon deny cả REST/RPC; user_id injection, field revision/receipt injection, cross-user FK, definer path/grants |
| Sync | Hai contexts, cùng expected rev chỉ một writer thắng; append timeout-after-commit retry không duplicate; receipt khác payload deny; slow transaction/rollback không miss cursor |
| Offline | Local tx crash/quota, pause/resume, 401 refresh, retry/backoff, two tabs, logout khi request in-flight, account switch, reset_required còn pending |
| Migration | Từng optional field thiếu/null, malformed JSON/dates/unknown enums, duplicate IDs/overlap file, near/over legacy limits, interruption giữa batches và reconcile |
| Domain/UI | Không attendance từ score/timer/checklist; checkin clear không resurrect; plan/lesson distinction;8 route, reload/Back, local date/day boundary/timezone |
| PWA | Shell/visited routes offline, cache cũ upgrade, callback không lưu code/token, auth/REST không cache; version/cache sync khi có app release |

Mọi PR kiểm exact HEAD SHA và run logs, ghi pass/fail/flaky, không chỉ badge. Staging deploy manual sau PR review, synthetic accounts trước rồi opt-in pilot; production gate có owner approval, backup/restore evidence, SMTP/cost/privacy readiness. QA thật iPhone/iPad/Android tách khỏi Playwright390/820/1180/1440.

## 8. Checklist pilot và sự cố

- Rollout: flags off → staging test users → internal pilot → preview/consent import → sync preferences/checkins → thêm domains → owner duyệt rộng hơn. Theo dõi queue age, conflict/error rate, duplicate prevention, cursor lag, quota và chi phí bằng metadata tổng hợp, không log notes/token/backup payload.
- Mất mạng/401: giữ queue, hiển thị retry/login; không gửi lại dưới user khác. Server outage: kill switch local-first, export rescue khi có quota risk.
- Phát hiện duplicate/cursor miss/cross-user leak: dừng rollout/sync, bảo toàn outbox/snapshots/evidence đã lọc PII; security owner điều tra, thu hồi session nếu cần. Không “sửa” bằng xóa client DB.
- Gate production: staging restore chứng minh RPO/RTO, kiểm retention/reset epoch, owner security review, privacy/export/delete và support path, clean CI đúng SHA, Pages đúng merge SHA nếu owner merge sau này. PR0 kết thúc ở PR tài liệu, không merge/deploy V6.

PR3a bổ sung raw rescue18 khóa và inventory preview chỉ đọc: xem [RESCUE_PREVIEW_PR3A](RESCUE_PREVIEW_PR3A.md). Các bước domain validation/import consent/RPC bên trên vẫn thuộc PR3b, chưa được thay bằng việc chỉ parse JSON.

PR3b là backend RPC local/CI riêng; gate domain preview, account consent, quarantine/export và importer UI ở PR3c vẫn bắt buộc trước upload. Hợp đồng [ATOMIC_IMPORT_PR3B](ATOMIC_IMPORT_PR3B.md).

PR3c bổ sung mapper/account-consent/checkpoint pilot theo [IMPORT_PILOT_PR3C](IMPORT_PILOT_PR3C.md), cả Auth/import flags mặc định tắt. Repair manifest/group expansion và rollout thật còn gate, không coi merge backend là đủ bật sync.

PR4a bổ sung canonical cache/cursor atomic cho hai domain, không gửi outbox hoặc chuyển nguồn UI: [CANONICAL_PULL_PR4A](CANONICAL_PULL_PR4A.md). PR4b cần epoch fence trong server transaction trước sender; pull rồi push riêng không đủ chống race restore.

PR4b bổ sung prepare_sync/apply_sync_operation với epoch fence, immutable sender/ack/conflict API theo [SYNC_SENDER_PR4B](SYNC_SENDER_PR4B.md). Legacy RPC giữ nguyên; chưa UI/source switch hoặc rollout.

PR4c / V5.5.0 tích hợp nguồn tài khoản opt-in và UI sync/conflict cho mục tiêu/check-in ở Journey/Progress; flags vẫn tắt, chưa rollout. Backup V5 chỉ dữ liệu khách; cache V6 hai domain có export riêng chưa round-trip. [Hợp đồng PR4c](SYNC_UI_PR4C.md).

PR5a1 bổ sung fenced event RPC và policy cursor/lease riêng cho4 event domains, chưa source UI hoặc rollout; consent PR4c chỉ áp dụng preferences/checkins. [Hợp đồng PR5a1](ACTIVITY_SYNC_PR5A1.md).

[PR5b2b1/V5.11.0](ACADEMY_DEVICE_STATE_PR5B2B1.md) persist checklist và bước tập trung Học viện trong device_state account/browser, cùng schema1. Typed atomic patches kiểm cả hai consent revisions, namespace/late-response guards và thông báo quota/corrupt; không RPC/outbox/guest mirror. Timer vẫn RAM, state mới chưa nằm trong export hiện tại; full device state/backup/purge còn gate.

[PR5b2b2/V5.12.0](COURT_CHECKPOINT_PR5B2B2.md) thêm điểm dừng Court local theo account/browser/plan: explicit pause/save/preview/restore paused, không tự resume hoặc tạo RPC/attendance. Typed device_state + identity metadata trên schema1; CAS checkpoint và consent/own ACK plan/selection/epoch fence trong transaction. Hai tab cần đọc/review trước ghi đè, quota giữ frozen retry, late responses/dialog guards không cập nhật account khác. Guest giữ timer key cũ. Checkpoint chưa nằm trong export hiện tại; full backup/purge và pilot gates còn lại.


## Cập nhật PR5b2c1 / V5.13.0 — cứu hộ cache chỉ đọc

[PR5b2c1/V5.13.0](ACCOUNT_RESCUE_PR5B2C1.md) thêm cứu hộ toàn bộ cache account trên máy và kiểm tra tệp chỉ đọc; chưa restore/purge hoặc backup toàn cloud. Năm flags false, URL/key trống; [tiến độ/gates](V6_PROGRESS_REVIEW.md). Snapshot readonly một transaction trên records/outbox/conflicts/sync_cursor/import_receipts/device_state/metadata, đúng namespace đăng nhập. Giữ cả checkpoint Court/checklist/focus và metadata identity trước đây chưa được các exports cũ bao phủ. Không đọc guest/legacy_snapshots/Auth, không SQL/RPC hoặc tự replay. Credential/owner/size/JSON validation fail toàn bộ; SHA256 không là quyền restore. A→B/logout bỏ phản hồi và link cũ. Tệp plaintext riêng tư cần lưu ngoài browser. Chưa thay gate restore/purge/backup vận hành; policy target chưa là SLA.

## PR5b2c2b / V5.17.0 — UI dọn cache staging

Không SQL mới; staging vẫn7 migrations, không chạy lại6→7. Frontend nâng IDB1/2→3 giữ rows, versionchange đóng connection cũ; tab giữ connection làm blocked, đóng/cập nhật tab rồi thử lại. Không downgrade schema/xóa browser storage để rollback. Nếu lỗi: tắt purge config ở bản mới tương thích DB3, giữ guest và cache; không deploy lại repository2 lên DB3. Coordination DB hỏng bị chặn bảo trì/Auth gate, giữ nguyên dữ liệu để điều tra. [Hợp đồng và giới hạn](CACHE_PURGE_UI_PR5B2C2B.md).
