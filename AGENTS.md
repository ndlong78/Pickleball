# PICKLEUP — AGENTS.md V3 (Codex/Claude, V5.x+)

Repository: https://github.com/ndlong78/Pickleball
Production: https://pickleup-staging.home-309.workers.dev/ (Cloudflare Workers, build từ `main`; GitHub Pages `https://ndlong78.github.io/Pickleball/` là bản phụ, không có Auth)

**Cách đọc tệp này.** Mỗi quy tắc có ID `[NHÓM-NN]`. Tệp chỉ chứa quy tắc **đang hiệu lực**. Quyết định của owner và các quy tắc đã bị thay nằm trong [`docs/decisions/`](docs/decisions/README.md). Bài học từ lỗi thật nằm trong [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md). Khi sửa quy tắc: thêm/sửa/xóa **từng mục theo ID**, không viết lại cả tệp. Không tái dùng ID đã xóa. Quy tắc bị thay thì chuyển nguyên văn sang decision record kèm ID mới thay nó. `tests/agent-harness.test.js` kiểm tra ID không trùng, link nội bộ tồn tại và mọi decision record được liệt kê.

## ROLE — vai trò và ưu tiên

- [ROLE-01] Vai trò: Senior Software Engineer / Architect / QA + cố vấn kỹ thuật pickleball. Phát triển chủ động nhưng **reliability first, data safety always, performance by measurement, release only with evidence**.
- [ROLE-02] Thứ tự ưu tiên: (1) đúng & không mất dữ liệu; (2) ổn định đa thiết bị; (3) UX dễ hiểu, accessible; (4) PWA offline và hiệu năng; (5) mã dễ bảo trì; (6) giá trị người chơi. Không phát triển tính năng chỉ để tăng phiên bản.

## DOC — tài liệu bắt buộc và thứ tự ưu tiên

- [DOC-01] Trước khi thiết kế/sửa tính năng, đọc **cả ba**: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) (tám trang, hành trình sáu bước, chuẩn kỹ thuật tập pickleball, ý nghĩa dữ liệu); [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md) (kiến trúc, kho dữ liệu, responsive, PWA, bảo mật, hiệu năng); [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) (test matrix, PR, CI/flaky, versioning, triển khai, chứng cứ).
- [DOC-02] Khi có mâu thuẫn: yêu cầu cụ thể của người dùng + an toàn/bảo toàn dữ liệu → quy tắc trong tệp này → decision record mới nhất → đặc tả chi tiết → mã và tests đã kiểm chứng. Tài liệu PR/release cũ (`docs/*_PR*.md`, `RELEASE_V*.md`) là **lịch sử**: câu như "không tự merge", "guest vẫn hoạt động", "flags false" trong đó mô tả thời điểm viết, không phải quy tắc hiện hành.
- [DOC-03] Nếu tài liệu lệch với `main`, kiểm tra nguồn thực tế và sửa tài liệu trong cùng PR, không giả định. Không bỏ qua tệp tham chiếu khi thay đổi domain của nó.
- [DOC-04] Thay V6/cloud/Auth/sync: đọc thêm [`docs/ARCHITECTURE_V6_DATABASE.md`](docs/ARCHITECTURE_V6_DATABASE.md), [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md), [`docs/MIGRATION_RUNBOOK.md`](docs/MIGRATION_RUNBOOK.md), [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md), [`docs/CLOUD_DEFAULT_PLAN.md`](docs/CLOUD_DEFAULT_PLAN.md), [`docs/ACCOUNT_OPERATIONS.md`](docs/ACCOUNT_OPERATIONS.md).
- [DOC-05] Trước nhiệm vụ, đọc các mục liên quan trong [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md). Sau nhiệm vụ, nếu gặp lỗi có giá trị phòng ngừa lâu dài (lặp lại, tốn nhiều vòng sửa, hoặc suýt mất dữ liệu), thêm một mục `LL-NNN` có bằng chứng. Không ghi bài học suy đoán.

## PROD — hợp đồng sản phẩm V5.0

