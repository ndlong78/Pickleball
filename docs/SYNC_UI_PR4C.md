# PR4c — nguồn tài khoản và UI đồng bộ mục tiêu/check-in

Nền main `1a6b298b9ff04f748056a39a1cdc575ddea2274a` sau PR20, không PR mở trùng khi bắt đầu. Backend/main responsive/Pages đã success cùng merge SHA; exact PR4c HEAD/counts ở PR. Chưa Supabase/SMTP staging được kết nối.

## Phạm vi và bật thử

V5.5.0 đồng bộ package/build/assets/cache vì repository/Auth adapter và UI mới đi vào runtime. Giữ tám route,18 khóa V5 và IndexedDB schema1; migration SQL/RLS/legacy RPC không đổi. Home không nạp Auth hoặc kho dữ liệu.

Auth/import/sync config vẫn false. Chỉ bật `modules/auth-config.js` (URL + publishable key) và `modules/data/sync-config.js` trong môi trường local/staging được cấp quyền; importer có flag riêng và không bắt buộc. Không secret/service role/DB password trong client. Chưa mở đăng ký công khai, chưa provision/production hoặc tự merge.

Ở Dữ liệu, đăng nhập rồi chủ động chọn “Dùng mục tiêu và check-in của tài khoản”. Consent lưu riêng user trong IDB, không theo email. Bước này chỉ prepare head/read canonical; không nhập V5 hay gửi queue. Reload/login lại đúng account chỉ đọc cache đã consent, không tự RPC/sync. B phải opt-in riêng. Các mục không chuyển vẫn hiện rõ là dữ liệu thiết bị, gồm điểm/history/giáo án/trận đấu/timer/checklist; gợi ý vẫn có thể tham khảo các nhóm legacy này.

Chuyển nguồn áp dụng đồng thời Journey, weekly goals/planner/checkins và plan–actual. Core vẫn thuần đồng bộ, nhận projection đã validate từ facade; không mirror vào V5. Mục tiêu/lịch mặc định không chứng minh đã cấu hình. Check-in projection chỉ8 tuần để tương thích legacy core; cache/export giữ toàn bộ lịch sử đã bootstrap, không trim server. Timestamp tương thích của pending rất cũ chưa có local marker là thời điểm dựng projection, không phải ngày tập và không ghi ngược vào payload/export. Ngày attendance luôn từ key literal. Hỗ trợ lịch sử vượt1095 ngày ở cache; near-cap benchmark chưa làm.

## Lưu và xử lý

Chọn múi giờ IANA cho ghi nhận mới và xác nhận trong Dữ liệu trước khi account check-in. Ngày hiển thị là ngày trên thiết bị; không tự dịch ngày lịch sử. Done/skipped/clear chỉ từ nút người dùng; điểm/timer không tạo attendance. Tombstone có nút “Khôi phục” riêng, dùng CAS restore. Preferences/check-in được validate trước local transaction; mọi write server qua fenced RPC PR4b và domain envelope HTTP200.

Lưu UI chỉ ghi record + outbox nguyên tử, thông báo “kho tài khoản trên thiết bị · chờ đồng bộ”. Chỉ “Đồng bộ thay đổi” gửi. Network/401/quota/upgrade không báo đã đồng bộ; gửi không rõ kết quả được giữ frozen và có nút thử lại tường minh, không đổi UUID/body. “Đọc dữ liệu tài khoản” chỉ pull, giữ intent/review. Bootstrap chưa có/IDB lỗi thì chặn account edit, không fallback ghi V5. Hai tab thông báo owner/type tối thiểu qua BroadcastChannel rồi đọc lại IDB, không truyền payload/token. Focus cũng đọc lại cache, không RPC. Form dirty giữ lựa chọn và revision preview để stale save bị CAS từ chối; nút “Đọc lại” bỏ draft chưa lưu và dùng revision mới, không xóa queue.

Conflict UI trình bày base/local/remote, chọn một bản toàn entity và xác nhận. Giữ local tạo operation mới theo CAS hiện tại, chưa gửi; có thể conflict lại. Giữ server không ghi server. Hai bản và operation chain được archive, không tự GC. Epoch reset có checkbox review bắt buộc; restore bản server đã xóa cần xác nhận riêng. Request sending chưa biết kết quả không được resolve; thử lại cùng request trước. Không merge field tự động hoặc force/LWW.

Đổi A→B/logout làm source clear memory/DOM và đóng scopes ngay trước async load; phản hồi cũ bị generation guard loại bỏ. Queue/consent/cache A không chuyển sang B. “Dùng lại dữ liệu thiết bị” giữ nguyên cache/queue account. Logout chưa xóa hoặc mã hóa cache; tránh máy chung. Chưa có purge UI.

## Xuất và tương thích

“Xuất cache mục tiêu/check-in” chỉ xuất hai domain, canonical bases + overlays, outbox + frozen requests, conflicts + archives, cursor và owner; không Auth/session/import source/device state. Tệp riêng tư, giữ ngoài browser. Format `preferences-checkins-cache-v1` chưa có importer/round-trip và không phải backup toàn account. Raw rescue18 keys và backup schemaVersion1 cũ vẫn chỉ V5; UI ghi rõ không gồm V6. Restore tệp cũ chỉ thay kho guest, không ghi kho account đang chọn.

## Kiểm chứng và gate còn lại

Unit fake IDB/model RPC tách khỏi security evidence. Native IDB browser với Auth/RPC mock kiểm opt-in, hai device CAS conflict, offline/reload/commit-loss, reset review, A→B response muộn, quota và390/820/1180/1440. Auth fixtures không trace/screenshot/video.

Backend workflow vẫn Supabase local thật + Mailpit và pgTAP/REST. Browser integration dùng SDK/OTP thật: A opt-in rồi giữ pull response khi logout/B login; B phải opt-in riêng; thao tác preferences + check-in qua product UI → mất ack thật sau commit → reload → retry đúng body. Thêm writer RPC thật tạo conflict HTTP200, UI preview/giữ local tạo quyết định mới rồi ack; writer thứ hai là API harness, không phải thiết bị vật lý. Alias publishable gateway local vẫn fixture, chưa Managed gateway/SMTP staging. Không thêm recipients/quota hoặc log tokens/OTP/payload.

Máy làm việc bị CDN trả403 khi tải Chromium; native browser/full Supabase được kiểm trong Actions ephemeral. CI exact HEAD, counts và fail/flaky ghi trong PR trước ready.

Chưa staging SMTP/Managed gateway, browser JWT expiry/auto-refresh theo wall clock, physical devices, backup/Auth recovery/deletion drill, source UI các domain PR5, full V6 backup round-trip/purge, near-cap/load/eviction hoặc background scheduler. Pilot dữ liệu thật vẫn đóng theo backup/privacy/repair/consent gates; không coi PR4c là rollout production.
