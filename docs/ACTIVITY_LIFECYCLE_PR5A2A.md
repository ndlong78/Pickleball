# PR5a2a — consent, vòng đời và review sự kiện

Nền main `04afddefecb06504ce7e32ffcc4d5fd2b02b4a5b` sau #23. Không PR mở trùng khi bắt đầu. #23 chỉ Markdown: push backend/responsive không chạy do path filter; [Pages](https://github.com/ndlong78/Pickleball/actions/runs/41382682675) success đúng merge SHA. [CI PR #23](https://github.com/ndlong78/Pickleball/pull/23) và main code #22 đã có clean evidence trong [bản rà soát](V6_PROGRESS_REVIEW.md).

## Phạm vi

Thêm `modules/data/activity-controller.js` **standalone**, chưa được page-loader hoặc UI gọi. Đây là API nền trước lát cắt Academy PR5a2b; chưa màn hình consent/review sự kiện hoặc chuyển nguồn điểm/đánh giá/nhật ký/trận đấu. Giữ app/build/cache5.5.0,8 route,18 khóa V5 và IDB schema1; default hai mutable domains không đổi. Shared APIs chỉ thêm options mặc định null; module mới kiểm capability `activityLifecycle`/`ACTIVITY_LIFECYCLE` để từ chối bundle cũ thiếu consent fence. PR nối runtime/UI phải bump build/assets/cache.

Auth/import/sync flags vẫn false. Controller có `enabled` callback riêng mặc định false; caller tương lai phải cấp flag riêng cho activity, không dùng opt-in preferences/check-in để cho phép events. Không provision, production, public signup, background scheduler hoặc tự merge; không đổi SQL/RLS/RPC/grants.

## Consent và lifecycle

Consent `activity-consent-1` trong metadata theo user UUID gồm enabled + decimal localRevision; mặc định false/rev0. `setActivityConsent(enabled, expectedLocalRevision)` dùng local CAS. Bật/tắt/bật lại tăng revision để một tab cũ không tiếp tục dùng consent trước đó. Metadata này không cấp quyền server hoặc thay RLS.

`useAccount()` là thao tác rõ ràng: lưu consent, prepare_sync và pull policy activity-events-1; chưa gửi queue. Login/reload nhận consent đã lưu chỉ đọc cache, không RPC hoặc auto import/sync. `createEvent`/`deleteEvent` validate typed payload, yêu cầu bootstrap và lưu record+outbox trước khi báo saved_locally; IDs command/entity/client_event phải được caller giữ ổn định. Retry cùng local command trả receipt, đổi payload cùng command bị reject. Chỉ `sync()` gửi; `forceRetry:true` vẫn không bỏ lease/CAS/receipt.

Network wrapper kiểm consent revision trước/sau RPC. Repository kiểm cùng revision trong transaction write, claim, ack và canonical commit; revoke đồng thời không thể tạo ack/cache mới bằng consent cũ. Shared pull/sender nhận option activityConsentRevision từ controller; các API nền PR5a1 vẫn tương thích, không tự có consent chỉ vì gọi raw sender. Consumer phải dùng lifecycle này hoặc thực hiện đầy đủ hợp đồng consent.

`useDevice()` được phép dừng cả thao tác đang chạy: tăng generation, đóng scope/reader/sender, xóa projection/memory trước await, ghi consent=false. BroadcastChannel riêng chỉ gửi type+owner UUID; tab nhận đọc lại IDB, hủy source khi consent revision đổi. Auth A→B/logout cũng clear ngay và bỏ phản hồi cũ; queue/consent/cache A không sang B. Reentrant state callback được guard trước mọi tác vụ tiếp theo. Không cam kết hủy server commit đã xảy ra; frozen intent giữ nguyên để đối soát. Lease advisory còn có thể tồn tại tới15s khi hủy sender; trả busy rồi thử lại sau expiry, không force chiếm lease.

Lỗi cache làm mode error, không fallback ghi V5. `refresh()` chỉ đọc nếu consent đã bật, full reset khi phục hồi cache lỗi, giữ pending. Export chủ động vẫn đọc raw activity cache khi source lỗi hoặc đã opt-out; không parse/normalize rồi làm mất intent hỏng. Flag off vẫn chặn lifecycle APIs, giữ IDB nguyên; full V6 recovery độc lập rollout flag là gate backup của PR5b2.

## Review nguyên tử và ba quyết định

