# PickleUp V6 — threat model (thiết kế PR0)

Phạm vi: một người dùng nhiều thiết bị, private training/match data, Supabase Auth/Postgres/RPC/RLS, IndexedDB và GitHub Pages. Chưa mở sharing/coach/admin CMS. Thiết kế kiểm soát chưa phải kết quả pentest hoặc bằng chứng RLS đã được triển khai. Đọc [architecture](ARCHITECTURE_V6_DATABASE.md), [dictionary](DATA_DICTIONARY.md), [runbook](MIGRATION_RUNBOOK.md).

**Cập nhật PR1a:** schema/RLS/RPC và tests database local đã được bổ sung theo [BACKEND_PR1A](BACKEND_PR1A.md). Evidence cuối lấy từ PR CI đúng SHA, không thay pentest/security review độc lập. Rủi ro Auth/session/cache/import/production trong bảng dưới vẫn còn đến các PR tương ứng; frontend chưa dùng backend.

## 1. Tài sản, tác nhân và trust boundaries

Tài sản: lịch sử/ghi chú/checkins/plan, tính đúng đắn attendance, local pending changes, Auth refresh/access tokens, email quản lý tại Auth, export và DB backup, integrity source/CI. Nội dung tập public không cần Auth.

Tác nhân: chủ tài khoản; người khác dùng chung browser/OS; client cố ý sửa REST/RPC/UUID; JSON độc hại; script/dependency bị xâm nhập; thiết bị offline/đồng hồ sai; operator sai môi trường. Không tin client localStorage, URL, backup, timestamps, owner ID hoặc token payload chưa verify.

Boundary 1: dữ liệu nhập → validator/render DOM. Boundary2: browser namespaces → Auth session epoch. Boundary3: browser publishable key/JWT → API/RPC/RLS. Boundary4: RPC privilege → PostgreSQL constraints/counter/receipts. Boundary5: source/CI → staging/production. Boundary6: dữ liệu export/backup → thiết bị và người vận hành giữ file. HTTPS bảo vệ đường truyền, không làm browser XSS-safe.

## 2. Risk register và test gates

| Đe dọa / mức độ | Kiểm soát bắt buộc | Test/evidence và owner PR |
|---|---|---|
| Đọc/ghi chéo tài khoản, IDOR — nghiêm trọng | user_id từ auth.uid, RLS tất cả private tables, composite owner FK, revoke direct DML, RPC grants/search_path/role hẹp, không service key client | A/B/anon SELECT/INSERT/UPDATE/DELETE direct REST+RPC; forged user_id/FK; SQL grants review — PR1a |
| Mass assignment / definer bypass — nghiêm trọng | Reject unknown server-managed fields, fixed search_path/schema-qualified objects, NOLOGIN non-BYPASSRLS function role + FORCE RLS khi dùng definer | Tấn công revision/owner/receipt/log, null auth, role switch và gọi helper functions — PR1a |
| Lost update, delete resurrect, replay — cao | CAS mọi mutable entity; tombstones; operation id + request hash receipts transaction; stable event UUID; không LWW | Hai writer same base, clear vs update, timeout-after-commit, duplicate ID khác payload, old device full-resync — PR1a/4 |
| Cursor bỏ sót commit hoặc clock skew — cao | Counter per-user tăng trong cùng serialized transaction; pull snapshot/H ổn định; cursor+apply atomic IDB; client time không phân xử | Slow commit/rollback, pagination concurrent writes, bigint precision, reset epoch — PR1a/4/6 |
| Lộ cache khi logout/chuyển account — cao | Namespace per user/guest; stop sync + epoch invalidation + clear DOM/memory; pending không chuyển owner; offline cache policy rõ | A request in-flight rồi login B, Back/reload/two tabs, expired token và offline — PR1b/2/4 |
| XSS qua notes/JSON/URL — cao | textContent/safe DOM; schema/size/depth caps; không eval; route/redirect allowlist; CSP thích hợp Pages; dependency pin | Payload HTML/script/URL trên mọi route import/render, stored XSS round-trip; review innerHTML chỉ trusted static — PR3/5/6 |
| Token/callback leak, account takeover — cao | SDK session lifecycle, OTP/PKCE, exact redirects, strip query sau exchange, không log/referrer/cache code, reauth cho delete | Sai/missing verifier, link khác thiết bị, expired/replayed OTP/code, open redirect, SW navigation cache inspection — PR1b/6 |
| Import mất dữ liệu / double counting — cao | Raw rescue18 keys, consent, quarantine, manifest/item receipts, overlap review, không tạo attendance từ score/timer | Corrupt/over-limit/optional/mixed device imports, defaults/unknown dates, batch crash/retry/reconcile — PR3 |
| Quota/eviction/mất máy — cao | Atomic IDB tx, error UX, rescue export ngoài browser, outbox còn nguyên, DB backup restore drill | Quota denied/schema upgrade interrupted/storage eviction, backup restore counts/RLS — PR2/6 |
| DoS/chi phí/email abuse — trung bình/cao | Auth rate limits/captcha nếu cần, SMTP quota, RPC operation/JSON caps, per-user quotas, backoff, bounded pull; benchmark lock | Burst/replay/nested JSON, limit bypass direct API/RPC, SMTP delivery/rate alerts — PR1/6 |
| Supply chain hoặc secrets CI — nghiêm trọng | Node24, pinned reviewed SDK/CLI/actions, least permissions, fork PR không secrets, no prod deployment/reset in tests | Scan repo/artifacts/logs, review workflow trust, staging/prod separation — PR1a/6 |
| Xóa sai/backup không restore được — cao | Reauth + preview deletion; compensation CAS; DB backups encrypted/access-restricted và restore drill; sync epoch đổi sau restore | Import rollback còn rows reused/dependents, account purge với offline client, staging recovery — PR3/6 |
| Thống kê sai gây hiểu nhầm tập luyện — cao | Explicit manual check-in provenance, scale self0–2 tách0–20, cùng bài/level/conditions, null lesson không suy đoán, mục tiêu current không history | Domain unit+E2E Journey/Progress, timezone/day boundary, timer finish không checkin — PR4/5 |

