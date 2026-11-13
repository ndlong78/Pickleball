# PickleUp — ENGINEERING STANDARDS (V5.x)

**Hiện hành — 12/11/2026:** main `6e22b1f` /5.17.0 sau #46 đã merge; UI/Pages/Cloudflare success cùng SHA, logs UI sạch. [PR5b2d1/V5.18.0](RESTORE_PREVIEW_PR5B2D1.md) bổ sung đối chiếu tệp cứu hộ với cache hiện tại và danh sách việc cần kiểm trước khôi phục; đang PR, chưa merge/deploy. Chỉ đọc, chưa restore/replay/ghi đè, giữ IDB3/SQL/Auth/signup và dữ liệu khách. Các mốc thấp hơn là lịch sử.


**Bản vá sau audit #41 (đang PR, chưa áp dụng Managed):** migration7 `20261111000100` thêm first-epoch legacy guard; user đã có head phải dùng writer fenced cho8 kind, profile PR1a giữ nguyên. Source có7 migrations/17 bảng/10 public RPC; staging operator trước đó mới xác nhận6/16/10. [Hợp đồng, giới hạn và SQL Editor6→7](LEGACY_EPOCH_GUARD.md). Các mốc sáu migrations dưới đây là baseline lịch sử, không phải bộ upgrade mới.

**Rà soát sau #41 — 11/11/2026:** main `1f6ecd9` /5.15.0 có UI post-merge557 pass/1 flaky, chưa đạt release sạch dù Pages/backend success. Bản vá5.15.1 chặn Auth ngoài staging/local backend, đóng signup frontend, sửa readiness và khóa dependency CI; đang PR, chưa merge/deploy. [Đánh giá và việc còn lại](REVIEW_SAFETY_2026_11.md).

**Bắt buộc đọc cùng:** [`../AGENTS.md`](../AGENTS.md), [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md), [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md).

## 1. Kiến trúc đúng của repository

`PickleUp` có frontend **static PWA** trên GitHub Pages/Cloudflare Workers Static Assets: HTML5, CSS3, vanilla JavaScript. Guest dùng `localStorage`/JSON; V6 dùng Supabase Auth/PostgreSQL/RPC/RLS và IndexedDB theo ủy quyền pilot. Main `cc0d944` / V5.14.1 sau #40 có Auth và URL thử mục tiêu/check-in; operator đã nghiệm thu lịch tập đề xuất/check-in A→B. PR6b/V5.15.0 mở thử các nguồn còn lại với consent riêng; importer vẫn tắt. [Tiến độ](V6_PROGRESS_REVIEW.md), [evidence](STAGING_AUTH_VERIFICATION.md), [deployment](CLOUDFLARE_WORKERS_STAGING.md). Không thêm framework/dịch vụ trả phí ngoài phạm vi.

**PR6b/V5.15.0:** shared `staging-pilot.js` lazy sau Auth config và trước các domain flags; một guard origin/path/project/publishable key/query. URL thường fail closed; link preferences-checkins giữ phạm vi cũ, account-data mở ba flags để chọn nguồn riêng. Entry dùng điều hướng tài liệu canonical để đổi mode, router tiếp tục giữ query. Không SDK calls trong UI hoặc server/RLS/IDB schema thay đổi. [Hợp đồng](STAGING_ACCOUNT_PR6B.md).

**Baseline lịch sử PR0:** main `8f99fcb` là V5.1.0. [Kiến trúc V6](ARCHITECTURE_V6_DATABASE.md), [dictionary 18 khóa legacy](DATA_DICTIONARY.md), [runbook](MIGRATION_RUNBOOK.md) và [threat model](THREAT_MODEL.md) nay đọc cùng các hợp đồng PR đã merge; từng phần đề xuất chưa là tính năng vận hành. [Policy](PILOT_OPERATING_POLICY.md) ghi quyết định được ủy quyền, không hỏi duyệt lại provider/CAS/Auth. Giữ dữ liệu legacy và QA hiện hữu. `ARCHITECTURE.md` ở root là lịch sử V3.x, không dùng số7 trang thay catalog8 route hiện hành.

