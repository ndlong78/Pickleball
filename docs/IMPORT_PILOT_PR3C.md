# PR3c — mapper, account-bound consent và importer pilot (mặc định tắt)

Nền main7d3a9e6 sau PR16. Backend/Pages merge SHA thành công; responsive push không chạy tự động cho PR16 backend-only vì path filter hiện hữu. PR16 HEAD9815264 có264 browser tests pass, không flaky. Chưa có Supabase/SMTP staging được kết nối; không provision hoặc đổi production. App/PWA5.4.0 chỉ thêm UI/code pilot, Auth và import flags đều false.

## Trước khi bật staging

Cần migrations PR1a+PR3b, URL HTTPS gốc và publishable key (không query/userinfo/path/secret), Auth OTP/SMTP staging theo AUTH_PR1B. Cấu hình riêng `modules/data/import-config.js` enabled=true **chỉ staging đã cấp quyền**; không bật trong repo shipped. Mapper/controller không cần production secrets. Không mở signup công khai. Feature flag là rollout/kill switch client, không thay RLS hoặc server authorization.

Khi flag false, panel thông báo chưa bật, không đọc source/IDB/network. Khi bật: đăng nhập → chọn tệp đã cứu hộ → chọn nhóm và timezone check-in → đọc canonical account snapshot → preview quyết định → xác nhận rescue/quarantine và đúng account → import/reconcile. Không tự upload sau login. Tám route vẫn dùng localStorageV5; import không chuyển nguồn dữ liệu các trang hoặc bật sync. Legacy keys không sửa/xóa, kể cả khi hoàn tất.

## Mapper và accounting

`modules/data/import-core.js`, adapter legacy-1, nhận raw-rescue-v1/backupV1/Home qua validator PR3a. Source file chỉ UTF8, không chuẩn hóa ngày/điểm/string. JSON trùng key hoặc số nguyên vượt safe integer bị từ chối; raw JSON lỗi từng nhóm giữ nguyên trong source/quarantine. Ngày calendar sai hoặc timezone thiếu không được gán ngầm. Timestamp nguồn có timezone, precision≤6 được giữ nguyên, không cắt microseconds; thiếu/ngày mơ hồ quarantine.

Ánh xạ: weekly/Academy latest thành legacy_score_snapshots, không thành attempts/attendance; academyHistory thành append events, không dedupe arrays; self0–2 tách stage/advanced0–20 và hai metric sets; plan snapshot nguyên vẹn theo allowlist/constraints PR1a; training/selectedPlan tham chiếu **path giáo án đã chọn**. Orphan/duplicate plan ID không chọn phần tử đầu hoặc tạo plan giả. Timer/checklist/focus và unknown groups giữ local/source.

weeklyGoal/weeklyPlan patch chỉ gồm field nguồn. Nếu account chưa có prefs, phải có đủ cấu hình cần thiết từ các nhóm đã chọn; không tự đặt target/level/minutes/gentle. Check-in giữ ngày literal, lessonId=null vẫn null, cần timezone được nhập rõ ràng và không future day. Null selection/assessment không phải yêu cầu xóa server. Optional vắng không sinh row/default hoặc clear server.

Source unit: mỗi array element, map entry hoặc singleton hiện diện là một đơn vị; raw malformed cả nhóm là một đơn vị opaque, không đoán số record bên trong. Không có đơn vị cho optional vắng/array rỗng. Tổng ready+invalid+unresolved+local_only bằng sourceCount. Unselected/device/unknown giữ local_only, selected invalid chỉ bỏ khỏi upload khi user chấp nhận quarantine; unresolved chặn begin. Không âm thầm trim hoặc force import.

Pilot giới hạn5000 source units,1000 selected items,2MiB selected DTOs; checkpoint4MiB, file32MiB. Caps reject trước write, không cắt nguồn. Canonical bootstrap tối đa10050 changes/16MiB (50/page, fixed high-water/epoch) rồi dừng nếu vượt, không dùng partial snapshot để preview. Chưa benchmark gần cap trên điện thoại.

## Overlap và consent

Client không tự kết luận event giống nhau từ timestamp/score. Đối tượng mutable đã tồn tại cần chọn dùng nguồn CAS hoặc liên kết/giữ server; tombstone yêu cầu restore riêng, không tự sống lại. Events cùng instant/discriminator hoặc legacy ID mapping là **candidate**; user chọn giữ cả hai hoặc liên kết một own target/revision. Plan source+legacy ID trùng cũng là candidate dù nội dung đổi. Source path giữ array index và #id=SHA256 legacy ID cho stage/advanced/training/match khi có ID; history lessonID không được coi là event ID.

Preview hiển thị payload nguồn/server bằng textContent, account email+UUID, nhóm, counts, source hash, decision/revision. Manifest hash bind owner+source fingerprint+file hash+adapter+nhóm+timezone+counts+items/dependencies. Đổi file/nhóm/timezone/account làm mất xác nhận; mutation plan sau hash bị reject. Lựa chọn reuse mang revision cụ thể, server đổi phải review lại. Không coalesce các quyết định trái nhau trên cùng singleton; có thể bỏ chọn nhóm để giữ trên máy.

