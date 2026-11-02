# PR5a2b / V5.6.0 — Học viện dùng kho tài khoản

Nền main `afc50d4639bdc14b06931610cfca076c68a65274` sau #24; không PR mở trùng khi bắt đầu. Main [regression](https://github.com/ndlong78/Pickleball/actions/runs/41385466372):224 unit +344 browser và5 lượt WebKit bổ sung pass,0 fail/flaky/retry; [backend](https://github.com/ndlong78/Pickleball/actions/runs/41385466344):241 pgTAP +37 REST và Auth thật hai engines pass. [Pages](https://github.com/ndlong78/Pickleball/actions/runs/41385465934) success cùng merge SHA. Đây là evidence baseline, không phải CI HEAD của PR mới.

## Phạm vi và cấu hình

V5.6.0 nối [lifecycle PR5a2a](ACTIVITY_LIFECYCLE_PR5A2A.md) vào UI, đồng bộ package/build/assets/cache. Thêm public `modules/data/activity-config.js` enabled=false, riêng Auth/import/mutable sync. **Cả bốn flags vẫn tắt, Auth URL/key rỗng**. Không cloud provisioning, production/public signup, SQL/RLS/grants/schema migration hoặc tự merge.

Chỉ bật thử trong local/staging được cấp quyền: migrations đã merge, Auth URL HTTPS + publishable key và Auth flag theo [PR1b](AUTH_PR1B.md), activity flag riêng. Không cần bật importer hoặc mutable sync để dùng Academy account. Không service_role/secret/DB password trong client; flag không thay RLS hoặc server signup policy. Môi trường CI dùng loopback fixture, chưa SMTP/Managed staging.

## Lựa chọn nguồn và hành vi

Trong Dữ liệu, người dùng đăng nhập, đọc phạm vi kho hoạt động rồi tick xác nhận và bấm “Dùng kho hoạt động tài khoản”. Consent PR5a2a gồm bốn nhóm: lượt Học viện, đánh giá, nhật ký tập và trận đấu; **bản này chỉ đổi source UI Học viện**. Ba domain sự kiện còn lại tiếp tục đọc/ghi thiết bị; pending đã có trong kho tài khoản chỉ gửi khi bấm “Đồng bộ hoạt động”. Opt-in này không đổi mục tiêu/check-in hoặc tự nhập dữ liệu khách.

Bật nguồn chỉ prepare/pull, không gửi queue. Reload/login lại cùng user chỉ khôi phục consent/cache, không tự RPC. “Dùng lại Học viện trên thiết bị” ngắt source và request hiện tại, giữ cache/queue riêng; request đã commit vẫn phải replay/reconcile. Read và sync là hai thao tác riêng; retry giữ nguyên frozen body/UUID. Auth logout/A→B xóa projection, form và review trước khi tải namespace mới; không chuyển queue hoặc dùng token B cho request A. B cần consent riêng. SDK/RPC chỉ qua Auth adapter/lifecycle, UI không gọi Supabase trực tiếp.

Học viện lưu điểm tạo **một event mới** với entity UUID/client_event_id/operation UUID riêng; record+outbox commit trước khi báo “trên thiết bị · chờ đồng bộ”. Điều kiện có đủ nguồn bóng/nhịp/mục tiêu hoặc cả ba để chưa rõ; không tự mặc định tương đương. Snapshot gồm title/assessment và content version `academy-80-v1`; khi đổi nội dung giáo án phải đổi version này, giữ snapshot cũ. Không tự sửa lượt đã lưu, không tạo attendance từ điểm/timer/checklist.

Lịch sử account phân trang20 lượt, giữ mọi identity, không cắt theo giới hạn500 legacy. Unknown date/future/content mismatch vẫn giữ raw cache/export và hiển thị lượt gốc, không dùng làm ngày tập hoặc latest của bài hiện hành. Latest dùng occurred_at chính xác tới microsecond, quy đổi timezone khi so sánh, UUID phân xử các instant bằng nhau; không lấy server commit time làm ngày tập. Xóa một lượt có xác nhận, lưu delete pending/CAS và tombstone; không có restore sự kiện.

Khi nguồn loading/error, input lưu và tiến độ tài khoản bị chặn/ghi chưa đọc được, không fallback ghi V5. Quota giữ draft, không báo lưu thành công. Nếu local save đã commit rồi mới phát hiện cache lỗi, intent vẫn trong queue/export theo PR5a2a; thông báo không thay bằng chứng transaction. Form và async status gắn token nguồn từ trước await; đổi account không nhận status/data cũ.

## Một nguồn cho mọi reader Academy

`academy-source-core.js` tạo projection đồng bộ; `activity-runtime.js` làm facade cho Academy/Journey/Progress/Coach, giữ core thuật toán không có network/Promise. Loader nạp đủ80 bài trước facade, giữ Home lazy và dedup shared dependencies. BroadcastChannel chỉ type+owner; các page đã mount đọc lại cache khi activity-data/focus, không auto RPC.

