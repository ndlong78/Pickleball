# PR5b2b1 / V5.11.0 — checklist và bước tập trung trên thiết bị

Nền main `6edb8f20a5a9088ffc5a3956ab207cd837faaa14` sau [#31](https://github.com/ndlong78/Pickleball/pull/31), app5.10.0; không PR mở trùng lúc bắt đầu. [UI41657955460](https://github.com/ndlong78/Pickleball/actions/runs/41657955460):287 unit,474 browser và10 lượt WebKit bổ sung pass,0 fail/flaky/retry. [Backend41657955739](https://github.com/ndlong78/Pickleball/actions/runs/41657955739):275 pgTAP/45 REST và Auth thật GoTrue/Mailpit/SDK/browser Chromium/WebKit pass. [Pages41657953304](https://github.com/ndlong78/Pickleball/actions/runs/41657953304) success cùng merge SHA. Evidence HEAD PR mới ở mô tả PR.

## Phạm vi và nguồn

PR5b2b1 chỉ persist checklist sáu bước và vị trí bước tập trung Học viện theo tài khoản trên **trình duyệt này**. Timer Academy/Court vẫn RAM, không persist deadline hoặc tự chạy sau reload. Chưa full account device state, backup round-trip hoặc purge; không coi toàn PR5b2b/c hoàn tất.

`academy-practice-runtime.js` là facade duy nhất, lazy cùng Academy sau activity/plan runtime; Home không nạp thêm. Khi cả hai nguồn là guest: giữ nguyên hai khóa `pickleup_academy_steps_v41` / `pickleup_academy_focus_v42` và hành vi guest. Khi ít nhất một nguồn là account: dùng own account device state, không đọc/ghi practice keys khách; mọi nguồn account phải cùng owner. Loading/error/mismatch không fallback guest hoặc ghi state rỗng. Login không nhập checklist khách, không tạo RPC hoặc outbox.

Dùng opt-in của nguồn hoạt động/giáo án hiện hữu, không thêm consent cloud hoặc feature flag mới: dữ liệu thực hành này chỉ local. Hai nguồn có thể opt-out độc lập; còn một account source thì vẫn private local. Cả hai opt-out/logout hiển thị lại guest và giữ account state cách ly. Re-login cùng account khôi phục state riêng. Cache vẫn không mã hóa; logout không tự xóa IDB. UI nói rõ state không gửi cloud, chưa có trong các bản xuất hiện tại và có thể mất khi clear/eviction.

## Hợp đồng repository

Giữ IDB schema1 và stores hiện hữu, không SQL/RLS/protocol hoặc dependency mới. Metadata user-scoped `academy-device-id-1` lưu UUID local, tạo nguyên tử một lần cho account/browser để tabs cùng dùng; không fingerprint thiết bị hoặc thêm localStorage key. `device_state` key `[user:<uuid>,deviceId,'academy-practice-1']` chứa:

```json
{"localRevision":"1","value":{"schemaVersion":1,"lessons":{"PU-037":{"checked":[0,2],"focus":1}}}}
```

Envelope thực tế còn namespace/deviceId/key. Tối đa80 public lesson IDs PU-001…080; checked unique integers0…5, focus integer0…5, exact keys/types, không credential/free-text. Corrupt saved state/revision bị chặn cả read/write, không normalize hoặc ghi trắng. `getAcademyPractice` và `changeAcademyPractice` đọc/kiểm metadata consent trong cùng transaction với state; so sánh enabled/localRevision của cả hai nguồn đang cấu hình, bao gồm nguồn opt-out. Nguồn có flag tắt không cấp quyền ghi. Ít nhất một consent enabled phải khớp. Race opt-out tab khác không thể ghi bằng revision cũ.

Intent hẹp: check(index,checked boolean), focus(index), reset(checked của riêng bài). Mỗi transaction đọc bản mới nhất rồi chỉ thay phần được chỉ định, giữ các checkbox/bài/vị trí khác; không replace toàn map từ snapshot tab cũ. Cùng checkbox/focus dùng giá trị explicit theo thứ tự transaction local, không server timestamp/LWW cho dữ liệu cloud. Reset checklist giữ focus như trước. Revision tăng sau commit, read kết quả cũ không lùi view; retry checkbox không toggle ngược. Không đụng records/outbox/conflicts/cursors/receipts hoặc tạo attendance/attempt.

## Vòng đời và UI

Source token đổi đóng scope/abort transaction chưa commit, xóa memory/DOM và failed intent trước nhận account mới. Read/write đã commit nhưng trả muộn bị generation guard bỏ qua, không cập nhật B. State A đã commit giữ namespace A. BroadcastChannel chỉ type/owner, tab nhận đọc lại IDB; focus/visibility là fallback khi không có BroadcastChannel. Khác origin/browser/device không sync state. Trong tab state update không đổi focus index giữ timer đang chạy; đổi bước/source dừng timer.

Controls disable khi đọc/ghi/lỗi nguồn; chỉ báo đã lưu sau transaction complete. Quota giữ bản đã lưu, rollback checkbox view và cho retry intent riêng; không báo saved hoặc silently ghi kho guest. Lỗi đọc/corrupt có nút thử đọc lại, không tự xóa dữ liệu hỏng. Chưa có UI sửa corrupt hoặc export riêng state này; đó là gate backup/recovery kế tiếp.

## Kiểm chứng và giới hạn

Unit VM kiểm lỗi đọc cũ không ghi đè lần lưu mới trong cùng account (fail trước/pass sau guard readVersion). Unit fake-IDB kiểm merge hai connections/reopen/isolation/no queue, hai consent revisions, quota rollback/retry, schema/credential/corrupt và close in-flight. Browser native-IDB/mock Auth/RPC kiểm4 viewport390/820/1180/1440, reload/tám route/offline, two tabs, quota/corrupt, A→B/late read/write và hai nguồn consent. Mock transport không chứng minh Auth/RLS thật.

Harness Auth thật local giữ OTP/email capture/session/private RPC và các regression cũ, đổi expectation reload Academy sang checklist/focus đã lưu và timer dừng. CI Chromium/WebKit và pgTAP/REST phải kiểm đúng HEAD; counts/fail/flaky/retry ở PR. PWA kiểm upgrade5.10, cache lazy module mới và visited Academy guest offline dưới `/Pickleball/`; không cache Auth/API hoặc ghi credentials vào artifact.

Năm flags Auth/import/sync/activity/plan vẫn false, URL/publishable key rỗng; review không cần credentials. Build/assets/cache5.11.0 đồng bộ. Không deploy DB, public signup, production hoặc tự merge. Chưa Managed staging SMTP/delivery/gateway, browser expiry theo wall clock, physical/installed-PWA QA, Court/device timer persistence, full V6 backup round-trip/purge/profile/account deletion/Auth recovery/restore/importer repair/near-cap load. Pilot dữ liệu thật vẫn đóng.
