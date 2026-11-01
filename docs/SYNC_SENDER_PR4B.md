# PR4b — fenced sender, ack và conflict API (chưa nối UI)

Nền main `102857661364cfdb9da2af7035f0fd4c440258f8` sau PR19. [UI sau merge](https://github.com/ndlong78/Pickleball/actions/runs/41304735299):164 unit +290 browser pass, không flaky; [backend](https://github.com/ndlong78/Pickleball/actions/runs/41304735380) và [Pages](https://github.com/ndlong78/Pickleball/actions/runs/41304734738) success cùng SHA. Không có PR mở trùng. Chưa Supabase/SMTP staging được kết nối.

## Phạm vi và rollout

Tiếp nền PR4a với sender standalone chỉ cho user_preferences/practice_checkins. Không page-loader/source switch/conflict UI mới; tám route vẫn dùng V5, Auth/import flags false, không tự import hoặc gửi queue khi login. Caller phải bật callback boolean true, có đúng Auth owner và chủ động sync. Không timer/background worker; budget mặc định25 operation/lượt, tối đa100. Giữ version/PWA5.4.1 vì API chưa nối app; PR tích hợp phải bump cache để client nhận repository/Auth adapter mới.

Chưa sync các events/plans/selections và chưa có export/purge cache V6 hoàn chỉnh; không gọi PR này là pilot đã vận hành. Không provision cloud, sửa production, nới RLS hoặc tự merge.

## Server epoch fence

Migration additive `20261101000100_sync_epoch_fence.sql` thêm private ledger sync_operation_epochs và hai RPC:

- `prepare_sync(p_protocol_version=1)`: tạo head riêng user nếu chưa có, trả epoch/server_revision decimal string; không tạo business record/change. Cần bước này cho tài khoản mới có epoch trước khi freeze request.
- `apply_sync_operation(p_operation_id,p_kind,p_entity_key,p_action,p_expected_revision,p_epoch,p_payload={},p_protocol_version=1)`: epoch UUID bắt buộc, chỉ hai kind. SELECT FOR UPDATE trên cùng sync_heads với mọi writer/import; kiểm epoch **trước** replay hoặc mutation, sau đó gọi operation_core trong cùng transaction. Restore UPDATE head cũng chờ khóa này, nên không có khoảng trống giữa fence và CAS.

Epoch không khớp/no head trả reset_required, không write/receipt mới. Ledger append-only `(user_id,operation_id)` bind epoch + hash toàn request; không rebind UUID cũ sang epoch mới hoặc thay body. UUID đã thuộc receipt legacy/import không được adopt. Core/receipts/CAS/schema validation vẫn dùng hợp đồng PR1a, trả domain status trong HTTP200. Conflict/invalid cũng bind request; retry cùng ID giữ kết quả gốc. Fences không là business changes nên không tạo cursor gap.

Ledger FORCE RLS, user từ auth.uid qua helper đã bind, function owner pickleup_api NOLOGIN/non-BYPASSRLS, search_path rỗng; authenticated không đọc/ghi ledger, anon không execute. RPC role chỉ SELECT/INSERT ledger, không UPDATE/DELETE. Giữ append-only receipts/change log, FK Auth cascade và retention toàn pilot; không GC job. apply_operation/import RPC cũ giữ nguyên để tương thích, **không có fence mới cho legacy caller**; sender mới tuyệt đối chỉ dùng RPC fenced.

## Local state và delivery

Repository schema1 dùng stores đã dành sẵn. Local write + outbox/receipt nguyên tử, giữ snapshot base lúc edit. Overlay hai mutable domain giữ projection mong muốn qua nhiều patch; payload từng operation vẫn riêng và bất biến, không gửi overlay/server-managed fields lên RPC.

`pending/deferred → sending → acked`, hoặc conflict/blocked. Claim kiểm lease namespace/expiry, cursor epoch và dependency trong IDB transaction; lưu toàn request có UUID, expected_revision, epoch và body **trước** network. Deferred chỉ bind expected revision từ predecessor ack, không từ optimistic overlay/latest remote. Một entity bị block thì các operation phụ thuộc giữ nguyên. Domain chưa hỗ trợ không gửi và vẫn được báo pending.

RPC qua Auth adapter syncRpc allowlist riêng, JWT ghim theo snapshot owner/generation, abort/ignore khi đổi account/refresh. Không token trong outbox/conflict/log. A logout/expiry/đổi B đóng scopes/reader; request A có thể đã commit nên giữ sending để A replay sau, không chuyển owner. Lease15s renew mỗi dispatch, release khi còn active; expiry có thể cho hai tab gửi cùng request, receipt server là bảo đảm cuối cùng. Lease không phải security boundary.

Network/401/stale giữ sending/request, backoff exponential+jitter đến60s. Sau8 attempts tự dừng retry; forceRetry boolean true là lựa chọn caller tường minh, dùng **cùng** request. Không có automatic retry loop cho lỗi trong một lượt. Offline/default-off chặn trước I/O. Quota/storage failure không trả synced hoặc xóa intent.

Ack transaction gồm records/outbox/cursor: validate owner/epoch/revision response; đánh ack, cập nhật base, chỉ clear overlay nếu không có edit mới hơn. Không regress base nếu remote đã mới hơn ack cũ. Cursor afterRevision không nhảy qua changes chưa đọc; chỉ tăng cursor localVersion để invalidate pull đang bay, rồi kéo delta sau vòng gửi. Receipt replay/ack lặp idempotent. Ack rollback do quota để request sending, retry receipt khôi phục.

PR4a reviewRequired không được tự rebase: unsent intent thành conflict; sending cùng epoch vẫn được replay để xác định kết quả sau timeout. Epoch khác hoặc reset_required block request cũ và full-bootstrap giữ queue. Không tự đổi epoch trong request đã freeze.

## Conflict API — UI nối ở PR sau

inspectSyncConflict trả original base/current record/local intent, remote hiện tại, cursor và cả operation chain. resolveSyncConflict yêu cầu localRevision + remoteRevision + epoch của preview, một UUID quyết định mới và mode server/local; local còn cần action/payload cụ thể. Không force/LWW, kể cả hai field khác nhau. User chọn local tạo operation mới với CAS hiện tại, có thể conflict lại nếu writer khác đã sửa.

Resolve server chỉ bỏ active intent sau khi archive; không ghi server. Cả hai mode giữ snapshot local/remote và nguyên requests cũ trong resolved conflict, không mất bản chưa chọn. Transaction resolution lưu operation mới/metadata/record/archive nguyên tử; cùng decision ID/body replay được, thay quyết định phải ID mới. Không resolve operation đang sending chưa biết kết quả. Sau cache/epoch reset bắt buộc acknowledgeEpochChange=true để xác nhận review trước khi tạo quyết định mới; không sửa request cũ. UI tương lai phải thể hiện uncertainty và đưa lựa chọn/export rõ ràng, không tự truyền confirm này.

Done/skipped/clear đều CAS; clear là tombstone, put không tự sống lại, restore cần action riêng. Không infer attendance từ scores/timer. Ngày literal/timezone do caller đã xác nhận; validators/UI domain và policy consent còn gate tích hợp. RPC constraints là lớp chặn cuối, không normalize silent.

## Kiểm chứng và giới hạn

Unit fake IDB/model RPC: dependency binding, timeout/restart/exact replay, disjoint-field whole-entity conflict, local/server choice archives, conflict lại sau resolve, epoch change, A→B late write, lease expiry replay,401/backoff/ceiling/explicit retry, ack/resolution quota rollback, malformed owner, default-off/offline. Transport test pin JWT/allowlists. Đây không là RLS/Auth security evidence.

Native IDB Chromium/WebKit với mock RPC: actual reload pending request, deferred ack, conflict archives, default-off/epoch block/A-B isolation và quota rollback. Private fixtures không trace/screenshot/video; PWA/regression suites giữ nguyên.

Backend pgTAP mới kiểm ACL/FORCE RLS/owner, epoch/receipt binding/old UUID/new epoch, CAS, owner injection/B separation. REST thêm6 tests, gồm hai writer và transaction giữ row lock rồi đổi epoch: writer cũ đợi lock, sau commit phải reset_required dù revision vẫn khớp. Đây là **mô phỏng đổi epoch local**, không restore drill backup thật. Giữ9 REST +14 import +Auth/OTP suites cũ.

Real-browser GoTrue/Mailpit/RPC trên hai engines: giữ pending sau PR4a → resolve qua API → fenced commit →502 sau commit → reopen controller/database → replay đúng body và một revision; B gửi preferences riêng, không nhận queue A. UI signup/import/logout thật giữ nguyên; sender/conflict APIs được test harness gọi trực tiếp, **chưa UI sync**. Gateway public alias local là fixture, không Managed publishable gateway/SMTP staging. Không thêm recipient ngoài sáu synthetic accounts hiện hữu, không Auth artifacts/log payload.

Exact HEAD/counts/fail/flaky ở PR. Chưa staging SMTP/Managed gateway, operational restore/deletion drill, physical devices, near-cap/load/quota eviction, cache export/purge/GC, UI resolve/source switch, background scheduling hoặc các domain PR5. Không rollout dữ liệu thật trước các gate backup/privacy/repair/consent; không production credentials hay DB reset cloud.