| Thành phần | Trách nhiệm |
|---|---|
| `index.html` | Application shell, home, navigation, mount points, mã build |
| `modules/page-catalog.js` | Danh mục 8 route và section IDs |
| `modules/page-router.js` | `?page=...#section`, history, điều hướng nội bộ |
| `mobile-ui.js` | Menu "Thêm" dùng chung cho thanh trên và dock (V5.18); router vẫn giữ `aria-current` |
| `modules/settings-surface.js` | Ẩn thẻ tài khoản/pilot và chẩn đoán trên production; chỉ trình bày, Auth/RLS vẫn là ranh giới bảo mật |
| `modules/page-loader.js` | Lazy-load JS/CSS/HTML fragment, giữ module sau khi mở |
| `pages/*.html` | Static trusted markup của các route tải theo nhu cầu |
| `modules/*-core.js` | Logic thuần, dễ kiểm thử và không dùng DOM nếu không cần |
| `modules/*-ui.js` | Event, tương tác và render, không thay thế logic core |
| `modules/training-journey-core.js` / `-ui.js` | Luồng Hành trình V5.0 |
| `modules/weekly-goals-core.js`, `weekly-plan-core.js` | Mục tiêu/lịch tập **dự kiến** |
| `modules/weekly-checkins-core.js` | Nhật ký attendance được **xác nhận thủ công** |
| `modules/plan-reality-core.js` | Đối chiếu mục tiêu–hoạt động thực tế |
| `sw.js` / `modules/pwa-client.js` | Cache theo bản phát hành, cập nhật offline |
| `package.json` / `playwright.config.cjs` | Node.js 24, unit tests, Chromium/WebKit |
| `tests/` | Unit và E2E/hồi quy, trong đó có kiểm thử legacy/PWA |

**Không refactor vượt phạm vi.** Khi thêm tính năng: tìm đúng route, đúng core và UI; khai báo thứ tự phụ thuộc module trong page-loader; nếu cần HTML fragment mới thì cập nhật page-catalog, router/loader, navigation và tests cấu trúc. Không tải mọi feature khi Home mới mở. Không làm mất state/đồng hồ đang hoạt động khi điều hướng nếu thiết kế yêu cầu giữ.

**Sửa UI5.14.1 đang PR:** phản hồi sync theo snapshot outbox hiện tại, có pending/review thì không giữ success cũ; đổi nguồn/tài khoản bỏ phản hồi. Không tự RPC hoặc sửa queue/contract. [Release notes](../RELEASE_V5.14.1.md).

## 2. Data contracts & bảo toàn dữ liệu (không thay đổi tùy tiện)

**PR1a backend local:** [BACKEND_PR1A](BACKEND_PR1A.md) là hợp đồng RPC hiện thực: không direct client DML, definer role hẹp chịu FORCE RLS, CAS/receipts và per-user commit counter. SQL/tests không thay UI/localStorage/PWA. Backend workflow mới bổ sung cho CI hiện hữu; chưa cloud deploy hay Auth UI. Khi thiết kế và SQL khác chi tiết, dùng tài liệu này để phân biệt phần đã hiện thực và phần chờ PR1b–PR6.

