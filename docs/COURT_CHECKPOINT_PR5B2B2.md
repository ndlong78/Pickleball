# PR5b2b2 / V5.12.0 — điểm dừng Court trên thiết bị

Nền main `7134d93f1c76f1ccd276f7ad10c41f42d3c277ae` sau [#32](https://github.com/ndlong78/Pickleball/pull/32), app5.11.0. Không PR mở trùng lúc bắt đầu. [UI41757152273](https://github.com/ndlong78/Pickleball/actions/runs/41757152273):294 unit +492 browser +10 lượt WebKit bổ sung pass,0 fail/flaky/retry; [backend41757152143](https://github.com/ndlong78/Pickleball/actions/runs/41757152143):275 pgTAP +45 REST và GoTrue/Mailpit/SDK/browser Auth thật Chromium/WebKit pass,0 retry; [Pages41757151403](https://github.com/ndlong78/Pickleball/actions/runs/41757151403) success cùng merge SHA. Evidence HEAD PR mới tại mô tả PR.

## Hành vi

Court giữ đồng hồ đang mở trong RAM như trước. Khi nguồn giáo án là account và own plan/selection đã ACK, có ba thao tác riêng:

- **Tạm dừng và lưu vị trí**: pause trước, ghi phần/giây còn lại/đã kết thúc vào IDB. Có điểm dừng cũ thì xác nhận thay thế bản đang xem. Chỉ báo đã lưu sau transaction complete.
- **Khôi phục điểm dừng**: xem preview phần/giây, xác nhận thay vị trí RAM, đọc lại và kiểm đúng revision/nội dung đã xem, rồi đặt clock **đang dừng**. Không tự chạy, mở wake lock, tạo lượt tập/điểm/attendance.
- **Đọc lại điểm dừng**: chỉ cập nhật preview, không thay vị trí hoặc dừng đồng hồ đang mở. Sau tab khác ghi, cần đọc lại trước khi lưu/khôi phục.

Reload/login/chọn plan chỉ đọc checkpoint, không tự áp vào timer. Không tự lưu mỗi tick/start/next/reset/background/unload. Muốn giữ vị trí mới qua reload phải chủ động bấm lưu; tiến độ RAM sau lần lưu gần nhất chưa có trong điểm dừng. Timer còn dùng deadline wall-clock trong phiên trang như trước, nhưng checkpoint **không lưu running/deadline**. Academy timer vẫn RAM; đây chưa là toàn device state hoặc full backup.

Guest giữ `pickleup_practice_state_v25` và hành vi cũ, không auto-import/mirror checkpoint tài khoản vào V5. Nguồn activity riêng chỉ cấp quyền ghi nhật ký; checkpoint chỉ cần nguồn plan, không mượn consent activity để bật plan. Timer/checkpoint không tự tạo outbox/RPC/check-in hoặc training event.

## Kho và fences

Giữ IDB schema1, tám stores/18 khóa V5, SQL/RLS/protocol và dependencies. Metadata `court-device-id-1` tạo UUID local theo account/browser, dùng chung tabs; không fingerprint hoặc thêm localStorage. `device_state` key `[user:<uuid>,deviceId,'court-checkpoint-1:'+planId]`:

```json
{"localRevision":"1","value":{"schemaVersion":1,"planId":"<own UUID>","epoch":"<sync UUID>","index":1,"remaining":610,"ended":false}}
```

Envelope còn namespace/deviceId/key. Exact fields/types: index0…6, remaining integer trong thời lượng phần `[600,720,720,900,360,300,0]`, ended iff index6; planId/epoch UUID. Không running/deadline/notes/credentials. Corrupt row hoặc identity chặn read/write, không tự ghi trắng.

`getCourtCheckpoint(binding)` / `saveCourtCheckpoint(value,expectedLocalRevision,binding)` kiểm trong cùng transaction metadata/records/sync_cursor/device_state: plan consent enabled/revision; plan/selection localRevision; own live canonical plan; selected_personal_plan_id; epoch của cursor và hai records; không pending/tail/review/tombstone. Đây là gate conservative: pending **result hoặc Academy choice** trong shared plan/selection domain cũng phải sync trước checkpoint, dù một số phần Court còn chạy RAM được. Không nới gate server hoặc ghi trực tiếp bảng.

Save CAS local checkpoint; không LWW hoặc auto-merge. Hai tabs cùng revision chỉ một writer thắng. Tab khác lưu sẽ đánh dấu preview stale, chặn save/restore đến khi đọc lại. Save không ghi qua thông báo stale đã đến trong lúc chờ phản hồi. Quota giữ saved point và clock RAM đã pause; retry giữ frozen value/revision, không đổi sang vị trí RAM mới hoặc cập nhật expectedRevision im lặng. Focus read không tự bỏ failed intent. Conflict cần đọc lại/review/xác nhận thay thế; không retry force. Điểm dừng epoch cũ có preview nhưng không restore; muốn thay bằng vị trí hiện tại phải xác nhận save mới theo epoch hiện hành.

## Vòng đời

`court-checkpoint-runtime.js` là facade riêng, chỉ lazy cùng Court sau clock/plan runtime; Home không nạp thêm. Source/binding đổi đóng scope/abort transaction chưa commit và clear memory/failed intent. Response A đã commit nhưng tới sau B bị generation guard bỏ qua; data disk vẫn của A. Read lỗi cũ không che write mới. Restore bị chặn khi revision/nội dung preview hoặc thông báo external change đổi trong lúc await. Dialog save/restore kiểm token/plan trước và sau confirm; kết quả restore kiểm lại trước chạm timer.

BroadcastChannel chỉ owner/planId, không payload. Focus/visibility fallback đọc kiểm preview mới mà không đổi clock. Không mã hóa IDB hoặc hứa remote wipe; logout giữ own checkpoint disk nhưng clear DOM/memory. Đổi account không mang điểm dừng hoặc pending intent sang account mới.

UI có loading/empty/error/quota/conflict/retry và nhãn local-only. Checkpoint **chưa nằm trong V5/raw rescue hoặc các cache export hiện tại**, có thể mất khi clear/eviction. Không tự purge/xóa checkpoint hỏng hoặc trim các plan cũ; full V6 backup/restore/purge phải bao gồm row/identity này ở lát cắt sau.

## Kiểm chứng và giới hạn

Unit fake-IDB: reopen/owner/no queue, hai connections CAS, consent/plan/selection/epoch fences, quota rollback/retry, strict schema/credential exclusion/corrupt/scope closure. Unit VM: late read error sau write, BC trong restore/save, A→B phản hồi muộn, focus không bỏ failed intent.

Native-IDB/mock Auth/RPC:4 viewports390/820/1180/1440, explicit save/reload/restore, tám route/offline/no RPC/guest bytes, quota frozen retry, two tabs và clock RAM không bị read đè, late A save/re-login, corrupt, advanced ACK/focus fallback. Ca advanced đầu timeout do test route trước async selection completion; chờ status “Đã chọn” trước route/send, không nới timeout/retry/assertion. Mock không là RLS/Auth thật.

Real Auth harness giữ OTP/mail capture/session/private RPC và các luồng cũ, thêm product Court save→reload→không auto-restore→explicit restore paused→logout clear. PWA kiểm upgrade5.11, cache module mới, visited Court offline dưới `/Pickleball/`; clock/checkpoint không cache API/Auth. Exact counts/fail/flaky/retry đúng HEAD ở PR; QA thật tách biệt.

Năm flags Auth/import/sync/activity/plan vẫn false, URL/key trống; review không cần credentials. Build/assets/PWA cache5.12.0 đồng bộ. Không production/DB deployment/public signup/tự merge. Chưa Managed staging SMTP/gateway/delivery, browser expiry theo wall clock, physical/installed-PWA QA, Academy timer persistence, full V6 backup round-trip/purge/profile/Auth recovery/account deletion/restore/importer repair/load. Pilot thật vẫn đóng.