Đăng nhập dùng một shared Auth adapter. Import transport ghim access token của snapshot A; abort/ignore khi generation/owner đổi. Không lấy token B cho request A đang chờ, không export/store token/OTP trong source checkpoint/report. UI xóa private preview khi owner đổi. Logout/cancel/flag-off có thể xảy ra sau khi request đã commit: dừng bước sau, giữ exact pending request dưới A, không claim rollback cả file.

## Checkpoint, retry và reconcile

Checkpoint ở IDB import_receipts namespace user UUID, fingerprint+adapterVersion, local CAS chống tab ghi đè. Lưu approved immutable DTO/report và request operation ID/body **trước** network. Batch tối đa25 items/200KiB JSON client; chỉ gửi dependency đã ack từ batch trước. Server UUID plan được ghi mapping rồi mới materialize training/selection. Same pending request được replay sau timeout/reload; không tạo ID mới cho request đã gửi. Source/manifest đã đổi thì reject checkpoint_changed, không trộn sang tệp/account khác.

Muốn resume phải chọn đúng tệp gốc/fileHash và xác nhận lại; plan đã duyệt được restore từ checkpoint, không tự rebase từ server để đổi CAS. Conflict/invalid dừng ở pending, không finish hoặc tự tăng revision. Backend repair/new group selection cùng fingerprint chưa có API: cần review/repair riêng, không bypass bằng force/new UUID. Chưa hỗ trợ resume sau IDB eviction trên thiết bị khác; luôn giữ original rescue ngoài browser. Không tự xóa checkpoint.

Sau finish server committed, client vẫn lưu `committed_unverified`, pull canonical tại một H cố định rồi kiểm actual counters, target owner, mapping/dependency, payload fields và reuse revision. Timestamp so ở microsecond, không mất precision khi verify. Chỉ khi khớp mới `complete`. Nếu canonical đã đổi/xóa hoặc read vượt cap, giữ committed_unverified để đối soát, không gửi lại writes. Một file gồm nhiều batch, **không atomic toàn file**. Không có auto-sync engine.

Báo cáo quarantine tải riêng giữ `sourceText` nguyên văn và file hash/report, không JSON.parse→stringify làm mất unknown precision/bytes text; là wrapper báo cáo, chưa có importer cho wrapper này. Không log notes/source/token. Tệp vẫn chứa dữ liệu riêng tư và phải giữ ngoài browser an toàn.

## Validation/evidence

Unit mới: mapping, no defaults/attendance, event identity/duplicates, orphan/dependencies, self/stage/advanced, timezone, overlap/tombstone/CAS bigint; duplicate JSON keys/unsafe integers/calendar/microseconds; exact pending replay, account switch/late response, immutable consent, domain HTTP200 conflict, committed-unverified; checkpoint CAS/token exclusion; pinned Auth transport.

Browser Chromium/WebKit: shipped flag-off guest; pilot Auth/RPC mock + mapper/controller/IndexedDB native, consent+no V5 writes tại390/820/1180/1440; actual reload lấy checkpoint và replay receipt body; A→B response muộn. Có thêm gating quarantine/report giữ sourceText nguyên văn; resume restore lại nhóm đã duyệt và khóa chỉnh sửa. Trace/screenshot/video tắt ở Auth/import fixtures. Đây là browser mock transport, không phải browser GoTrue E2E.

Backend CI: GoTrue/Mailpit OTP thật → JS mapper/controller bằng real A/B sessions →13 source items/account, dependency plan→training, duplicates preserved/no invented attendance, timeout-after-commit replay/IDB checkpoint fixture, canonical reconcile → refresh/logout. Local checkpoint của Node probe là fake-indexeddb, khác browser native suite; credentials chỉ stdin/memory, không artifact/log. Giữ195 pgTAP+14 import+9 REST và unit/full browser regression. Exact HEAD/counts/flaky ở PR.

Ngoài phạm vi/chưa kiểm: staging SMTP/deliverability, browser UI + real GoTrue cùng luồng, physical devices, cap/quota/eviction/load, cross-device checkpoint rescue, repair/amend manifest/group expansion, importer rollback/tombstone compensation, full sync/source switch. Không rollout pilot thật trước staging/backup/privacy gates của policy.

## Race khởi tạo Học viện đã ghi nhận trên main

PR15 merge từng có flaky WebKit1440: trend “không đổi” thay vì tăng6. Test mới cố tình trì hoãn academy-page.js xác nhận fragment trước đây cho edit/save trước hydrate (local test fail trước fix). Giữ input/nút save disabled tới sau listeners+initial choose/refreshLearning; test sau fix xác nhận giá trị6 được lưu đúng. Không nới assertion/retry hay tắt suite; không tuyên bố mọi nguyên nhân flaky đã được loại bỏ chỉ từ một clean run.

CI đầu tại d7945cb:279 pass,2 fail (overflow390 trên cả hai engines),1 flaky (WebKit weekly-goal hydration, retry pass). Đã thêm ràng buộc wrap/min-inline-size cho pilot; giữ assertion overflow≤2px và thêm diagnostics chỉ tag/id/width, không nguồn/token. Fixture giữ script nay block Service Worker riêng và xác nhận route đã intercept trước khi assert disabled, tránh SW đáp ứng ngoài network gate; PWA suites vẫn giữ SW. Kết quả exact HEAD sau sửa được ghi trên PR, không xóa lần fail/flaky này khỏi evidence.
