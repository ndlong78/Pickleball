# V6 — tiến độ và kế hoạch sau PR #22

Cập nhật ngày **09/11/2026**. Main `0fb6fc85060cd025482394e0f53f527e1f3f6bbc` / V5.13.1 sau [#37](https://github.com/ndlong78/Pickleball/pull/37). [UI42367445245](https://github.com/ndlong78/Pickleball/actions/runs/42367445245):327 unit +3 HTTP +1 Workers local +528 browser Chromium/WebKit +10 lượt WebKit bổ sung pass,0 fail/flaky/retry; [backend42367445298](https://github.com/ndlong78/Pickleball/actions/runs/42367445298):275 pgTAP/45 REST và Auth local thật hai engines pass; [Pages42367444675](https://github.com/ndlong78/Pickleball/actions/runs/42367444675) success cùng merge SHA.

PR5b2b1 checklist/focus, Court checkpoint, cứu hộ toàn cache/preview chỉ đọc và Workers static deployment đã merge. Chưa full restore/purge hoặc backup toàn cloud. Auth enabled=true với URL/key công khai; bốn flags dữ liệu false. Không PR mở trùng khi bắt đầu cập nhật bằng chứng này.

**Staging hiện hành:** `https://pickleup-staging.home-309.workers.dev/`. Operator xác nhận đã nhận email OTP, đăng nhập và kiểm dữ liệu riêng; [sổ nghiệm thu](STAGING_AUTH_VERIFICATION.md) phân biệt báo cáo operator, CI mock/GoTrue local và phần chưa chạy. Chưa đối chiếu Cloudflare build/SHA/browser thực tế hoặc chứng minh đầy đủ SMTP/RLS A/B/expiry. Codex chưa trực tiếp quan sát Managed; môi trường không có kết nối quản trị hoặc quyền truy cập domain staging.

**Full V6:** OTP/session và private data; các nguồn account trên tám route; offline/manual sync/retry/CAS conflict; nhập legacy có preview/provenance; backup/restore/cache privacy; vận hành staging/backup/Auth recovery/deletion/retention. Main đã có phần lớn luồng nghiệp vụ. Chưa coi V6 hoàn tất hoặc mở pilot đến khi các gate phục hồi và vận hành bên dưới đạt.

**Các bảng mã nguồn và evidence ở mục1–3 dưới đây là snapshot lịch sử sau #22** (`6a59bdb622ae564a7f954584191197f9aa4c0767`, app5.5.0), không phải danh sách thiếu của HEAD hiện tại. Mục4–5 phản ánh kế hoạch tiếp theo; hợp đồng từng PR giữ phạm vi riêng.

## 1. Đã triển khai đến đâu

| Hạng mục | Mã đã merge | Trạng thái sử dụng và phần còn thiếu |
|---|---|---|
| PWA khách | Tám route, 80 bài 1.0–4.0, Journey, mục tiêu/lịch, check-in thủ công, điểm/lịch sử, giáo án và trận đấu | Chế độ mặc định hoạt động bằng 18 khóa V5. Offline shell/trang đã cache; thiết bị vật lý và bài tập ngoài sân vẫn cần nghiệm thu |
| Database/RPC | PR1a [#12](https://github.com/ndlong78/Pickleball/pull/12), importer #16, epoch fence #20/#22 | Migrations, FORCE RLS, role RPC hẹp, CAS/receipts/counter và kiểm thử local thật; chưa chứng minh đã áp dụng lên staging/production |
| Email OTP/session | PR1b [#13](https://github.com/ndlong78/Pickleball/pull/13), sửa logout/real browser #18 | Adapter riêng, SDK restore/refresh, logout local, nhiều tab, A→B và phản hồi muộn; flag tắt. Chưa Managed gateway/SMTP deliverability hoặc browser expiry/auto-refresh theo thời gian thực |
| IndexedDB/outbox | PR2 [#14](https://github.com/ndlong78/Pickleball/pull/14), mở rộng #19–#22 | Namespace user, transaction record+queue, local CAS, cursor/lease riêng, giữ intent khi quota/401/reset. Không mã hóa cache hoặc chống OS eviction |
| Cứu hộ và preview | PR3a [#15](https://github.com/ndlong78/Pickleball/pull/15) | UI raw rescue 18 khóa và preview chỉ đọc; không xuất Auth/session. Backup JSON V5 và raw rescue là hai định dạng khác nhau |
| Import pilot | PR3b [#16](https://github.com/ndlong78/Pickleball/pull/16), PR3c [#17](https://github.com/ndlong78/Pickleball/pull/17), real Auth #18 | Mapper, quarantine, overlap review, consent theo account, batch nguyên tử, checkpoint/replay/reconcile; flag tắt. Chưa repair/amend manifest, thêm nhóm cùng fingerprint, compensation hoặc resume sau mất IDB trên thiết bị khác |
| Mục tiêu/check-in tài khoản | PR4a [#19](https://github.com/ndlong78/Pickleball/pull/19), PR4b [#20](https://github.com/ndlong78/Pickleball/pull/20), PR4c [#21](https://github.com/ndlong78/Pickleball/pull/21) | Đã nối opt-in Journey/Progress, pull và gửi thủ công, conflict preview/CAS/restore, export cache hai domain; flag tắt. Không có background sync; export chưa nhập lại được |
| Bốn loại sự kiện | PR5a1 [#22](https://github.com/ndlong78/Pickleball/pull/22) | `academy_attempts`, `skill_assessments`, `training_entries`, `match_records`: fenced RPC, typed projection, cursor/lease riêng, exact retry. **Mới foundation**, chưa source UI/consent/runtime hoặc API/UI repair sự kiện |
| Giáo án/lựa chọn/profile | Schema, manual/import RPC và repository generic đã có | Chưa nguồn account trên UI, chưa sender fenced cho các domain này. Múi giờ check-in PR4c được xác nhận riêng; chưa UI quản lý profile |
| Backup/privacy/vận hành | Policy và runbook đã có | Chưa full V6 backup round-trip, purge cache, account deletion workflow, encrypted DB backup/job/Auth recovery/restore drill hoặc retention automation |

PR0 [#10](https://github.com/ndlong78/Pickleball/pull/10) và policy [#11](https://github.com/ndlong78/Pickleball/pull/11) đã merge trước các bước trên. **PR4 đã có tích hợp mã nhưng chưa rollout; PR5a chỉ hoàn tất phần nền PR5a1; PR5b và PR6 chưa hoàn tất.** Không dùng số PR đã merge làm tỷ lệ hoàn thành sản phẩm.

## 2. Bằng chứng ở đúng SHA

| Bằng chứng | SHA / run | Kết quả |
|---|---|---|
| PR #22 regression | `6b79fa11309134538766cfe93ff167554b443545`, [41316310390](https://github.com/ndlong78/Pickleball/actions/runs/41316310390) | 206 unit + 334 browser pass; thêm 5 lượt WebKit rescue với retries=0; 0 fail, 0 flaky, không browser retry |
| PR #22 backend | Cùng HEAD, [41316310396](https://github.com/ndlong78/Pickleball/actions/runs/41316310396) | 241 pgTAP + 37 REST (9+14+6+8), GoTrue/Mailpit/SDK thật và browser Auth trên Chromium/WebKit pass |
| Main sau merge #22 | `6a59bdb622ae564a7f954584191197f9aa4c0767`, [regression 41376496905](https://github.com/ndlong78/Pickleball/actions/runs/41376496905), [backend 41376496957](https://github.com/ndlong78/Pickleball/actions/runs/41376496957) | completed/success cả hai: 206 unit + 334 browser + 5 lượt WebKit retries=0; 241 pgTAP + 37 REST và Auth thật trên hai engines pass; 0 fail, 0 flaky, không browser retry |
| Pages sau merge #22 | Cùng merge SHA, [41376496241](https://github.com/ndlong78/Pickleball/actions/runs/41376496241) | completed/success; frontend deploy, flags vẫn tắt |

Unit fake-IDB/model và native-IDB browser với mock transport kiểm logic/lifecycle, không thay evidence RLS/Auth thật. Backend chạy Supabase local ephemeral, không production: pgTAP/REST kiểm owner/grants/CAS/concurrency/epoch; GoTrue và Mailpit kiểm yêu cầu OTP→nhận mã→verify→private RPC→refresh/logout. Browser integration giữ luồng UI Auth/import/mục tiêu/check-in; bốn event kinds được thử qua standalone API, chưa phải event product UI. Publishable alias ở gateway local vẫn là fixture, không phải Managed staging.

Lượt PR #22 đầu `7a03154` có 331 browser pass + 1 flaky WebKit390 rescue. Đã ghi nhận readiness gap, sửa test chờ loader/fonts/frame và thêm controlled delayed-module regression; HEAD cuối sạch như trên. Không dùng workflow success có retry làm clean evidence. Các flaky lịch sử PR0/PR3c được giữ trong hợp đồng tương ứng.

Trong lần rà soát tài liệu: local Node24 chạy lại 206 unit pass/0 fail. Cài browser trên executor bị CDN trả403 `Domain forbidden`; không gọi đây là đã chạy browser local. Native browser/full Supabase dùng evidence Actions nêu trên và CI của chính PR tài liệu; exact PR HEAD/kết quả cuối ghi trong mô tả PR, tránh commit tài liệu chỉ để tự cập nhật SHA của nó.

## 3. Kết quả rà soát mã và khoảng trống

Đã đối chiếu Git history/PR/Actions/Pages với config, router/loader, Auth adapter, repository/pull/sender, domain runtime/controller/UI, event core/RPC, importer và backup contracts. Đây là rà soát kiến trúc, phạm vi và evidence; chưa phải pentest độc lập hoặc QA thiết bị vật lý.

| Phát hiện | Hệ quả / cách xử lý |
|---|---|
| README/ROADMAP và phần mở đầu nhiều docs còn ghi PR0-only, PR1 chưa làm hoặc bản cũ chưa merge | Cập nhật trạng thái hiện hành, giữ phần lịch sử có nhãn; tập trung progress tại tài liệu này, hợp đồng chi tiết ở từng PR |
| `page-loader.js` nạp domain runtime PR4c nhưng chưa nạp `activity-core.js`; consent trong repository chỉ hai mutable domains | Chưa thể nói UI điểm/nhật ký/trận đấu đã đồng bộ. PR5a2 phải có consent, source và lifecycle riêng; không kế thừa consent PR4c |
| Activity cursor/lease riêng, mutable resolution từ chối event; blocked intents chỉ inspect/export | Cần repair/resolution có review trước khi mở event writes cho người dùng; không đổi UUID/epoch hoặc force để bỏ qua lỗi |
| Manual training cần plan UUID cùng owner; hiện real-Auth fixture nhập plan trước | Chốt nguồn plan và dependency trước nhật ký account mới; không dùng ID legacy hoặc tạo plan giả. Có thể đọc lịch sử/import trước khi hỗ trợ tạo mới |
| Các reader Journey/Coach/Progress còn dùng điểm/plan/selection legacy | Mỗi domain chuyển đồng bộ mọi reader/writer, giữ core nhận snapshot đồng bộ; nhãn nguồn rõ trong giai đoạn chuyển từng domain, không mirror account vào khóa V5 |
| Export PR4c chỉ preferences/check-ins; raw rescue và backup V5 không chứa toàn account | Hoàn thiện V6 export/import đầy đủ base/pending/frozen/conflicts/provenance/device state trước pilot dữ liệu thật; không gọi export hiện tại là bản sao lưu đầy đủ |
| Logout cách ly DOM/memory nhưng giữ cache/queue không mã hóa; chưa purge UI | Cần luồng export/preview/xóa cache máy chung, không mất pending; không hứa remote wipe thiết bị offline |
| `main` có `protected:false` ở API tại snapshot | Đề nghị owner bật branch protection/ruleset với PR review và hai check `responsive`/`backend`; PR này không đổi repository settings |
| Chưa evidence SMTP/Managed gateway, backup/restore/deletion, tải gần cap, physical devices | Giữ gate pilot đóng. HTTP200 domain errors, token/OTP/payload không vào log/artifact, zero-budget và không production credentials tiếp tục bắt buộc |

## 4. Kế hoạch triển khai theo thứ tự phụ thuộc

PR5a2a/#24, PR5a2b/#25 và PR5a2c/#26 đã merge; PR5b1a/#27 đã merge; PR5b1b/#28 đã merge; PR5b1c/#29 UI cá nhân đã merge; PR5a2d/#30 training đã merge; PR5b2a/#31 Academy selection đã merge; PR5b2b1/#32 đã merge; PR5b2b2/#33 đã merge; PR5b2c1/#34 đã merge; đang chuẩn bị hướng dẫn staging với dữ liệu giả. Các bước sau đó là **phạm vi kế hoạch**, chưa là GitHub PR đã mở. Mỗi bước nhỏ có CI đúng HEAD và review riêng, không tự merge. Có thể tách nhỏ thêm theo reader/writer thực tế; không ấn định lịch khi phụ thuộc staging chưa sẵn sàng.

| Ưu tiên / bước | Kết quả cần có | Gate để coi hoàn tất |
|---|---|---|
| Đã merge #24 — PR5a2a: vòng đời và repair sự kiện | Hợp đồng consent/source riêng, blocked/conflict/epoch review và export đủ intent; phân biệt create, delete và outcome chưa biết | Unknown commit phải replay request cũ trước quyết định; không update/restore event bất biến, không rebind epoch hoặc sinh event mới im lặng; A→B/multi-tab/quota/native reload + Auth thật |
| Đã merge #25 — PR5a2b: Academy end-to-end | Chọn nguồn tài khoản rõ ràng, lưu lượt mới với UUID bền vững; latest/history/trend dùng projection account khi đã opt-in | Rà soát toàn bộ reader/writer Academy và các trang tham chiếu; không dual-write V5, không dựng attempt từ latest snapshot, không trim >500; cùng bài/level/content/conditions; rollout flags off, bump build/assets/cache khi nối runtime |
| Đã merge #26 — PR5a2c: đánh giá và trận đấu | Lần lượt nối self/stage/advanced assessment và matches qua cùng lifecycle; UI nguồn/pending/repair rõ | Thang 0–2/0–20 và metric sets riêng, không suy DUPR/attendance; không gửi notes vào logs; mọi consumer đã mount cập nhật và xóa account cũ |
| 4 — PR5b1a RPC → PR5b1b client/review → UI plans/selections, rồi PR5a2d training | RPC/client/UI và training đã merge #27–#30; own plan ACK, mọi reader cùng nguồn, manual send/delete/review. Backend/UI main sau #31 sạch; sync-ui readiness fixture đã sửa | Snapshot plan immutable, kết quả CAS, plan→training/selection dependency, orphan/deleted plan có UX; timer giữ local, không tạo attendance. Phụ thuộc này cần trước manual training, dù các phần khác PR5a đã xong |
| Đã merge #31 — PR5b2a: Academy account lesson selection | Choice sparse CAS, cross-route guards và RAM practice privacy; đã merge/deploy5.10 | Native reload/offline/two tabs/late A→B, quota/replay/conflict, không đổi personal choice hoặc ghi guest; clean HEAD CI |
| Đã merge #32 — PR5b2b1: Academy checklist/focus | Persist account/browser checklist và bước tập trung; timer vẫn RAM, chưa full device state | Atomic patch/two tabs/consent fence/quota/corrupt/reload/offline/A→B và Auth thật; no guest mirror/no RPC |
| Đã merge #33 — PR5b2b2: Court checkpoint | Manual pause/save/preview/restore paused trên cùng account/browser; không tự resume hoặc gửi RPC | CAS checkpoint và plan/selection/consent/epoch fence, stale-tab review, quota/reload/offline/late A→B và Auth thật |
| Đã merge #34 — PR5b2c1: cứu hộ cache chỉ đọc | Đủ bảy stores own account, export/preview; không restore/purge | Consistent snapshot, no truncation/credentials/foreign owner, late A→B, native browsers và Auth local thật |
| Tiếp theo — PR5b2b/c: device state, backup và phục hồi | Persist account device state đúng namespace, full V6 backup round-trip, compatibility export riêng, cache purge có preview/export pending; profile UI nếu cần | Native reload/offline/two tabs/late A→B trên 8 route; không trim lịch sử, không hứa V5 restore được dữ liệu V6; test import/export pending/frozen/conflicts/device state và credential exclusion |
| 6 — PR6: hardening/vận hành pilot | Staging SMTP/Managed gateway, Auth expiry/refresh browser thật, importer repair/compensation, backup/Auth recovery/deletion/restore; load/rate/quota/privacy/support | Encrypted backup 7 bản ngày + 4 bản tuần, tuổi tối đa 35 ngày; restore đổi epoch và replay deletion markers; chứng minh RPO24h/RTO1 ngày làm việc; clean CI + QA iPhone/iPad/Android/PWA thật trước opt-in dữ liệu thật |

Công việc staging có thể chuẩn bị với dữ liệu giả trong lúc hoàn thiện code, nhưng không mở pilot thật để bù thiếu repair/backup/privacy. Giữ receipts/change log/tombstones toàn pilot; thiết kế minimum cursor/replay horizon/full-resync trước bất kỳ GC nào. Background sync chỉ xem xét sau luồng thủ công ổn định; coach sharing, video, CMS và nội dung 4.0–5.0 là hướng dài hạn chưa triển khai trong các bước này.

## 5. Việc owner cần chuẩn bị và điểm dừng hiện tại

- **Chuẩn bị staging:** làm theo [hướng dẫn operator](SUPABASE_STAGING_DEPLOYMENT.md); project ref/URL có thể đối chiếu, credentials qua cấu hình bảo mật. #34 đã merge/deploy app/cache5.13.0, giữ năm flags tắt; PR hướng dẫn không bump version hoặc sửa runtime. Chưa thực hiện triển khai cloud từ môi trường này.
- **Khi bắt đầu staging:** cung cấp quyền project đúng môi trường qua kết nối bảo mật; kiểm region Singapore nếu khả dụng, Free quota và tách staging/pilot. Frontend chỉ URL HTTPS + publishable key; DB/service-role/SMTP secrets nằm ở cấu hình vận hành an toàn, không chat/repo/client.
- **Trước email pilot:** custom SMTP/sender/domain đã xác minh, template OTP nhập mã, expiry/rate limits và `/Pickleball/` Site URL/allowlist; kiểm delivery/spam/abuse. Flag client không thay chính sách server về signup hoặc quyền RLS.
- **Trước dữ liệu thật:** kho backup mã hóa ngoài Supabase, job/quyền operator, restore/Auth identity drill và workflow xóa account/cache đã kiểm chứng; privacy/support và QA thiết bị thật. Target trong [policy](PILOT_OPERATING_POLICY.md) chưa thành SLA đang vận hành.
- **Tiếp theo về code:** safe restore/purge và các gate device state còn lại sau #34; chuẩn bị staging song song theo hướng dẫn, giữ flags off. Không cần quyết định lại provider/CAS/Auth đã ủy quyền; không dùng production, không tự nâng ngân sách hoặc mở đăng ký công khai.

Hợp đồng tham chiếu: [kiến trúc](ARCHITECTURE_V6_DATABASE.md), [dictionary](DATA_DICTIONARY.md), [runbook](MIGRATION_RUNBOOK.md), [policy](PILOT_OPERATING_POLICY.md), [threat model](THREAT_MODEL.md), [PR4c](SYNC_UI_PR4C.md), [PR5a1](ACTIVITY_SYNC_PR5A1.md).
