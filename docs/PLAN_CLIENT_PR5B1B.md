# PR5b1b — client giáo án/lựa chọn, chưa nối UI

Nền main `df223373fd7db248ee214ff3ef668c115abd91d6` sau [#27](https://github.com/ndlong78/Pickleball/pull/27), app5.7.0. Không PR mở khi bắt đầu. CI sau merge cùng SHA sạch: [responsive41569387410](https://github.com/ndlong78/Pickleball/actions/runs/41569387410)244 unit+394 browser+5 WebKit rescue+5 WebKit font,0 fail/flaky/retry; [backend41569387397](https://github.com/ndlong78/Pickleball/actions/runs/41569387397)275 pgTAP/45 REST và GoTrue/Mailpit/SDK/browser Auth thật Chromium/WebKit; [Pages41569386663](https://github.com/ndlong78/Pickleball/actions/runs/41569386663)success. [RPC PR5b1a](PLAN_RPC_PR5B1A.md) đã merge, chưa triển khai staging/production.

## Phạm vi và cấu hình

`plan-core.js`/`plan-controller.js` standalone bổ sung typed projection, consent, local-first commands, dependency, sender và review API cho personal_plans/user_selections. Shared repository/pull/sender nhận policy mới `plans-selections-1`, không mở rộng hai policy cũ sang plan. **Chưa UI/source/runtime wiring hoặc truyền plan sang Court/Journey/Progress.** Giữ tám route, app/build/assets/cache5.7.0,18 khóa V5, IDB schema1, SQL/RLS/grants không đổi. Không cần credentials hoặc cấu hình mới để review; cả bốn flags Auth/import/sync/activity false, URL/key rỗng. Không tự merge, production hoặc public signup.

Module mới chưa có trong page-loader/shell. Consumer sau phải dùng flag plans riêng mặc định off và bump app/build/assets/cache đồng bộ; không dùng consent của preferences/check-ins hoặc activity. API kiểm planLifecycle/PLAN_LIFECYCLE=1 ở repository/pull/sender và planRpc trong Auth adapter; bundle cũ bị upgrade_required thay vì fallback sang writer legacy.

## Consent và lưu trên thiết bị

`plans-selections-consent-1` metadata theo user: enabled + decimal localRevision, mặc định false/rev0. CAS mỗi lần bật/tắt, kể cả ABA. Login/reload chỉ nhận consent/cache đã lưu, không RPC, import, tạo plan, chọn plan hoặc gửi queue. `useAccount()` là prepare/pull rõ ràng; `sync()` mới gửi. `useDevice()` tăng generation và clear projection trước await, giữ cache/queue trong namespace cũ. BroadcastChannel chỉ báo type+owner để tab khác đọc lại IDB, không gửi payload hoặc gọi RPC tự động.

`createPlan`, `updateResult`, `select`, `deleteEntity`, `restoreEntity` validate trước ghi. Caller giữ entity/operation UUID và expectedLocalRevision ổn định cho retry; record+outbox+local receipt commit nguyên tử. Payload clone trước await, không coalesce request. Result patch merge vào optimistic overlay, không làm mất immutable content qua nhiều edit offline. Update/restore chỉ nhận check_score/completed_at; không tự lấy snapshot.checkScore làm kết quả mới. Restore phải chờ tombstone được ack, không tự phục sinh bằng put. Các commands không tạo training entry hoặc attendance.

Consent revision được kiểm trước/sau RPC và **trong transaction** write/claim/ack/canonical commit/review. Revoke giữa request có thể xảy ra sau server commit; không ack bằng consent cũ, giữ frozen sending để đối soát khi user bật lại. A→B/logout/expiry clear memory và đóng scope ngay; queue A không thành queue B. Cache lỗi chặn source, không fallback V5. Raw export vẫn dùng được khi payload không hợp schema hoặc opt-out; field credential bị từ chối.

## Projection và dependency

Typed validators tuân schema PR1a: basic1.0–3.0/six skills, advanced3.0–4.0/six advanced metrics, snapshot≤64KiB, payload≤256KiB, body keys/UUID/revision string/date/scale/nullable fields kiểm rõ. Không dùng validateList cap100 của guest. Canonical rows phải cùng owner và đúng entity UUID; results được phủ vào **derived presentation** riêng, không sửa plan_snapshot.

Plan/selection có cursor, lease và policy riêng; bootstrap không bỏ qua dữ liệu chỉ vì hai cursor cũ đã đi xa. Full pull bounded/atomic, không trim history khi đạt cap. Projected cache budget16MiB, review snapshot4MiB và pull≤10050 changes giữ lỗi rõ/queue nguyên; load gần cap chưa benchmark. Export cache không bị giả là dữ liệu đã sync.

- Selection trỏ plan mới/restore đang pending: queue giữ dependency operation ID; sender đợi ACK trước khi freeze selection. Target missing/deleted/review bị từ chối. Projection phân biệt none/pending_plan/pending_selection/unavailable/needs_review/ready; chỉ ready trả selectedPlan, không dùng giáo án trước đó thay thế.
- Plan đang được lựa chọn ở local view không được xóa. Caller clear hoặc đổi selection trước; nếu server base vẫn trỏ plan, lệnh delete phụ thuộc ACK của selection đó. Không cascade hay sửa lịch sử training.
- Dependency blocked/resolved, target bị xóa/review hoặc selection server còn trỏ plan: unsent command thành dependency_changed để review, không treo mà báo synced. Writer từ thiết bị khác vẫn có thể thay selection sau kiểm client; RPC PR5b1a từ chối trong transaction, intent được giữ để clear/review lại.
- Frozen sending **không** kiểm dependency mới rồi đổi request: phải replay UUID/body cũ để biết kết quả. Epoch fence server là bảo đảm cuối; lease15s chỉ advisory. Retry/backoff/budget/quota và malformed ACK dùng cơ chế PR4b; không background scheduler, không đổi epoch/UUID âm thầm.

## Review API

`previewReview(kind,id)` đọc record/active chain/open conflicts/cursor/consent và toàn bộ records/active operations của plan policy trong một transaction. Quyết định so toàn preview: tab khác sửa selection/target, claim/ack/pull hoặc revoke làm stale decision bị từ chối. Bao gồm dependency context để quyết định không áp vào plan/selection khác phiên bản.

`resolveReview(view,'server'|'local',{operationId,action,value,acknowledgeEpochChange})` archive original base/local/remote, chuỗi requests và dependency context trước mark resolved/queue command mới. Transaction archive+outbox+record+cursor+receipt nguyên tử; cùng decision UUID/body replay được, đổi decision phải UUID mới. Sending chưa rõ outcome báo uncertain_operation và phải replay trước. Epoch đổi cần acknowledgement rõ cho cả hai modes.

Server mode giữ canonical, không ghi remote. Local mode nhận action/payload đã review và CAS theo revision mới nhất; vẫn có thể conflict lại. Create chỉ khi missing; tombstone cần restore rõ ràng. Không gắn kết quả cũ lên canonical plan có snapshot khác sau restore; chỉ có thể giữ server hoặc tạo giáo án khác bằng thao tác riêng ở UI sau này. Failed immutable/dependency receipt không tự đổi thành success; review tạo command mới. Pending dependency bị bỏ khi giữ server sẽ yêu cầu review ở children.

`plans-selections-cache-v1` export giữ raw records/base/overlay, outbox/frozen requests, conflicts/decisions, cursor/consent. Không gồm Auth/session, device_state,18 keys V5, import checkpoints hoặc các policy khác. File private, **chưa importer/round-trip hoặc backup đầy đủ V6**. Không purge/GC/retention job.

## Kiểm chứng và phần còn thiếu

- Unit fake-IDB/model: typed basic/advanced, >100 plans, consent/cursor/lease riêng, deferred result patches, dependency ACK order, remote delete/reselect race, frozen replay trước review, full-preview CAS, conflict/archive/epoch repair, snapshot mismatch, malformed ACK, quota rollback, A→B/opt-out và credential exclusion. Model không chứng minh RLS/Auth.
- Native IDB/BroadcastChannel:6 scenarios mỗi Chromium/WebKit, reload/offline, exact replay, conflict/quota decision, revoke giữa tab khi server đã commit, A→B muộn, expired advisory lease và clear/delete/restore. Fixture mock RPC, không Auth thật; trace/screenshot/video tắt riêng fixture, các PWA suites cũ giữ nguyên.
- Real Supabase local GoTrue/Mailpit/SDK/browser harness: cùng recipients/quota hiện hữu, thêm standalone plan client A pending→B riêng consent, native reload không auto RPC, mất reply sau commit/replay trước selection, result conflict với local/remote/archive và clear/delete/restore dependency qua RPC thật. **API integration, chưa plan product UI**; không log token/OTP/private payload hoặc Auth artifacts.
- Local Node24 unit;6 native cases qua Chromium hệ thống154. Browser chuẩn tải tại executor bị CDN403, full Chromium/WebKit và Supabase Auth thật lấy evidence CI đúng HEAD cuối trong PR. Không gọi fallback/mock là staging.

Chưa Managed staging/SMTP deliverability, browser expiry/auto-refresh theo thời gian thực, physical devices/field QA, full V6 backup/purge/importer repair/operational Auth restore/deletion/load. Tiếp theo UI plans/selections và toàn bộ reader/writer Coach/Court/Journey/Progress có nhãn nguồn, kiểm timer/legacy/account isolation và bump cache; rồi training PR5a2d gắn own acknowledged plan. Pilot thật vẫn đóng theo [policy](PILOT_OPERATING_POLICY.md).
