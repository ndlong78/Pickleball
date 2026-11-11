# PR5b2c2a / V5.16.0 — nền giao dịch dọn cache tài khoản

Baseline main `131441e9eb87cf2741f6b8174e6242e13218b434` sau #43, app5.15.1. Không PR mở trùng lúc bắt đầu. #43 chỉ tài liệu: Pages43070881792 success tại merge SHA; UI/backend main không có run mới do path filters. PR43 HEAD9191385 có359 unit,580 Chromium/WebKit và40 lượt WebKit bổ sung,300 pgTAP/48 REST/GoTrue-Mailpit Auth browser thật hai engines pass,0 fail/flaky/retry. Evidence PR mới nằm trong mô tả PR, không dùng baseline thay gate HEAD.

## Phạm vi hiện tại

Lớp repository có `getAccountPurgePreview()` và `purgeAccountCache({expectedSnapshot,operationId})`, capability `cachePurgeTransactions:1`. Chưa có product caller, nút xóa, flag bật purge hoặc thao tác xóa dữ liệu người dùng thực trong PR này. Đây là bước nền cho UI export/confirmation và phối hợp các tab sau đó. Không restore, importer repair, xóa tài khoản/cloud, SQL/RLS/protocol, Auth config hoặc18 khóa guest.

Preview đọc nhất quán bảy stores của namespace trong một readonly transaction. Purge so toàn snapshot hiện hành với preview, kiểm lại blockers và xóa đúng namespace của bảy stores trong một readwrite transaction. Thay đổi có cùng số dòng vẫn làm preview hết hiệu lực. `legacy_snapshots` không namespace, tài khoản khác, guest, localStorage/Auth và cloud được giữ nguyên. Giới hạn100.000 dòng/31 MiB serialized rows giống capture cứu hộ; vượt giới hạn thì dừng toàn bộ, không cắt hoặc xóa một phần.

Chỉ cho **cache đã xử lý xong**. Block nếu có outbox pending/deferred/sending/blocked/conflict/unknown, ACK thiếu revision/epoch, resolved thiếu archive, record có overlay/tail/review/không có canonical base hợp lệ, conflict chưa resolved, import chưa complete hoặc pending khác null, sender lease còn hạn, consent revision không thể tăng, metadata/device/cursor chưa nhận diện. Chính sách cố ý có thể chặn một cache cũ/corrupt dù người dùng tin đã gửi xong; không có force discard. Rescue JSON-compatible vẫn giữ dữ liệu chưa hiểu; file không cấp quyền purge hoặc restore.

Sau commit chỉ giữ bốn metadata rows của namespace: mốc thế hệ mới và ba consent đã tắt. Consent activity/plan tăng revision để tránh ABA; timezone/device identity được bỏ cùng cache và phải xác nhận/tạo lại khi chọn nguồn sau này. Checklist/focus/checkpoint đã lưu trên máy cũng thuộc phần bị xóa, dù chưa có bản cloud. UI tương lai phải yêu cầu giữ bản cứu hộ riêng và công bố rõ file chưa nhập lại được. Quota/abort ở bất kỳ bước nào rollback toàn bộ deletes và metadata.

## Chặn tác vụ cũ và nâng IndexedDB

DB `pickleup-v6` lên **VERSION2**, vẫn đúng tám stores/key paths/index namespace, không recreate/clear stores. Upgrade1→2 kiểm layout cũ; bất thường thì abort, giữ nguyên schema/data. Version2 là capability fence để repository VERSION1 không mở lại và ghi ngoài giao thức mới. `onversionchange` đóng connections/scopes cũ. Nếu upgrade bị tab khác giữ, báo blocked và hủy upgrade đã bỏ; không ép xóa DB. Bản frontend cũ cần cập nhật/reload; không downgrade schema, reset storage hoặc dùng xóa dữ liệu làm workaround.

Mỗi scope user pin marker `local-cache-generation-1` ngay khi tạo, trước khi chờ network. Mọi transaction user đọc lại marker dưới cùng lock metadata với purge; marker đổi trả `cache_changed`, kể cả canonical pull, ACK, checkpoint, import receipt, lease và consent. Readonly cứu hộ vẫn đọc được marker JSON-compatible chưa hiểu; readwrite bị chặn. Marker mới do crypto UUID tạo bên trong repository; caller operation ID không được dùng làm marker để tránh tái sử dụng thế hệ cũ. Guest không dùng fence này.

Sau purge phải tạo scope mới. Transaction fence chỉ chặn local commit của scope cũ; **không hủy RPC đã gửi**, không tự dừng timer, xóa RAM/DOM hoặc thu hồi file đã tải. Các controller hiện tại chưa subscribe purge vì chưa có product caller. Không dùng API này từ console để thao tác cache thật hoặc gọi nó như workflow đã hoàn chỉnh.

Định dạng cứu hộ vẫn `account-cache-rescue-v1`, envelope version1; preview/create nhận snapshot repositoryVersion1 **và2**, vẫn chỉ đọc, không tự nâng hoặc ghi lại file. Không có restore authority mới.

## Gate bắt buộc trước UI purge

- Bind đúng Auth user, logout/A→B/task generations; preview phải từ cache máy hiện tại, không từ file import.
- Tạo rescue, yêu cầu tải, xác nhận đã giữ file và hiểu giới hạn phục hồi; final confirmation riêng. Không tuyên bố đã chứng minh OS lưu file.
- Dừng nguồn/sender/reader/timer/form và xóa prepared links/private RAM trước khi purge; phối hợp các tab, fail closed khi chưa quiesce được. Broadcast chỉ báo invalidate, không chứa payload/token.
- Native two tabs/late ACK/pull/import, reload/offline/quota/abort và account switch; toàn bộ tám route phải bỏ dữ liệu cũ. Giữ pending/unknown commit nguyên, không mở force erase.
- Không logout tự động hoặc nói đây là secure erase/remote wipe. Cache không mã hóa; người có quyền OS/XSS có thể đọc. Shared-device policy cần bước logout riêng sau khi dọn.

## Kiểm thử và cấu hình

Unit fake-IDB kiểm blockers, preview CAS, transaction rollback sau deletes, namespaces/unscoped legacy, old scopes qua nhiều connections, concurrent purge, caller ID không rebind marker, malformed/blocked/version upgrade và cứu hộ1/2. Browser native IDB chạy Chromium/WebKit: API-only offline purge hai realm/late canonical page, giữ B/guest/Auth, quota và reload marker, V1 upgrade có frozen request/provenance/device state. Không gọi những ca này là Auth UI purge.

Harness GoTrue/Mailpit/SDK thật bổ sung API-only maintenance trên DB local có tên riêng, được điền bằng private pull dưới session đã xác thực: rescue chỉ trong RAM, purge cache sạch, old scope bị fence, consent tắt, session/server rows giữ nguyên, explicit re-opt-in/pull đọc lại được. DB product của fixture không bị purge; không có UI xóa đang kiểm chứng, không OTP/token/private files vào artifact.

Không cần SQL hoặc cấu hình Supabase mới. Staging vẫn có migration7/signup-off/ledger metadata do owner xác nhận ở #43; Managed gửi/đọc sau nâng cấp, nhóm hoạt động/giáo án, A→B/conflict/expiry/SMTP và physical QA vẫn chưa được suy là đạt. Không mở pilot dữ liệu thật. Sau PR này triển khai UI purge theo các gate trên, rồi full rescue/restore compatibility và vận hành backup/Auth recovery/deletion.