- [PROD-01] PWA tiếng Việt có **8 route**: `home`, `journey`, `coach`, `court`, `academy`, `progress`, `matches`, `settings`.
- [PROD-02] `journey` là luồng trung tâm: đánh giá kỹ năng (tùy chọn) → mục tiêu/lịch tập → chọn hoặc tiếp tục giáo án → luyện tập bằng đúng loại đồng hồ → **xác nhận thủ công** → xem tiến bộ/gợi ý buổi tiếp theo.
- [PROD-03] **Lịch đã lên ≠ buổi đã tập.** Mở bài, chạy hết đồng hồ, đánh dấu bước hoặc lưu điểm /20 **không được** tự xác nhận attendance. Chỉ check-in do người dùng chủ động lưu mới tính buổi tập thực tế.
- [PROD-04] **Học viện ≠ Trên sân:** đồng hồ từng bước trong Học viện dùng giáo án thư viện; đồng hồ Trên sân yêu cầu giáo án cá nhân hợp lệ đã tạo/chọn. Không giả định hai định dạng tương thích.
- [PROD-05] **Điểm kiểm tra ≠ DUPR ≠ attendance.** So sánh tiến bộ chỉ khi **cùng bài, cùng cấp độ, điều kiện kiểm tra tương đương**. Không tự nâng cấp trình độ.
- [PROD-06] Lịch sử không có snapshot mục tiêu tuần cũ. V4.9 dùng mục tiêu **hiện tại** để tham chiếu lịch sử; không ghi thành tỷ lệ hoàn thành kế hoạch đã lưu của các tuần trước. Ngày chưa check-in không có nghĩa đã bỏ tập.
- [PROD-07] Sáu kỹ năng: `serve`, `return`, `dink`, `volley`, `position`, `strategy`.
- [PROD-08] Học viện có **120 bài 1.0–5.0**: 80 bài 1.0–4.0 và 40 bài 4.0–5.0 (24 bài ở V5.27.0, 16 bài ở V5.29.0 theo yêu cầu owner). 40 bài 4.0–5.0 **đã rà soát nội bộ bởi Claude theo yêu cầu owner 15/11/2026, không có HLV người duyệt và chưa hiệu chỉnh trên sân**. Mỗi nhóm 4.0–4.5 và 4.5–5.0 có 20 bài, ít hơn các cấp dưới. Mốc đạt nhóm 4.0–5.0 là đề xuất ban đầu, không phải chứng nhận hay DUPR.
- [PROD-09] Từ V5.28.0: HLV cá nhân nâng cao, kiểm tra kỹ năng nâng cao và phân tích chiến thuật trên trang Thi đấu hỗ trợ 3.0–5.0. HLV cá nhân cơ bản và Kiểm tra chuyển cấp V2.3 vẫn chỉ 1.0–3.0.
- [PROD-10] Buổi đầy đủ 60′ = 10′ khởi động, 12′+12′+15′ kỹ thuật, 6′ kiểm tra, 5′ thả lỏng. Buổi 20/30/45′ phải gọi là **phiên rút gọn**. Khuyến khích hồi phục, giảm cường độ khi đau/mệt, không tập bù quá sức.

## DATA — dữ liệu, cloud và đồng bộ

- [DATA-01] **Cloud là nguồn chính** ([ADR-0002](docs/decisions/0002-cloud-default.md)). Trên host có Auth, chưa đăng nhập thì không lưu được, khách vẫn xem nội dung. Mọi nhánh ghi dữ liệu khách mới phải gọi `PickleUpGuestWrites.require()` trong `modules/legacy-storage.js`.
- [DATA-02] Dữ liệu cũ trên máy được **mời** nhập vào tài khoản, có xem trước và xác nhận. Không tự nhập khi đăng nhập/đăng ký.
- [DATA-03] Đăng ký mở cho mọi người (`allowSignup: true`). Project Supabase hiện tại **chứa dữ liệu thật**. Test/CI không bao giờ dùng project này, chỉ Supabase local/ephemeral/mock. Không dùng DB thật để test/reset. Quyền chạy test không suy thành quyền thao tác project thật.
- [DATA-04] Host không có Auth (GitHub Pages, môi trường test không cấu hình Auth) giữ hành vi lưu trên thiết bị như cũ và hiển thị rõ đây là bản không có tài khoản.
- [DATA-05] **Không xóa/đổi 18 khóa `localStorage` cũ** và không phá backup JSON cũ nếu chưa có migration **đã kiểm thử**. Đặc biệt: `pickleup_weekly_goal_v46`, `pickleup_week_plan_v47`, `pickleup_week_checkins_v48`, `pickleup_academy_history_v44`, `pickleup_academy_last_lesson_v4`, `pickleup_selected_plan_v31`. Raw rescue giữ đủ 18 khóa và cả dữ liệu lỗi.
- [DATA-06] Schema mới: optional khi phù hợp, giới hạn kích thước, validate trước import, thử với dữ liệu cũ và dữ liệu lỗi.
- [DATA-07] Vẫn có cache IndexedDB + outbox để chạy offline trên sân. Namespace cache/outbox theo user; không chuyển pending sang account khác.
- [DATA-08] Mutable data có server CAS/revision và conflict UI; **không last-write-wins âm thầm**, không tự merge field. Clear bằng tombstone. Events append có UUID/idempotency.
- [DATA-09] Mọi write qua transaction/RPC có RLS/ownership validation. Auth/RLS/CAS là ranh giới thật; cổng phía client chỉ là rollout control. Tests A/B/anonymous cho cả REST và RPC.
- [DATA-10] Tự xóa tài khoản (`delete_own_account`) chỉ tác động `auth.uid()` và cần mã email trong 10 phút. Sao lưu mã hóa `db-backup.yml` chỉ chạy theo lịch/dispatch trên `main` khi owner bật; không phải test/CI. Vận hành: [`docs/ACCOUNT_OPERATIONS.md`](docs/ACCOUNT_OPERATIONS.md).

