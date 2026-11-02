# PR5a2c — đánh giá và trận đấu trong kho tài khoản

Nền main `c9afa506da79a8cb408d0ad364fcba4bf985e9fe`, [#25](https://github.com/ndlong78/Pickleball/pull/25) đã merge, app5.6.0. Không PR mở khi bắt đầu. Main [regression41398002523](https://github.com/ndlong78/Pickleball/actions/runs/41398002523):232 unit+368 browser+5 WebKit bổ sung,0 fail/flaky/retry; [backend41398002500](https://github.com/ndlong78/Pickleball/actions/runs/41398002500):241 pgTAP/37 REST và GoTrue/Mailpit/SDK/browser Auth thật cả Chromium/WebKit; [Pages41398002023](https://github.com/ndlong78/Pickleball/actions/runs/41398002023) success cùng merge SHA. Các phần giới hạn dưới đây vẫn áp dụng sau khi frontend deploy.

## Phạm vi và cấu hình

PR này bump app/build/assets/cache **5.7.0**. Giữ8 route/80 bài/18 khóa khách, cùng Auth adapter và RPC có sẵn. Không migration/schema/RLS/grants mới, không direct table DML, cloud provisioning, production hoặc public signup. Auth/import/mutable sync/activity flags đều false, Auth URL và publishable key rỗng. Guest không cần SDK/session/IDB account để sử dụng các form.

Kho hoạt động dùng consent CAS riêng đã có ở PR5a2a/b: checkbox trước đây đã nêu đủ bốn loại sự kiện. Bản này nối thêm UI self/stage/advanced và matches; chỉ thao tác lưu rõ ràng tạo queue mới. Login/restore/route/focus không tự import legacy hoặc gửi pending. Sender thủ công vẫn có thể gửi queue hợp lệ của cả bốn loại đã có. Mục tiêu/check-in dùng consent, cursor và lease riêng của PR4c.

Khi chuẩn bị **staging được cấp quyền**, áp dụng migrations và cấu hình Auth/SMTP theo [policy](PILOT_OPERATING_POLICY.md)/[runbook](MIGRATION_RUNBOOK.md), frontend chỉ HTTPS URL + publishable key. Bật Auth và activity trong cấu hình staging để thử source này; không cần bật importer hoặc mutable sync. Cờ frontend không thay chính sách signup phía server. Không đặt service-role, DB/SMTP password hoặc token trong client/repo/chat; chưa cần credentials để review PR.

## Ý nghĩa dữ liệu

- Self: sáu kỹ năng cơ bản, mỗi mục0–2; UI tổng /12. Không chuyển thành sáu kết quả /20, attendance, DUPR hoặc cập nhật level sở thích. Latest lấy event có ngày biết rõ, không ở tương lai.
- Stage: sáu kỹ năng cơ bản /20, band1.0–3.0. Advanced: bộ `third/reset/movement/counter/doubles/decision` /20, band3.0–4.0. Không tráo bộ metrics. Writer tính average/ready theo gate nội bộ hiện hành từ điểm đã validate; snapshot import optional/null giữ nguyên, không dựng chứng nhận hoặc tự nâng cấp.
- Matches: singles/doubles, tỷ số nguyên0–99, trọng tâm allowlist, note tùy chọn≤280 codepoints và tình huống đánh đôi. Notes là riêng tư, render bằng textContent, không in log hoặc đưa vào artifact Auth.
- Mỗi lần lưu là event/entity/operation UUID riêng, timestamp và payload được chụp trước await. Sau transaction record+queue mới báo lưu trên thiết bị. Retry giữ request cũ; không dedupe hai lượt có cùng điểm/nội dung/ngày. Không tạo attendance từ bất kỳ đánh giá hoặc trận đấu nào.

`activity-source-core` tạo projection đồng bộ cho reader cũ, tách raw events khỏi dữ liệu được dùng phân tích. Ngày null/unknown hoặc future vẫn có ở lịch sử raw/export, không thay bằng ngày import và không tính vào latest, số trận, thắng/thua, gợi ý hoặc mốc Journey. Sort theo instant microsecond/timezone, UUID phân xử khi bằng nhau, giữ nguyên chuỗi thời gian gốc. Cửa sổ thống kê10/20 trận dùng thứ tự projection thay vì sort chuỗi ISO khác offset.

## Reader, writer và vòng đời UI

`activity-runtime` tiếp tục là facade duy nhất cho các nguồn đã chuyển; không thêm SDK calls ở UI. Nó nhận snapshot từ controller rồi cung cấp Academy, assessment và match views. Lỗi/loading giữ account source không đọc được, không fallback dữ liệu khách hoặc cho ghi nhầm nguồn. Đổi owner/mode/consent revision tăng source token; mọi save/delete/export/status cũ bị bỏ khi token khác. Pending A giữ nguyên namespace A, không chuyển sang B. Focus và BroadcastChannel chỉ đọc lại cache, không tự RPC.

| Module | Nguồn và hành vi |
|---|---|
| `assessment-self-ui` | Tách self UI khỏi backup; source-aware latest, save immutable, lịch sử self raw; giữ draft khi cùng account, xóa input/result cũ khi source đổi |
| `stage-assessment`, `advanced-readiness` | Save typed /20, giữ metrics riêng, lỗi/quota và lịch sử raw; không trim theo300/200 của backup khách |
| `match-journal` | Save local-first, giữ note/score khi quota, lịch sử raw/delete; account không dùng validator capped500 của V5 |
| `training-journey-*` | Stage account cùng facade; self/advanced là mốc tùy chọn riêng, không đổi thang điểm, level hoặc check-in |
| `tactical-insights-*`, `training-evaluation-*` | Matches theo source, lượt đo luyện tập vẫn device-only và có nhãn riêng. Gợi ý trận account không tự chép vào giáo án khách; delayed Coach callback có guard nguồn |
| Basic/advanced Coach | Không tự nạp điểm account sang plan không có namespace. Nhập điểm thủ công hoặc chọn kho thiết bị; account plans/selections chờ PR5b1. Draft ưu tiên nâng cao bị clear khi source đổi |
| Backup/restore V5, rescue/importer | Tiếp tục đọc/ghi legacy thực, không đi qua facade; không tự nhập hay mirror account vào18 khóa |

Settings nạp validator advanced/match trước khi các fragment tương ứng tồn tại. Hai module khởi tạo UI idempotent cả lúc fragment đến sau, để Settings→Coach/Matches và direct URL đều hoạt động. Home giữ lazy; Matches nay nạp activity dependencies trước UI. Không mất timer đang chạy hoặc thêm route.

## Lịch sử, xóa, review và export

Widget dùng chung hiển thị20 raw events/trang, không cắt history theo200/300/500 của guest. Mỗi type assessment có lịch sử riêng, giữ scale, band, từng metric; match hiện note/trọng tâm/tình huống. Null/future có nhãn. Legacy history vẫn giữ hợp đồng/cửa sổ cũ. Account cache >10050 changes hoặc giới hạn pull vẫn báo lỗi theo policy, không bỏ phần dư để báo thành công; near-cap/load chưa benchmark.

Xóa có confirm, expected local revision và source guard trước/sau hộp thoại. Queue dùng delete CAS tạo tombstone; không có update/restore event. Panel PR5a2b review original/local/remote nay hiển thị đủ metrics hoặc note/focus/mode; sending phải replay, epoch cần acknowledgement, retry-delete cần xác nhận. Decision CAS toàn preview và archive giữ request cũ; không force/rebind/sinh identity khác âm thầm. Các trạng thái processing/success/error tiếp tục tách theo từng tác vụ.

Export `activity-events-cache-v1` giữ bốn loại, bases/overlays/pending/frozen/conflicts/decisions/cursor/consent, không Auth/session. Tệp riêng tư, **chưa round-trip hoặc backup toàn account**. Backup V5 không chứa account data. Không xóa legacy/cache khi logout, không mã hóa local cache và chưa remote wipe/purge UI; full V6 backup/purge chờ PR5b2.

## Kiểm chứng và giới hạn

Unit fake-IDB/model: typed scales/metrics/gates, duplicate-content identities, >legacy caps, unknown/future, microsecond/timezone/tie, match windows, facade không mirror/A→B trước await, mixed assets chặn trước Auth/không fallback khách và Journey không sinh attendance. Native-IDB/mock-Auth/RPC/BroadcastChannel UI: guest,4 viewports, Settings→Coach/Matches, ba loại assessment, cross-reader, manual sync, quota draft, lớn hơn caps, tombstone/conflict review, offline/lost-ack/reload exact replay, late A response và hai tab giữ draft. Đây không là evidence Auth/RLS thật.

Fixture xóa Academy trước đây giả định `server.changes[0]` là lượt lưu đầu tiên. Sender chọn các create độc lập từ outbox theo UUID, không bảo đảm thứ tự đó. Test nay lấy đúng entity UUID của lượt còn lại và kiểm điểm14 trước khi tạo CAS conflict, giữ nguyên assertions/retries. Không rerun để che flaky.

Backend giữ migrations/241 pgTAP/37 REST trên Supabase local ephemeral và mọi luồng Auth trước. Browser GoTrue/Mailpit/SDK thật thêm thao tác self/stage/advanced/match UI→manual send→private canonical data→reload không auto RPC→match bị writer RPC xóa trước→HTTP200 conflict→review/archive, bảo toàn legacy/check-in counts và logout/PWA exclusion. Cùng recipients, không tăng quota OTP, không Auth traces/screenshots/videos/storageState hoặc payload/token/OTP logs. Gateway publishable alias loopback vẫn fixture, chưa Managed staging.

Bundled browser local tải bị CDN403; Chromium hệ thống đã chạy26 ca Academy/assessment/match/PWA với0 fail/retry; unit Node24 đạt242/242. Đây vẫn là mock Auth/RPC cho ca account UI, không thay bằng chứng Auth thật. Counts/pass/fail/flaky và CI **đúng HEAD cuối** ghi tại PR. PWA kiểm upgrade cache5.6→5.7, giữ localStorage và route Matches đã ghé thăm hoạt động offline dưới `/Pickleball/`.

Chưa staging SMTP/delivery/Managed gateway, browser expiry theo wall clock, physical iPhone/iPad/Android/installed PWA, full V6 backup/restore/Auth recovery/account deletion/purge, restore drill, near-cap/load/eviction hoặc vận hành pilot. Bước code tiếp theo **PR5b1 plans/selections**, rồi **PR5a2d training** dùng own plan đã ack. Giữ [pilot gates](PILOT_OPERATING_POLICY.md) đóng.

Lượt PR CI đầu `8d44bf6` có388 browser pass,2 fail rescue preview và2 flaky WebKit. Selector preview toàn trang trùng nhãn `data-source` mới, được scope vào rescuePanel. Trace hai flaky cho thấy CSS Google Fonts mất63s: `goto(load)` đã ăn hết deadline trước khi kiểm dock hoặc insights. Font nay được gắn sau load bằng task riêng, giữ system fallback; test controlled giữ response font vẫn yêu cầu load event, dock/Progress hoạt động. CI thêm5 lượt WebKit case này với retries=0, giữ5 lượt rescue trước đó; full suite thành394. Không chặn font toàn suite, bỏ assertion/engine, đổi navigation wait hoặc tăng timeout/retry. Exact kết quả HEAD sửa ở PR.
