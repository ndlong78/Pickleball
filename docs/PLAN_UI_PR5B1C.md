# PR5b1c / V5.8.0 — UI giáo án và lựa chọn cá nhân

Nền main `1a4fccd134c56631fa94a009b5f0c9f613f38e33` sau [#28](https://github.com/ndlong78/Pickleball/pull/28), app5.7.0. Không PR mở khi bắt đầu. [Main regression41574687398](https://github.com/ndlong78/Pickleball/actions/runs/41574687398):267 unit+406 browser+5 WebKit rescue+5 WebKit font,0 fail/flaky/retry; [backend41574687566](https://github.com/ndlong78/Pickleball/actions/runs/41574687566):275 pgTAP/45 REST, real GoTrue/Mailpit/SDK/browser Auth Chromium/WebKit; [Pages41574686687](https://github.com/ndlong78/Pickleball/actions/runs/41574686687)success cùng merge SHA.

## Phạm vi và cấu hình

Nối client [PR5b1b](PLAN_CLIENT_PR5B1B.md) với UI basic/advanced Coach, personal selection, Court, Journey và Settings review/management. Thêm flag riêng `PICKLEUP_PLAN_CONFIG.enabled=false` trong `modules/data/plan-config.js`; **năm flags Auth/import/sync/activity/plan đều tắt**, URL/publishable key rỗng. Không dùng consent activity hoặc preferences để bật plan. Không staging/production, public signup hoặc tự merge. Review PR không cần cấu hình hay credentials mới.

Bump đồng bộ package/lock/build/assets/cache5.8.0 để tránh dùng repository/adapter cũ thiếu plan lifecycle. Giữ8 route, IDB schema1, SQL/RLS/grants/protocol1 và18 khóa V5. Home không nạp domain modules hoặc SDK. Khi thiếu Auth URL/key hoặc flag tắt, UI dùng guest; không fallback guest khi account source đang loading/error. Runtime capability guard từ PR5b1b giữ upgrade_required với bundle không phù hợp.

## Một nguồn cho giáo án cá nhân

`plan-runtime` cung cấp history/selected/current revision/source token và operations qua controller, không có Supabase calls ở UI. Mọi personal-plan reader đã chuyển: basic/advanced Coach, Court/pending selection trong loader, Journey; Progress nhận thông báo nguồn và nhật ký vẫn device-only. Backup V5/raw rescue/importer giữ đọc legacy trực tiếp, không qua facade và không nhập account ngược về18 khóa.

| Vùng UI | Hành vi |
|---|---|
| Coach cơ bản/nâng cao | Tạo immutable snapshot từ sáu điểm người dùng nhập; UUID entity/command riêng. Không tự copy điểm từ nguồn khác. Tạo chỉ lưu local, không tự chọn hoặc gửi. Chọn plan trong history là command riêng, có thể chờ plan ACK. Result patches CAS0–20 + completed_at; không auto-append training/check-in |
| Lịch sử Coach | Account phân trang6, không cap100/trim theo guest. Preview có thể là pending, nhưng nút Court chỉ mở khi đúng plan đã chọn và cả plan/selection đã ACK. Guest giữ logic/caps/keys cũ |
| Journey | Đọc personal selection qua cùng facade, không dùng plan khách để báo account đã sẵn sàng. Check-in vẫn thủ công, policy/timezone riêng |
| Court | Chỉ dùng selectedPlan ready từ projection. Không lấy plan cũ thay cho pending/orphan/tombstone/loading/error. Account timer chỉ RAM theo phiên trang, giữ khi chuyển route, reset khi reload/đổi nguồn/owner; không ghi vào key timer V5. Wake lock và fields/DOM cũ bị clear khi source đổi. Ghi drill vào nhật ký guest bị chặn cho account plan; training UI chờ PR5a2d |
| Settings | Consent riêng, read/send/retry/export rõ ràng, pending/unknown outcome, bỏ chọn, xóa/khôi phục và review. Nút opt-out được dừng tác vụ; giữ queue đúng owner, không tự xóa cache |
| Bài Học viện gần nhất/checklist/nhật ký | Vẫn **trên thiết bị** và được ghi rõ. Lát cắt này chỉ chuyển `selected_personal_plan_id`; không chuyển reader/writer `selected_academy_lesson_id` hoặc legacy lesson key. Sparse personal-selection patch giữ nguyên field server còn lại |

Input/draft/status/card cũ clear theo owner/mode/consent token; phản hồi đang chờ không được render sau đổi A→B. Source token cũng guard delayed chuyển trọng tâm Matches→Coach. Local/remote updates cùng source refresh cards/history và selection; result draft đang nhập giữ expectedLocalRevision lúc bắt đầu edit, không tự ghi trên revision mới hơn. Quota giữ input/intent; create retry cùng input giữ UUID/body local trước khi xác nhận lưu. Account completion không mirror điểm hoặc tự tạo lượt mới trong training log khách.

## Đồng bộ, quản lý và review

Login/reload/focus/BroadcastChannel chỉ đọc cache/source, không auto import hoặc RPC; `useAccount` mới prepare/pull, nút đồng bộ mới gửi queue. Selection chờ plan ACK; clear selection phải ACK trước delete plan. Server race vẫn có thể conflict/invalid trong HTTP200; UI chỉ báo synced khi sender xác nhận, không coi HTTP200 là success chung. Unknown commit giữ request và nút retry, không cho resolve trước replay. Epoch/receipt/CAS giữ hợp đồng PR5b1a/b.

Settings quản lý10 plan/trang, gồm tombstone. Xóa/khôi phục có confirm và captured local revision/source guard. Không cascade selection/history; muốn xóa plan đang chọn phải bỏ chọn trước. Restore chỉ sau tombstone được ack; không put để phục sinh. User-selections singleton tombstone/import repair vẫn qua review API, không tự bỏ field khác.

Review hiển thị ban đầu/ý định/bản tài khoản, có nội dung snapshot/điểm đầu vào mở rộng bằng textContent. Có lựa chọn giữ server hoặc gửi ý định hợp lệ bằng command mới/CAS hiện tại; không sửa immutable snapshot. Xóa/restore và epoch reset cần xác nhận rõ; gửi chưa rõ outcome chặn decision. Preview CAS bao gồm related records/operations nên sửa plan/selection ở tab khác đòi xem lại. Archive giữ original/local/remote/frozen requests, không LWW hoặc đổi epoch âm thầm.

Export `plans-selections-cache-v1` giữ cache/queue/review, riêng tư, chưa round-trip hoặc backup toàn V6; V5 export không chứa account. Không purge/GC/encryption/retention automation. Canonical và optimistic metadata khác owner/entity bị fail closed trước projection ra UI.

## Kiểm chứng và giới hạn

- Unit mock/fake-IDB: runtime default-off/no automatic RPC, ACK readiness/current results, legacy bytes nguyên, token/selected event clear khi A→B; typed projection từ chối metadata chéo owner. Giữ toàn bộ tests PR5b1b.
- Native IDB/mock Auth/RPC: UI390/820/1180/1440, basic/advanced create/select/results, pending vs ACK/Journey/Court, route/reload/session-only timer, network commit-loss replay, source A→B/late read/draft clearing, quota input, real CAS model review, clear/delete/restore và >100 history pagination. Đây không RLS/Auth thật; trace/screenshot/video tắt riêng private fixture.
- PWA regression: nâng từ cache5.7, asset versions5.8, visited plan runtime/direct Court offline/default-off, giữ dữ liệu local và tránh cache API/Auth. Không tuyên bố private API dùng được offline.
- Auth integration chuẩn CI: real GoTrue/Mailpit/SDK/browser Chromium/WebKit giữ toàn bộ suite cũ; thêm **product UI** basic/advanced plan consent/create/choose/ACK/Court/result, dependency delete/restore và HTTP200 result conflict preview/local decision/retry, không legacy mirror/attendance. Không token/OTP/private payload vào logs/artifacts, chỉ phase/outcome metadata.
- Local Node24 unit và Chromium hệ thống154; browser chuẩn trước đó CDN403, Chromium/WebKit chuẩn và Supabase Auth thật lấy evidence đúng HEAD trong PR. Không đồng nhất mock, CI local stack và Managed staging.

Chưa staging SMTP/delivery/Managed gateway, browser expiry theo wall clock, physical devices/field QA, account training UI, Academy account lesson selection, full V6 backup round-trip/purge/importer repair/operational restore/Auth recovery/deletion/near-cap load. Timer RAM tài khoản cố ý không resume sau reload; persistence device_state cần lát cắt riêng có kiểm chứng. PR5a2d sẽ nối training UI với own acknowledged plan; PR5b2/PR6 vẫn là gate trước pilot dữ liệu thật.