| LocalStorage key | Ý nghĩa | Cảnh báo |
|---|---|---|
| `pickleup_weekly_goal_v46` | Số ngày/tuần và cấp độ **hiện tại** | Không tự nhận đây là mục tiêu đã lưu của mọi tuần quá khứ |
| `pickleup_week_plan_v47` | Thời lượng phiên dự kiến và chế độ nhẹ | Không phải dữ liệu attendance |
| `pickleup_week_checkins_v48` | Check-in theo ngày địa phương: `done` / `skipped`, phút thật | Không tự sinh từ điểm, lịch hoặc timer |
| `pickleup_academy_v2` | Kết quả gần nhất của từng giáo án Học viện | Có điểm không đồng nghĩa buổi tập đã hoàn thành |
| `pickleup_academy_history_v44` | Nhiều lượt kiểm tra cùng giáo án | Cần so sánh cùng bài/cấp độ/điều kiện |
| `pickleup_academy_last_lesson_v4` | Bài Học viện gần nhất | Dùng để resume và chọn bài, không phải trạng thái đã học |
| `pickleup_stage_checks_v23` | Bài kiểm tra cấp độ cơ bản (có sáu điểm /20) | Kiểm tra định dạng và ngày |
| `pickleup_plans_v24` | Giáo án cá nhân cơ bản | Chỉ phát sang đồng hồ Trên sân nếu hợp lệ |
| `pickleup_advanced_plans_v31` | Giáo án cá nhân nâng cao | Không coi như bài Học viện |
| `pickleup_selected_plan_v31` | ID + nguồn giáo án cá nhân được chọn | Phải đối chiếu thật sự có plan tương ứng |
| `pickleup_training_log_v26` | Nhật ký luyện tập cũ | Không gộp nhầm với check-in V4.8 |
| `pickleup_match_journal_v3` | Nhật ký thi đấu | Dữ liệu riêng, không phải buổi luyện kỹ thuật |

Đây là **các khóa trọng yếu**, không phải danh sách đầy đủ. Trước sửa, tìm các key thực tế đang dùng trong mã/backup và lưu ý cả tên trường JSON. Không đổi/xóa key hiện hữu nếu chưa có migration đủ kiểm thử; không biến dữ liệu vắng mặt thành thành tích ảo.

**Check-in V4.8 hiện tại:** schema `{schemaVersion:1, entries:{'YYYY-MM-DD':{status,minutes,lessonId,updatedAt}}}`; một entry/ngày; `done` có số phút nguyên **5–180**, `skipped` có `minutes:null`; `clear` là thao tác xóa entry, không phải trạng thái lưu; giới hạn **1095 ngày**; không cho check-in ngày tương lai. Khi tạo dữ liệu mới phải theo validator trong core thay vì đoán schema.

**Backup/restore:** `modules/assessments-and-backup.js` xuất/nhập JSON `schemaVersion:1` với trường tùy chọn các module đời sau, gồm `weeklyGoal`, `weeklyPlan`, `weeklyCheckins`. Giữ khả năng nhập backup cũ, validate toàn bộ phần liên quan trước khi ghi, tránh cập nhật một phần không thể rollback khi có lỗi; xác nhận rõ khi import ghi đè. Khi thêm schema/key: thiết kế migration forward/backward phù hợp, giới hạn kích thước/bản ghi, test thiếu field, JSON hỏng, ngày bất hợp lệ, duplicate, dữ liệu lạ và hành vi giữ bản cũ.

**Privacy:** guest giữ dữ liệu trên trình duyệt. Account chỉ gửi qua adapter/RPC sau consent và thao tác rõ ràng; đăng nhập không tự import/sync. Các nguồn chỉ opt-in staging theo PR6a/PR6b và consent riêng; importer còn tắt, chưa mở pilot. Không log dữ liệu cá nhân không cần thiết, không gửi ra analytics ngoài phạm vi được phép, không commit data/secrets. Logout không tự xóa cache offline hoặc file export.

## 3. Responsive / accessibility: bắt buộc

**Mobile first** và menu điều hướng vẫn truy cập được trên **PC, iPhone Safari, iPad Safari portrait/landscape, Android Chrome**. Trên môi trường tự động, test ít nhất **390, 820, 1180, 1440 px**; thêm 320 px cho giao diện hẹp khi phù hợp. Trong QA thật, kiểm tra touch, viewport height, address bar, safe-area/notch và bàn phím ảo.

