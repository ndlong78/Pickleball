# PR5b2a / V5.10.0 — lựa chọn bài Học viện theo tài khoản

Nền main `a2df9050eec1505c45efe80a8ca21ee311db056a` sau [#30](https://github.com/ndlong78/Pickleball/pull/30), app5.9.0; không PR mở trùng khi bắt đầu. [Backend41604713432](https://github.com/ndlong78/Pickleball/actions/runs/41604713432):275 pgTAP/45 REST và GoTrue/Mailpit/SDK/browser Auth Chromium/WebKit pass,0 retry. [Pages41604713709](https://github.com/ndlong78/Pickleball/actions/runs/41604713709)success cùng merge SHA. **[UI41604713381](https://github.com/ndlong78/Pickleball/actions/runs/41604713381):281 unit,449 browser pass+1 flaky Chromium và10 WebKit bổ sung; chưa clean sau merge.** Evidence HEAD cuối của PR mới ở PR, không lấy workflow success có retry thay gate sạch.

## Nguồn và thao tác

Dùng plan-runtime/controller và consent `plans-selections-consent-1` hiện hữu cho `user_selections`, không kế thừa consent activity. Metadata/typed contract đã bao gồm hai field; nay nối reader/writer Academy. **Năm flags Auth/import/sync/activity/plan đều false**, URL/key rỗng. Không SQL/RLS/IDB schema/protocol thay đổi, không direct SDK/table calls ở UI; không provisioning/production/public signup/tự merge. Bump đồng bộ package/lock/build/assets/PWA cache5.10.0, giữ8 route/80 bài/18 keys và Home lazy. Review không cần credentials.

- Dữ liệu → chọn nguồn giáo án/lựa chọn tài khoản; điểm Học viện vẫn theo nguồn hoạt động riêng. Đăng nhập/reload/focus chỉ đọc cache, không tạo lựa chọn hoặc gửi queue.
- Academy đổi tuần/cấp độ hoặc mở bài gợi ý là intent rõ ràng. Lưu local bằng sparse `{selected_academy_lesson_id}` và expected localRevision của singleton, không xóa/ghi lại `selected_personal_plan_id`. Nút “Lưu lựa chọn bài này” cho retry khi quota/lỗi; preview bài đang xem vẫn giữ nếu lưu thất bại. Cùng lựa chọn hiện hành không tạo command thừa.
- Chỉ “Đồng bộ giáo án” gửi queue; read/send/retry tách biệt. Pending choice có thể resume nội dung public từ cache, có nhãn chưa đồng bộ; needs_review/deleted/loading/error không fallback lựa chọn khách hoặc chọn bản server cũ thay ý định đang chờ.
- Settings bỏ chọn Academy chỉ patch null field Academy; bỏ chọn personal giữ field Academy. Tombstone singleton cần nút **khôi phục lựa chọn trống**, confirm rõ cả hai field không được chọn, CAS/ACK rồi chọn lại; không put để tự phục sinh.

`academySelection/raw/chooseLesson/requestLesson` là facade duy nhất cho lựa chọn này. Journey đọc cùng nguồn và vẫn chỉ resume bài cùng cấp độ; Academy Resume/Next/recommendation và link từ Journey, weekly goals/planner, insights đều dùng facade. Router bắt link có data-lesson-id trước routing; commit local trước lazy navigation, chờ đúng module và guard token/serial/route sau await. Lỗi mở trang sau local commit được báo đã lưu nhưng chưa mở được, không báo mất lựa chọn. Old A navigation không mở bài A dưới B. Không mirror ID account vào key V5.

Login/mount chỉ preview public lesson đầu tiên nếu không có choice; không queue/default account choice. Guest giữ raw string key và hành vi mount/explicit choices cũ. Chuyển nguồn/logout chỉ khôi phục view guest, không seed hoặc sửa key guest trong callback source change. Backup V5/raw rescue/importer tiếp tục đọc legacy thật, không qua facade.

## CAS, review và thực hành

Hai field cùng một singleton CAS; sửa field khác trên tab khác vẫn có thể conflict, không tự merge/LWW. Settings trình bày Academy ID/title **và** personal plan ở original/local/remote, dùng full-preview CAS/archive/epoch/replay như PR5b1b. HTTP200 domain invalid/conflict không thành synced. Sending chưa rõ outcome phải replay frozen request trước quyết định. Account selection pending/review vẫn áp gate conservative Court của client: đồng bộ lựa chọn trước Court; clock Court không được giữ qua selection unavailable, không hứa chạy tiếp khi singleton đang pending.

Academy checklist/focus/timer khi **một trong hai nguồn activity hoặc selection là account/loading/error** dùng RAM phiên trang, không đọc/ghi keys checklist/focus khách. Giữ khi đổi route cùng nguồn, reset reload/đổi owner/mode/consent. Chọn bài khác dừng timer của bài trước. Cả hai nguồn guest giữ persistence/caps/keys cũ. Chưa persist account device_state trong IDB, chưa full V6 backup hoặc export RAM state.

Đổi A→B/logout clear choice, score/conditions draft, checklist/focus/timer và feedback cũ trước nhận namespace mới. Sources points và selection có guards riêng; không giữ draft points từ form A sau đổi selection source. B có consent riêng. Quota giữ preview và không báo saved khi transaction abort; local CAS lỗi giữ queue riêng để đọc/review. Timer/checkbox/chọn bài không tạo attendance hoặc attempt; chỉ thao tác lưu điểm tạo event và check-in vẫn thủ công.

## Kiểm chứng và vấn đề baseline

Unit fake-IDB/VM: guest/raw key/default-off/no RPC, sparse selection giữ personal plan, manual send/clear, tombstone không implicit restore, A→B trong delayed navigation, router delegate trước routing. Native-IDB/mock Auth/RPC:4 viewports390/820/1180/1440, cross-route Journey/Court, quota retry, exact replay/reload, RAM state/legacy bytes, conflict hai lesson IDs/review, tab A→B và confirmed blank restore. Đây không RLS/Auth thật.

Regression source reset phát hiện select bị để value rỗng nhưng options đã cache nên focus DOM cũ chưa redraw; choose nay có fallback public option hợp lệ và test A→B qua. Fixture native luôn tắt trace/screenshot/video. Các runner local song song phải dùng output directories riêng; không coi lỗi ENOENT do trùng artifact directory là product failure hoặc clean run.

Main #30 có flaky `sync-ui` offline test: helper route chỉ chờ account notice đã tồn tại ở Settings/Progress, rồi cắt mạng trước Journey fragment tới. Test controlled giữ fragment chứng minh helper cũ trả về sớm; sửa await page-loader.ensure đúng page trước offline, không đổi assertion/timeouts/retries hoặc rerun main để che flaky. Giữ test delayed-fragment trong suite.

CI backend giữ Supabase local/GoTrue/Mailpit/SDK/browser Auth thật Chromium/WebKit; thêm product Academy choice→local only→commit-loss/reload/exact replay→private canonical field→HTTP200 conflict preview/review→clear, kiểm personal choice/legacy/check-in count không đổi. Không token/OTP/private payload vào logs/Auth artifacts. Publishable alias loopback vẫn fixture, chưa Managed staging.

PWA kiểm upgrade5.9, visited Academy offline giữ guest choice/checklist dưới `/Pickleball/`, không cache API/Auth. Local Node24 và Chromium hệ thống154; bundled browsers local còn CDN403, exact Chromium/WebKit CI counts/fail/flaky đúng HEAD ở PR. Chưa Managed staging SMTP/delivery/gateway, browser expiry theo wall clock, physical QA/installed PWA, persisted account device state, full backup round-trip/purge/profile/account deletion/Auth recovery/restore/importer repair/near-cap load. PR5b2 chỉ hoàn tất sau các lát cắt recovery/privacy còn lại; pilot dữ liệu thật vẫn đóng.