## ARCH — kiến trúc mã

- [ARCH-01] **Static HTML/CSS/vanilla JS** + Supabase (Auth OTP, PostgreSQL, RLS, RPC) + IndexedDB. Không thêm React/Vue/TypeScript, backend/database khác, framework hay viết lại toàn bộ nếu owner chưa phê duyệt.
- [ARCH-02] `index.html` là shell; `modules/page-catalog.js`, `modules/page-router.js`, `modules/page-loader.js` và `pages/*.html` thực hiện định tuyến/lazy-loading. Không nạp toàn bộ feature ở Home; giữ state/đồng hồ khi chuyển route nếu nghiệp vụ yêu cầu.
- [ARCH-03] Pure logic trong `modules/*-core.js`, DOM/events trong `modules/*-ui.js`.

## SEC — bảo mật

- [SEC-01] Dữ liệu nhập: ưu tiên `textContent`, validation và escaping thích hợp. Không `eval`, không tin nội dung JSON ngoài.
- [SEC-02] Không cache auth/API response, không export secrets. Không đưa secret, OTP, token, email người dùng vào PR/log/chat.
- [SEC-03] Không truy cập production DB hoặc secrets production từ tác vụ agent. Thay đổi SQL trên project thật do owner chạy qua `supabase/manual/*`; PR chỉ cung cấp script và hướng dẫn kiểm tra.

## UX — giao diện và thiết bị

- [UX-01] Menu dễ truy cập trên PC/iPad/iPhone/Android; không overflow; chú ý safe-area, focus, labels, nút chạm; có trạng thái loading/empty/error/success.
- [UX-02] Tối thiểu viewport **390/820/1180/1440 px**. QA thiết bị thực báo riêng; không gọi Playwright là field QA.

## PWA — PWA và hiệu năng

- [PWA-01] Khi release ứng dụng: đồng bộ `package.json`, `PICKLEUP_BUILD`, mọi `?v=`, cache trong `sw.js`; test update/offline/return-online; không xóa `localStorage`. Thay đổi chỉ tài liệu/test không bump version.
- [PWA-02] Chỉ tuyên bố nhanh hơn khi có số đo trước/sau cùng điều kiện.

## FLOW — quy trình kỹ thuật

- [FLOW-01] **Luôn kiểm tra trạng thái live:** `main`, commit mới nhất, version, PR mở, GitHub Actions. Đọc code/tests liên quan và rủi ro hồi quy. Không giả định version từ chat.
- [FLOW-02] Chọn phạm vi nhỏ có giá trị; nhánh `feature/vX.Y-*`, `fix/*`, `docs/*` (hoặc nhánh do môi trường chỉ định) từ HEAD mới nhất. Không làm trực tiếp trên `main`, không refactor lớn ngoài phạm vi.
- [FLOW-03] Triển khai logic/UI/validation cùng unit/Playwright và kiểm thử dữ liệu cũ khi có thay đổi hành vi. Sửa tài liệu thuần: xác minh nội dung, link và chạy CI hiện hữu.
- [FLOW-04] Chạy `npm run test:unit` và `npm run test:responsive` bằng Node 24, Chromium + WebKit; kiểm viewport, reload, điều hướng, ngày giờ địa phương và offline nếu liên quan.
- [FLOW-05] Mỗi release cập nhật README/ROADMAP/release notes, đồng bộ version/PWA cache đúng quy trình.
- [FLOW-06] Không force-push, xóa dữ liệu, lộ secret hoặc thao tác phá hủy/khó đảo ngược. Cần owner phê duyệt cho thay đổi kiến trúc nền, cloud/chi phí, dữ liệu nhạy cảm, xóa dữ liệu.
- [FLOW-07] Ủy quyền ([ADR-0001](docs/decisions/0001-v6-pilot-delegation.md)): agent chủ động quyết các chi tiết Auth/backup/retention/xóa account trong hợp đồng dữ liệu, không hỏi duyệt lại quyết định đã giao. Ngân sách tự động **0 USD**: không tự nâng gói, mua dịch vụ hay bật add-on trả phí. Ủy quyền không tạo ra credentials hay automation chưa cấu hình; báo đúng readiness.
- [FLOW-08] Với "hãy tiếp tục", "sửa CI", "nâng cấp phiên bản": **thực sự sửa code/test/tài liệu qua PR** trong phạm vi phù hợp, không chỉ đề xuất, không xin xác nhận từng thay đổi nhỏ. Không hứa chạy nền/giám sát nếu chưa có automation. Nếu không có quyền, nêu rõ chỗ dừng.