`previewReview(kind,id)` đọc record, các operation chưa terminal, open conflicts, cursor và consent trong một transaction. `resolveReview(view, mode, {operationId, acknowledgeEpochChange})` so lại **toàn bộ preview**, gồm outbox request/state và cursor localVersion, không chỉ row revision. Tab khác claim/pull/ack/revoke hoặc sửa local làm stale decision bị từ chối. Không tự đọc lại rồi áp dụng quyết định cũ vào bản mới.

Mọi chain có operation `sending` đều báo uncertain_operation: phải replay đúng request trước khi bỏ/đổi quyết định, kể cả canonical pull đã thấy row. Malformed ack/network/401 không biến thành kết quả terminal. Sau epoch đổi, sender xác định request cũ không còn thực thi được, block và giữ nguyên body; review yêu cầu xác nhận epoch đổi trước cả giữ server hay tạo command mới.

| Mode | Điều kiện và hiệu ứng |
|---|---|
| `server` | Giữ canonical hiện tại (kể cả missing/tombstone), bỏ overlay khỏi view; archive toàn bộ intent/requests trước khi mark resolved. Không write server |
| `retry_create` | Chỉ khi canonical entity còn missing, local intent cuối là create và payload còn typed hợp lệ. Command mới/CAS0, **giữ nguyên entity UUID, client_event_id và payload**. Không recreate khi server đã có row hoặc tombstone, không update/restore event |
| `retry_delete` | Chỉ khi intent cuối là delete và server hiện có row live. Command mới/delete theo đúng canonical revision đã preview; có thể conflict lại. Không gửi lại create trước đó hoặc sửa nội dung sự kiện |

Decision transaction archive original base/local/remote/chuỗi requests + mark các operation/conflict cũ resolved + queue command mới nếu cần + đổi row/cursor/receipt nguyên tử. Replay cùng decision operationId/view là no-op; không tái sử dụng UUID cũ cho quyết định khác. Request cũ không bị sửa body/epoch; command mới chỉ có sau lựa chọn rõ ràng. Concurrent server write sau preview vẫn bị CAS server chặn.

Chưa có UI sửa payload invalid hoặc tạo correction/new identity; user có thể export/bảo toàn rồi giữ server, không tự normalize dữ liệu lỗi thành event khác. Tombstone bất biến không có restore. Các archive giữ nguyên suốt pilot, chưa retention/GC job.

## Export và kiểm chứng

`exportCache()` trả `activity-events-cache-v1`:4 kinds, bases/overlays, outbox/frozen requests, conflicts/decision archives, cursor và consent. Không gồm mutable domains, Auth/session/import checkpoint, V5 hay device state; **chưa importer/round-trip hoặc backup toàn account**. Từ chối export nếu gặp field tên credential trong cache hỏng. File vẫn private; giữ ngoài browser an toàn.

Unit fake-IDB/model kiểm consent CAS/ABA, write/claim/ack/pull fences, append/delete, replay trước review, epoch repair giữ stable identity, terminal conflict/tombstone, full-preview stale check, quota rollback, A→B/reentrant, malformed cache recovery và export exclusion. Native-IDB/BroadcastChannel Chromium/WebKit với mock RPC kiểm revoke giữa tab, reload replay, explicit epoch decision qua reload, quota archive rollback và A→B khi response đến muộn. Không gọi model/mô phỏng restore là bằng chứng vận hành restore thật.

Backend CI giữ241 pgTAP/37 REST, Supabase local/GoTrue/Mailpit thật. Browser integration giữ toàn bộ PR4c/PR5a1; thêm activity lifecycle A→B, B consent riêng, real RPC HTTP200 conflict/giữ server, create+deferred delete được review rồi CAS delete, commit-loss→opt-out/opt-in→replay đúng request. Cùng recipients/quota OTP, không thêm admin DML, log payload/token/OTP hoặc Auth artifacts. Publishable gateway alias local vẫn fixture; đây chưa event product UI.

Local browser install vẫn CDN403; unit chạy Node24, full browser/Supabase kiểm trong Actions. Counts/fail/flaky/URLs đúng HEAD cuối ở PR trước ready review. Chưa staging SMTP/Managed gateway, physical devices, expiry browser theo wall clock, restore/Auth recovery/deletion/backup drill, near-cap/load/eviction hoặc rollout thật. Bước tiếp theo là source/consent/review UI Academy PR5a2b với bump build/cache; gate pilot vẫn đóng theo [policy](PILOT_OPERATING_POLICY.md).
