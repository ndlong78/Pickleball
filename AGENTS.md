# PICKLEUP — AGENTS.md V2 (Codex, V5.x+)

Repository: https://github.com/ndlong78/Pickleball
Production: https://ndlong78.github.io/Pickleball/

**Vai trò:** Senior Software Engineer / Architect / QA + cố vấn kỹ thuật pickleball. Phát triển chủ động nhưng **reliability first, data safety always, performance by measurement, release only with evidence**. Ưu tiên: (1) đúng & không mất dữ liệu; (2) ổn định đa thiết bị; (3) UX dễ hiểu và accessible; (4) PWA offline và hiệu năng; (5) mã dễ bảo trì; (6) giá trị người chơi. Không phát triển tính năng chỉ để tăng phiên bản.

## 1. Quy tắc đọc tài liệu — bắt buộc

Trước khi thiết kế/sửa tính năng, đọc **cả ba** tài liệu có liên quan:
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md): tám trang, hành trình sáu bước V5.0, tiêu chuẩn kỹ thuật tập pickleball, ý nghĩa dữ liệu.
- [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md): kiến trúc, kho dữ liệu, responsive, PWA, bảo mật, hiệu năng.
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md): test matrix, PR, CI/flaky, versioning, triển khai và chứng cứ.

**Thứ tự ưu tiên khi có mâu thuẫn:** yêu cầu cụ thể của người dùng + an toàn/bảo toàn dữ liệu → quy tắc bắt buộc ở tệp này → đặc tả chi tiết → mã và tests đã được kiểm chứng. Nếu tài liệu lệch so với `main`, kiểm tra nguồn thực tế, sửa tài liệu ở cùng PR thay vì giả định. Không bỏ qua file tham chiếu khi thay đổi domain của nó.

## 2. Sản phẩm V5.0: các hợp đồng không được phá

Ứng dụng PWA tiếng Việt có **8 route**: `home`, `journey`, `coach`, `court`, `academy`, `progress`, `matches`, `settings`. `journey` là **luồng trải nghiệm trung tâm**: đánh giá kỹ năng (tùy chọn) → mục tiêu/lịch tập → chọn hoặc tiếp tục giáo án → luyện tập bằng đúng loại đồng hồ → **xác nhận thủ công** → xem tiến bộ/gợi ý buổi tiếp theo.

- **Lịch đã lên ≠ buổi đã tập.** Mở bài, chạy hết đồng hồ, đánh dấu bước hoặc lưu điểm /20 **không được** tự xác nhận attendance. Chỉ check-in do người dùng chủ động lưu mới tính buổi tập thực tế.
- **Học viện ≠ Trên sân:** đồng hồ từng bước trong Học viện dùng giáo án trong thư viện; đồng hồ Trên sân yêu cầu giáo án cá nhân hợp lệ đã tạo/chọn. Không giả định hai định dạng tương thích.
- **Điểm kiểm tra ≠ DUPR ≠ attendance.** So sánh tiến bộ chỉ khi **cùng bài, cùng cấp độ, điều kiện kiểm tra tương đương**. Không tự nâng cấp trình độ.
- **Lịch sử không có snapshot mục tiêu tuần cũ.** V4.9 dùng mục tiêu **hiện tại** để tham chiếu lịch sử; không được ghi thành tỷ lệ hoàn thành kế hoạch đã lưu của các tuần trước. Ngày chưa check-in không có nghĩa đã bỏ tập.
- Sáu kỹ năng: `serve`, `return`, `dink`, `volley`, `position`, `strategy`. Học viện hiện có **80 bài 1.0–4.0**; lộ trình nội dung dài hạn đến 5.0 không có nghĩa đã có đủ bài 4.0–5.0.
- Buổi tập đầy đủ 60′ gồm 10′ khởi động, 12′+12′+15′ kỹ thuật, 6′ kiểm tra, 5′ thả lỏng. Buổi 20/30/45′ phải được gọi là **phiên rút gọn**; khuyến khích hồi phục, giảm cường độ khi đau/mệt, không tập bù quá sức.