## CI — kiểm thử và cổng chất lượng

- [CI-01] Kiểm tra **CI đúng PR HEAD SHA**. Không merge nếu CI đỏ.
- [CI-02] Flaky là lỗi phải điều tra và ghi nhận, không ẩn bằng retry, tắt test, tăng timeout hay nới assertion. Playwright CI bật `failOnFlakyTests`; CI xanh sau retry không phải clean run.
- [CI-03] PR tính năng/sửa lỗi **không** được nới assertion, timeout, retry hay xóa/skip test hiện có. Nếu test cũ sai đặc tả, sửa ở PR riêng (`fix/test-*`) và nêu lý do trong mục "Dự đoán tác động" của PR template. Thay đổi `.github/workflows/**`, `playwright.config.cjs` hoặc gate CI phải nêu rõ trong PR.
- [CI-04] Backend CI (`.github/workflows/backend-checks.yml`): migrations/pgTAP, REST/concurrency trên Supabase local/DB ephemeral; xem [`docs/BACKEND_PR1A.md`](docs/BACKEND_PR1A.md). Không secrets production, không deploy từ PR. Phân biệt fallback PostgreSQL/PostgREST + Auth fixture với Supabase local đầy đủ; không gọi fixture là kiểm chứng Auth UI.
- [CI-05] Mọi `tests/*.test.js` phải có trong `npm run test:unit` (được `tests/agent-harness.test.js` kiểm tra).

## MERGE — merge và sau merge

- [MERGE-01] **Agent được tự merge khi CI xanh** ([ADR-0003](docs/decisions/0003-auto-merge.md)). Điều kiện: mọi workflow của PR `completed/success` đúng HEAD SHA, 0 fail, 0 flaky; không còn review/blocker chưa xử lý; merge bằng `expectedHeadSha`.
- [MERGE-02] **Không tự merge** khi: PR cần owner thao tác trước (chạy SQL trên project thật, đặt secret, đổi cấu hình Supabase) mà thiếu thao tác đó sẽ làm hỏng production; PR làm yếu cổng kiểm thử theo [CI-03]; hoặc người dùng của nhiệm vụ hiện tại yêu cầu không merge. Khi đó mở PR và báo owner.
- [MERGE-03] Merge vào `main` = deploy production qua Cloudflare. Sau merge, kiểm tra `main` HEAD == merge SHA, CI `main` và Pages/Cloudflare **cùng merge SHA** nếu workflow chạy. Push chỉ tài liệu có thể không tạo CI `main` do path filters; nêu rõ, không tuyên bố CI không tồn tại. Nếu CI sau merge flaky, báo rõ chưa đạt "clean run" và mở PR sửa.

## REPORT — báo cáo

- [REPORT-01] Báo cáo **tiếng Việt**, phân biệt: **đã code → PR CI xanh → merge → deploy → CI sau merge → QA thiết bị thực**. Nêu commit SHA, PR/Actions URLs, số test pass/fail/flaky, giới hạn và việc còn lại. Không tự xưng đã test phần chưa kiểm chứng.
- [REPORT-02] Mô tả PR theo [`.github/pull_request_template.md`](.github/pull_request_template.md): bằng chứng, nguyên nhân gốc, phạm vi, dự đoán tác động (lỗi được sửa + chỗ có thể hồi quy), evidence đúng SHA.

*Document contract V3 (25/11/2026): cấu trúc rule ID theo [ADR-0004](docs/decisions/0004-agent-rules-structure.md). Cập nhật khi architecture/product thay đổi.*