- Không để mất menu do chuyển trang/cuộn; vị trí menu cố định phải không che nút chính, đồng hồ, form hoặc nội dung.
- Không có horizontal overflow ngoài vùng cuộn có chủ đích; biểu đồ và bảng dài phải responsive.
- Target thao tác dễ chạm, khoảng cách an toàn, focus visible, label đúng input, role/aria-live cần thiết, thứ tự Tab hợp lý.
- Khi tương tác có bất đồng bộ, có **loading, empty, error, success** và nút retry/hướng khắc phục phù hợp; không im lặng mất dữ liệu nếu localStorage bị khóa/đầy.
- Route deep link, Back/Forward, reload, chuyển từ tab khác và các trạng thái đồng hồ phải nhất quán; không reset timer không chủ ý.

Playwright viewport/engine mô phỏng **không** thay thế QA vật lý trên Safari/Android. Báo cáo chính xác những thiết bị chưa được thử.

## 4. Performance / PWA / offline

- Đo trước/sau khi claim cải thiện; dùng existing page metrics/benchmark, so sánh cùng viewport và điều kiện. Không công bố số ms hoặc % nhanh hơn nếu chưa đo.
- Bảo vệ lazy-loading: Home không tự nạp coach/court/academy/progress/backup; cache nội dung đã mở nếu điều kiện cho phép.
- Tránh dependency nặng, render toàn trang không cần, xử lý đồng bộ kéo dài main thread, tải ảnh/tài nguyên dư thừa.
- Cache và service worker theo release: `package.json`, `window.PICKLEUP_BUILD`, URL `?v=`, tên cache `sw.js`, kiểm thử version phải đồng bộ **khi phát hành ứng dụng**. Chỉ sửa tài liệu → **không bump** build/cache.
- Service Worker giữ **offline shell** và cache **trang/module đã ghé thăm theo nhu cầu**; không hứa toàn bộ trang đều offline trước khi được truy cập/cached. Kiểm thử install → active → revisit offline → cập nhật từ cache cũ → online trở lại. Không xóa localStorage hoặc gây vòng reload.
- Thay đổi logic timer phải thử pause/resume, background tab, reload, page route, hết thời lượng, đồng hồ thiết bị và tính nhất quán khi mở lại. Timer không tự tạo attendance.

## 5. App security & input validation

- Mọi nguồn ngoài: JSON backup, localStorage, query/hash, input form, nội dung người dùng… đều không tin cậy đến khi validate. Không dùng `eval`, `new Function` hoặc thực thi JSON.
- Render text người dùng bằng `textContent`/safe DOM; chỉ dùng `innerHTML` cho markup **tĩnh đáng tin cậy** hoặc sau escaping/sanitization phù hợp. Không biến dữ liệu người dùng thành script, CSS hoặc link không kiểm tra.
- Không commit mật khẩu, token, credential; không in secrets trong CI logs; không tạo công cụ phát tán file dữ liệu.
- Áp dụng giới hạn số bản ghi và độ dài trường; parse lỗi có thông báo/fallback an toàn thay vì mất lịch sử.
- Tránh thêm package chỉ vì một tác vụ nhỏ có thể thực hiện với JS hiện có. Bảo vệ CI dependency supply chain theo công cụ repo đang dùng.

## 6. Nhiệm vụ mới: thay đổi nhỏ, có kiểm thử và không phá hợp đồng

Trước sửa: đọc route, module core/UI, storage keys, tests và các tài liệu này. Sau sửa: thêm unit cho logic (ngày địa phương, year boundary, corrupt dữ liệu, tính tuần, lesson comparability), Playwright cho route/điều khiển/viewport, backup migration khi liên quan và PWA offline nếu ảnh hưởng. Không ẩn lỗi bằng thay expectation cho dễ qua. Với thay đổi hành vi, cập nhật `PRODUCT_SPEC.md` và acceptance criteria. Với thay đổi kiến trúc, cập nhật tài liệu này trong cùng PR.

Mọi tối ưu hoặc refactor đều cần kiểm tra regression ở tám trang hiện có và báo rõ đo lường/ảnh hưởng. Luôn ưu tiên an toàn và hồi phục thay vì thúc đẩy người dùng tập quá sức.