## 3. Auth/local privacy chi tiết

Public URL/publishable key là thông tin client, không secret; quyền private nằm ở JWT/RLS/RPC. Service role, DB password, SMTP secret không ở browser, repo, source maps hoặc PR logs. Không lấy production secrets để chạy QA. Không lưu session/token trong legacy rescue hay export V6.

Browser localStorage/IndexedDB session có thể bị XSS hoặc người có quyền OS đọc; RLS không bảo vệ khỏi script chạy dưới token của chính user. Namespace chỉ ngăn hiển thị nhầm, không mã hóa cache. Không hứa logout xóa được mọi bản file export hoặc remote wipe máy offline. Trên thiết bị chung nên export pending rồi xóa cache của account với consent; giữ legacy guest chưa thuộc account theo policy rõ. Không mirror dữ liệu account vào localStorage V5 toàn origin.

Email đổi/khôi phục/xóa account theo Supabase Auth và recent authentication; không làm ownership dựa trên email vì email có thể đổi. Khi A logout local, session phía thiết bị khác tùy lựa chọn revoke local/global; phải có UX rõ và test. Mất mạng có thể tiếp tục dùng cache được cho phép nhưng không coi đó là token authorization để server nhận write.

## 4. Data minimization, retention và vận hành

Không yêu cầu giới tính/ngày sinh/vị trí/GPS/hồ sơ y tế; notes tự do có thể chứa PII nên export/log phải xử lý như private. Không thu thập tên/email đối thủ mặc định. Metrics giám sát chỉ outcome/error code/count/latency/cursor lag; không payload, token hoặc raw backup. Tránh thông báo lỗi khác nhau làm lộ object tồn tại của người khác.

Pilot giữ receipts/tombstones/change logs cho đến khi có protocol GC + full-resync; chưa đặt tự xóa. Khi xóa account, hard purge dữ liệu active/ledger đúng owner, backup sẽ hết theo retention được công bố; không hứa erase tức thời khỏi mọi backup. Owner duyệt retention cho raw local exports/conflicts, server logs/backups, đối tượng người dùng/thị trường và chính sách quyền riêng tư trước public launch. Giá/region/backup SLA phải xác minh tại provisioning.

Operator có quyền database vẫn là trust boundary đặc quyền: access ít người, audit, staging data giả, không clone production PII về CI. Backup DB khác JSON download: phải kiểm cả schema, RLS/functions/grants và khả năng liên kết Auth user khi phục hồi. Snapshot backup, Auth recovery và sync epoch có runbook thử trên staging.

## 5. Rủi ro còn lại / release blockers

- Thiết bị offline giữ được bản cache cũ, cannot revoke tức thì. Cần consent/policy và khả năng local purge, không thể giải quyết bằng RLS.
- Legacy không có event IDs/timezone/tombstones đầy đủ; overlap không thể phân xử hoàn toàn tự động. Quarantine và review là hành vi có chủ ý, không được giấu bằng heuristic.
- Pages không cung cấp mọi HTTP security header; XSS/token risk cần review CSP/SDK hosting/auth callback cache. Nếu yêu cầu không đạt thì đề xuất đổi host ở PR riêng, không tự chuyển nền tảng trong PR0.
- Serialization per-user đơn giản hóa tính đúng nhưng có throughput limit; benchmark/import batch bounded trước pilot lớn. Chưa có performance claim.
- Trước production: owner phê duyệt privacy/cost/region, RLS review và allow/deny tests, staging restore RPO/RTO, clean CI đúng SHA, QA thật và hỗ trợ người dùng. PR0 không tuyên bố các gate này đã đạt.