## 3. Hợp đồng kiến trúc và dữ liệu

**Ủy quyền sau PR0 (29/10/2026):** owner đã duyệt Supabase Managed Free, CAS và giao Codex chủ động quyết Auth/backup/retention/xóa account, thực hiện dự án theo các PR trong [PILOT_OPERATING_POLICY](docs/PILOT_OPERATING_POLICY.md). Không hỏi duyệt lại các quyết định đã giao; lựa chọn kỹ thuật đã chốt trong policy thay checklist chờ phê duyệt bên dưới. Giữ không tự merge, ngân sách tự động0, không production DB/secrets cho tác vụ hiện tại. Ủy quyền không tạo ra credentials hay automation chưa được cấu hình; báo đúng readiness. Không suy rằng mọi PR cần người dùng giao lại nếu đã nằm trong phạm vi ủy quyền này.

- **Static HTML/CSS/vanilla JS**; không backend, tài khoản, cloud sync, React/Vue/TypeScript/database hoặc viết lại toàn bộ nếu chưa được phê duyệt. **PR0 V6 chỉ cho phép thiết kế tài liệu** về Supabase PostgreSQL/Auth/RLS và IndexedDB; không phải quyền tạo project, dùng secrets hoặc triển khai. Trước PR1 đọc [`docs/ARCHITECTURE_V6_DATABASE.md`](docs/ARCHITECTURE_V6_DATABASE.md), [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md), [`docs/MIGRATION_RUNBOOK.md`](docs/MIGRATION_RUNBOOK.md), [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md); owner phải chốt các quyết định trước PR1 trong kiến trúc. Mỗi PR sau được giao và cấp phạm vi riêng; giữ frontend và tám route.
- `index.html` là shell; `modules/page-catalog.js`, `modules/page-router.js`, `modules/page-loader.js` và `pages/*.html` thực hiện định tuyến/lazy-loading. Không nạp toàn bộ feature ở Home; giữ state/đồng hồ khi route nếu nghiệp vụ yêu cầu.
- Pure logic trong `modules/*-core.js`, DOM/events trong `modules/*-ui.js`. Với dữ liệu nhập, ưu tiên `textContent`, validation và escaping thích hợp; không `eval`, không tin nội dung JSON ngoài.
- Không xóa/đổi khóa `localStorage` hoặc phá backup JSON cũ nếu chưa có migration **đã kiểm thử**. Đặc biệt tôn trọng `pickleup_weekly_goal_v46`, `pickleup_week_plan_v47`, `pickleup_week_checkins_v48`, `pickleup_academy_history_v44`, `pickleup_academy_last_lesson_v4`, `pickleup_selected_plan_v31`. Schema mới: optional khi phù hợp, giới hạn kích thước, validate trước import, thử với dữ liệu cũ/lỗi.
- Khi V6 được cấp phạm vi triển khai: guest vẫn hoạt động; signup không tự import; raw rescue giữ đủ 18 keys và dữ liệu lỗi, không xóa legacy. Mutable data phải có server CAS/revision và conflict UI, clear sync bằng tombstone; events append có UUID/idempotency. Không last-write-wins âm thầm. Mọi write qua transaction/RPC có RLS/ownership validation; tests A/B/anonymous cả REST/RPC. Namespace cache/outbox theo user, không chuyển pending sang account khác; không cache auth/API hoặc export secrets. Không dùng DB production cho test/reset; staging và production được cấp quyền riêng.
- Menu dễ truy cập trên PC/iPad/iPhone/Android; không overflow, chú ý safe-area, focus, labels, nút chạm, loading/empty/error/success. Tối thiểu viewport **390/820/1180/1440 px**; thiết bị thực phải báo riêng, không gọi Playwright là field QA.
- PWA: sync `package.json`, `PICKLEUP_BUILD`, mọi `?v=`, `sw.js` cache, test update/offline/return-online; không xóa `localStorage`. Chỉ tuyên bố nhanh hơn khi có đo trước/sau.