PR4c / V5.5.0 tích hợp nguồn tài khoản opt-in và UI sync/conflict cho mục tiêu/check-in ở Journey/Progress; flags vẫn tắt, chưa rollout. Backup V5 chỉ dữ liệu khách; cache V6 hai domain có export riêng chưa round-trip. [Hợp đồng PR4c](SYNC_UI_PR4C.md).

[PR5a2b](ACADEMY_ACCOUNT_PR5A2B.md) nối `activity-runtime`/`academy-source-core`/`activity-ui` với flag riêng; mọi reader Academy dùng facade đồng bộ, backup/importer vẫn đọc raw guest. Build/assets/cache5.6.0; không SQL/RLS/schema thay đổi. Home không nạp account modules; đủ80 bài trước source projection. Unknown content/conditions không comparable, Coach không auto-copy private points vào plans legacy; không tự RPC khi login/reload.

[PR5a2c](ASSESSMENT_MATCH_PR5A2C.md) thêm projection assessment/match trong activity facade, tách self UI khỏi raw backup, nối mọi reader và generic history/delete. Advanced/match UI phải khởi tạo idempotent khi fragment đến sau validator Settings. Latest/statistics chỉ ngày biết rõ/past, thứ tự microsecond/timezone; giữ mọi raw identity và không dùng capped legacy validators cho account. Source token guard writer/DOM/delayed Coach callback; không auto-copy private data vào plan guest. Build/assets/cache5.7.0, cùng RPC/IDB schema/RLS, không SQL changes.

[PR5b1b](PLAN_CLIENT_PR5B1B.md) thêm standalone plan core/controller, chưa page-loader/runtime/UI. Shared repository/pull/sender kiểm capability planLifecycle, policy/cursor/lease và consent riêng; claim chờ dependency ACK, typed row validation, whole-preview review/archive. Không đổi IDB schema/SQL/app cache5.7.0 hoặc18 khóa V5; tích hợp UI sau phải bump cache và chuyển đồng bộ mọi reader/writer.

[PR5b1c/V5.8.0](PLAN_UI_PR5B1C.md) thêm plan-runtime/plan-ui và flag plan riêng. Không direct SDK UI, không mirror account→V5. Basic/advanced Coach, Journey và Court cùng facade; pending selection không chạy timer plan cũ. Account timer RAM, source change clear DOM/draft/wake lock; account result không append log khách. Bài Học viện gần nhất/nhật ký training vẫn device-only. Cache/assets bump5.8, SQL/IDB schema/RLS không đổi.

[PR5a2d/V5.9.0](TRAINING_ACCOUNT_PR5A2D.md) nối training trong activity-runtime/source-core. Court nạp activity dependencies lazy; writer giữ token hai source và repository transaction fence trên consent/revision/epoch/live own-plan. Mọi reader training qua facade; capped legacy validator chỉ guest/backup. Source mismatch chặn ghi Court/auto-append guest log. Không đổi SQL/RLS/IDB schema1, không persist clock account.

[PR5b2a/V5.10.0](ACADEMY_SELECTION_PR5B2A.md): last Academy lesson đi qua plan-runtime, sparse CAS user_selections; router delegate data-lesson-id links trước routing, chờ commit/module và bỏ source cũ. Loader chờ plan runtime ready. Academy reset nguồn clear DOM/timer và dùng RAM checklist/focus khi activity hoặc selection account; không mirror V5, chưa IDB device_state. Guest các key cũ giữ nguyên.

[PR5b2b1/V5.11.0](ACADEMY_DEVICE_STATE_PR5B2B1.md) persist checklist và bước tập trung Học viện trong device_state account/browser, cùng schema1. Typed atomic patches kiểm cả hai consent revisions, namespace/late-response guards và thông báo quota/corrupt; không RPC/outbox/guest mirror. Timer vẫn RAM, state mới chưa nằm trong export hiện tại; full device state/backup/purge còn gate.