- `academy-page`: latest/progress/recommend/history, append và delete theo source.
- `academy-insights`, dashboard, weekly goals/planner, plan–actual, Journey: đọc cùng latest/history account, không parse history qua validator500 của V5.
- Dashboard account không lấy điểm sáu tuần khách làm fallback Academy. Log/assessment/plan chưa chuyển vẫn là thiết bị và được ghi rõ trên UI.
- Coach không tự nạp điểm Academy account vào giáo án khách chưa có namespace; clear draft khi đổi source/account. Người dùng có thể nhập sáu điểm thủ công hoặc chọn lại kho thiết bị. Tự nạp sang giáo án account chờ PR5b.
- Backup/restore V5, raw rescue và importer chủ động vẫn đọc kho khách thực, không đọc facade hoặc mirror account vào18 khóa. Bài đã chọn/checklist/focus/timer tiếp tục device-only; lựa chọn bài rõ ràng có thể cập nhật key local, mount Academy account không tự ghi key lựa chọn mới.

Trend account chỉ cùng lesson/skill/level/content/snapshot và conditions được ghi rõ. Unknown conditions, legacy-unknown hoặc snapshot thiếu assessment không chứng minh comparable. Insights hiển thị tổng lượt riêng với nhóm so sánh; chart/mean/delta chỉ nhóm đó, hoặc một điểm khi chưa đủ. Weekly decline dùng cùng nhóm; target hiện tại chỉ dùng với snapshot khớp nội dung hiện tại. Không chuyển điểm thành DUPR/cấp độ/attendance. Luồng guest vẫn giữ thuật toán và giới hạn V5.

**Giới hạn latest cũ:** `legacy_score_snapshots` không thuộc event policy. Điểm import chỉ có latest snapshot chưa hiển thị trong view account này; không dựng attempt để bù. Lượt history đã import vẫn đọc được với provenance/conditions unknown. Cache và server không bị xóa/cắt vì giới hạn UI.

## Review, export, PWA và kiểm chứng

Panel hoạt động hiển thị pending/sending, đọc/gửi/thử lại/export riêng. Mỗi tác vụ thay thông báo cũ bằng trạng thái đang xử lý ngay khi bắt đầu; không để success lần trước trông như kết quả request mới. Academy giữ phản hồi lưu/xóa khi focus/tab chỉ đọc lại đúng revision cache, rồi tính lại khi dữ liệu/source/bài đổi. Review trình bày original/local/remote; sending phải replay trước, reset cần checkbox, retry-delete cần xác nhận xóa. Chỉ có lựa chọn hợp lệ từ PR5a2a: giữ server, gửi lại đúng identity khi missing hoặc delete CAS; không force/update/restore/new identity âm thầm. Preview stale bị từ chối; archive giữ nguyên yêu cầu cũ. Download được guard theo account/source để export A không tải ra sau khi chuyển B.

“Xuất cache hoạt động” vẫn `activity-events-cache-v1`, bốn domain/base/overlay/outbox/frozen/conflicts/cursor/consent, private và **chưa nhập lại được/backup toàn account**. Không gồm Auth/session, V5, plans/selections hoặc device state. Raw rescue/backup V5 không chứa account data; full V6 round-trip/purge là gate PR5b2. Tránh máy chung vì logout giữ cache không mã hóa, không remote wipe offline.

Router giữ8 route, `?page=...#section` dưới `/Pickleball/`; control nằm trong section sẵn có. PWA đổi cache `pickleup-shell-v5-6-0-stable`, URL assets5.6.0 và kiểm cleanup cache5.5 cùng các đời cũ, giữ local data. Auth/REST/query callback nhạy cảm vẫn bị loại khỏi cache. Offline account chỉ tiếp tục sau khi trang/module đã cache; không hứa mọi trang offline ngay lần đầu.

Unit: source projection/identity/>500, unknown/future/microseconds, comparability/content/conditions, flag-off/no legacy fallback, A→B trước await. Native-IDB/mock-Auth/RPC UI: phản hồi sync bị giữ chậm không giữ success cũ, refreshLocal không xóa feedback cùng revision; viewport390/820/1180/1440, opt-in/save/cross-route, offline/reload/exact replay, delete conflict/review, stale A response, quota draft,501 history, conditions và epoch review. Đây không là RLS/Auth evidence.

Backend CI giữ Supabase local/GoTrue/Mailpit, pgTAP/REST và mọi luồng cũ. Real browser hai engines bổ sung thao tác UI: chọn nguồn, lưu14/17 cùng điều kiện → trend+3 ở Progress → commit-loss thật/reload/replay → delete → writer RPC thật xóa trước gây HTTP200 conflict → review giữ server/archive. Legacy keys và số check-in giữ nguyên, PWA exclusion tiếp tục kiểm. SMTP recipients không tăng; không log OTP/token/payload hoặc Auth artifacts. Gateway publishable alias local vẫn fixture.

Cài bundled Chromium/WebKit local bị CDN403. Chromium hệ thống154 đã chạy12 ca UI mới, cùng ca xóa mở rộng (sync xóa một trong hai lượt rồi review conflict) với retries=0; đây là native-IDB/mock-Auth/RPC, không là Auth integration thật. Unit Node24 và CI bundled browser/backend lấy counts/fail/flaky/URLs đúng HEAD ở PR. Chưa staging SMTP/Managed gateway, expiry browser theo wall clock, physical devices/installed PWA, restore/Auth recovery/deletion/backup drill, full V6 backup/purge hoặc load/near-cap/eviction. Pilot dữ liệu thật vẫn đóng theo [policy](PILOT_OPERATING_POLICY.md). Tiếp theo PR5a2c assessments/matches; plans/selections PR5b1 phải có trước training account mới.