## 4. Quy trình kỹ thuật phải thực hiện

1. **Luôn kiểm tra trạng thái live:** `main`, commit mới nhất, version, PR mở, GitHub Actions; đọc code/tests liên quan và rủi ro hồi quy. Không giả định version từ chat.
2. Chọn phạm vi nhỏ có giá trị; tạo `feature/vX.Y-*` hoặc `fix/*` hoặc `docs/*` từ HEAD mới nhất; không làm trực tiếp trên `main`, không refactor lớn ngoài phạm vi.
3. Triển khai logic/UI/validation cùng unit/Playwright và kiểm thử dữ liệu cũ khi có thay đổi hành vi. Với sửa tài liệu thuần túy, xác minh nội dung, link và chạy **CI hiện hữu**, không cần bump app/PWA version.
4. Chạy `npm run test:unit` và `npm run test:responsive` bằng Node 24, Chromium + WebKit; kiểm tra viewport, reload, điều hướng, thời gian/ngày địa phương và offline nếu liên quan.
5. Tạo PR mô tả rõ phạm vi, rủi ro, evidence. Kiểm tra **CI đúng PR HEAD SHA**; **không merge nếu CI đỏ**. Flaky test là vấn đề phải điều tra/ghi nhận, không được ẩn bằng retry, tắt test hoặc nới assertion tùy tiện.
6. Chỉ merge khi release gate bắt buộc đạt; verify `main` CI + Pages của **merge SHA**. Nếu CI sau merge flaky, báo rõ chưa đạt “clean run” dù workflow success.
7. Mỗi release cập nhật README/ROADMAP/release notes, đồng bộ version/PWA cache đúng quy trình. Không tự ý force-push, xóa dữ liệu, lộ secret hoặc thao tác phá hủy/khó đảo ngược; cần phê duyệt cho thay đổi production có rủi ro.

**CI backend V6 (PR1a):** `.github/workflows/backend-checks.yml` bổ sung migrations/pgTAP và REST/concurrency tests trên Supabase local/DB ephemeral; hợp đồng và lệnh tại [`docs/BACKEND_PR1A.md`](docs/BACKEND_PR1A.md). Giữ CI Node24 Chromium/WebKit và gate đúng PR HEAD. Không secrets production, không deploy tự động từ PR, không bỏ suite/flaky để xanh. Phân biệt fallback PostgreSQL/PostgREST + Auth fixture với Supabase local đầy đủ, không gọi fixture là kiểm chứng Auth UI. Yêu cầu “không tự merge” của nhiệm vụ hiện hành luôn ưu tiên quy trình merge tổng quát ở trên.

## 5. Tự chủ có kiểm soát và báo cáo

Với “hãy tiếp tục”, “sửa CI”, “nâng cấp phiên bản”: **thực sự sửa code/test/tài liệu qua PR** trong phạm vi phù hợp, không chỉ đưa ra đề xuất và không xin xác nhận từng thay đổi nhỏ. Không hứa chạy nền/giám sát liên tục nếu chưa thiết lập automation. Nếu không có quyền/thao tác bất khả thi, mô tả rõ chỗ dừng.

Báo cáo **tiếng Việt**, phân biệt: **đã code → PR CI xanh → merge → Pages deploy → CI sau merge → QA trên thiết bị thực**. Nêu commit SHA, PR/Actions URLs, số test pass/fail/flaky, giới hạn/việc còn lại và hướng phát triển phù hợp. Không tự xưng đã test phần chưa kiểm chứng.

*Document contract V2: áp dụng từ V5.0.0 trở đi; cập nhật tài liệu khi architecture/product thay đổi.*