[PR5b2b2/V5.12.0](COURT_CHECKPOINT_PR5B2B2.md) thêm điểm dừng Court local theo account/browser/plan: explicit pause/save/preview/restore paused, không tự resume hoặc tạo RPC/attendance. Typed device_state + identity metadata trên schema1; CAS checkpoint và consent/own ACK plan/selection/epoch fence trong transaction. Hai tab cần đọc/review trước ghi đè, quota giữ frozen retry, late responses/dialog guards không cập nhật account khác. Guest giữ timer key cũ. Checkpoint chưa nằm trong export hiện tại; full backup/purge và pilot gates còn lại.


## Cập nhật PR5b2c1 / V5.13.0 — cứu hộ cache chỉ đọc

[PR5b2c1/V5.13.0](ACCOUNT_RESCUE_PR5B2C1.md) thêm cứu hộ toàn bộ cache account trên máy và kiểm tra tệp chỉ đọc; chưa restore/purge hoặc backup toàn cloud. Năm flags false, URL/key trống; [tiến độ/gates](V6_PROGRESS_REVIEW.md). Snapshot readonly một transaction trên records/outbox/conflicts/sync_cursor/import_receipts/device_state/metadata, đúng namespace đăng nhập. Giữ cả checkpoint Court/checklist/focus và metadata identity trước đây chưa được các exports cũ bao phủ. Không đọc guest/legacy_snapshots/Auth, không SQL/RPC hoặc tự replay. Credential/owner/size/JSON validation fail toàn bộ; SHA256 không là quyền restore. A→B/logout bỏ phản hồi và link cũ. Tệp plaintext riêng tư cần lưu ngoài browser. Chưa thay gate restore/purge/backup vận hành; policy target chưa là SLA.


## Deployment config và test host — PR #36

Browser regression chạy `scripts/serve_test.py --guest-auth`, fixture guest qua HTTP cho cả SW, không đổi source hoặc tái sử dụng server operator. Server mặc định giữ config source để thử thủ công. Mock SDK/transport và real Auth local có config riêng, không dùng project Managed. Readiness dựa trạng thái loaded và nút thao tác sẵn sàng, không dựa success message tạm thời. [Hợp đồng staging](CLOUDFLARE_STAGING_PR36.md).

**Backup guest sau audit #41:** validate toàn bộ V1, phần vắng mặt giữ nguyên/null xóa rõ ràng, journal trước ghi và recovery trước feature reads; quota/conflict chưa an toàn thì giữ dữ liệu và dừng. Raw rescue18 key không phụ thuộc quét khóa lạ. Không backup/restore cloud hoặc Auth; xem [hợp đồng và giới hạn](GUEST_BACKUP_SAFETY.md).

## PR5b2c2b / V5.17.0 — UI dọn cache staging

Host gate được lazy-load trước Auth adapter; SDK chỉ tạo sau worker status. Không worker vẫn dùng Auth bình thường nhưng UI purge cần worker hiện hành kiểm soát. Worker cũ/không phản hồi/storage hỏng fail closed với Auth, guest còn dùng được; cập nhật/reload/đóng tab, không xóa dữ liệu. Entry maintenance full reload đóng nguồn/timer cũ; cần tự lưu RAM trước khi vào. [Hợp đồng và giới hạn](CACHE_PURGE_UI_PR5B2C2B.md).

## PR5b2d1 / V5.18.0 — đối chiếu trước khôi phục

restore-preview-core lazy riêng Settings, sau account-rescue-core và trước controller. So sánh thuần trên snapshot đã kiểm container/owner/bounds, thứ tự key object không ảnh hưởng nhưng arrays/strings giữ nguyên. Controller chỉ getAccountRescueSnapshot readonly sau nút compare, bỏ selectedFile/comparison khi đổi account/file, lỗi hoặc invalidate. File không được tải lại như ảnh chụp mới của máy. Không RPC/writer/legacy read mới. [Phạm vi, evidence và giới hạn](RESTORE_PREVIEW_PR5B2D1.md).
