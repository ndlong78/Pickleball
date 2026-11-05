# PR5b2c1 / V5.13.0 — cứu hộ toàn bộ cache tài khoản trên máy

Nền main `078f98c8f58dc784d10743593ee724585840f61e` sau [#33](https://github.com/ndlong78/Pickleball/pull/33), app5.12.0. Khi bắt đầu không PR mở trùng. [UI42014677077](https://github.com/ndlong78/Pickleball/actions/runs/42014677077):306 unit +512 browser +10 lượt WebKit bổ sung pass,0 fail/flaky/retry. [Backend42014676992](https://github.com/ndlong78/Pickleball/actions/runs/42014676992):275 pgTAP/45 REST và GoTrue/Mailpit/SDK/browser Auth thật hai engines pass; [Pages42014675888](https://github.com/ndlong78/Pickleball/actions/runs/42014675888) success cùng merge SHA. Kết quả đúng HEAD PR mới ở mô tả PR; không tự merge.

## Hành vi và giới hạn

Trong Dữ liệu (`settings`), người đang đăng nhập chủ động đọc cache → xem inventory → tải JSON riêng tư chưa mã hóa. Mở tệp chỉ kiểm cấu trúc, owner và checksum, hiển thị số dòng từng kho; không render payload hoặc suy số buổi đã tập. Tệp đã mở không được tải lại như snapshot mới của máy. Cache chưa đọc/mới reload/đổi account/đang xử lý/lỗi không có link tải cũ.

Đây là **toàn cache hiện có của account trên trình duyệt**, không phải toàn dữ liệu cloud, full account export hoặc backup DB/Auth. Không gọi pull/RPC để làm đầy cache. RAM chưa lưu, Academy timer, legacy guest và phiên đăng nhập không có trong tệp. Backup V5/raw rescue18 keys và các domain exports giữ hợp đồng riêng; không nhập định dạng mới vào importer legacy. Giữ file ngoài browser; clear/eviction vẫn có thể mất dữ liệu trên máy.

**Chưa restore hoặc purge.** Không có API ghi lại snapshot. Checksum chỉ phát hiện hỏng/sửa tình cờ, không là chữ ký tin cậy, bằng chứng ownership hay xác nhận tệp có thể phục hồi. JSON hợp lệ nhưng domain corrupt/unknown vẫn được giữ nguyên để cứu hộ, không tự sửa/normalize/trim. Tệp có dữ liệu không thể biểu diễn JSON an toàn hoặc có dấu hiệu credentials bị từ chối toàn bộ, không redaction âm thầm hoặc bản xuất thiếu.

## Hợp đồng tệp và snapshot

Envelope `app:PickleUp`, `format:account-cache-rescue-v1`, `version:1`, `payload:{exportedAt,snapshot}`, `sha256` SHA256 hex trên canonical payload (keys object sorted, array order giữ nguyên). Snapshot: `owner:<UUID>`, `repositoryVersion:1`, `coverage:local-cache-only`, `stores` có đúng bảy arrays:

| Store | Nội dung giữ nguyên |
|---|---|
| records | Canonical base, local overlay, revisions, tombstones, epoch/review flags |
| outbox | Pending/acked/blocked/sending, frozen request, attempt/replay metadata |
| conflicts | Conflict mở/đã giải quyết, quyết định và các operations gốc |
| sync_cursor | Các protocol/domain cursors, epoch và local version |
| import_receipts | Checkpoints, manifests, source signatures/provenance |
| device_state | Checklist/focus, Court checkpoint và các JSON state chưa hiểu |
| metadata | Device identity, consent revisions, receipts, lease metadata |

Chỉ index namespace `user:<current-owner>`; không đọc guest, localStorage/Auth/session hoặc store `legacy_snapshots` không namespace. Một transaction **readonly** trên cả bảy stores đảm bảo không snapshot record/outbox/cursor ở các thời điểm khác nhau. Cursor đọc không dùng các giới hạn500/1000 của history UI. Giới hạn100.000 rows/32 MiB final; snapshot cursor chặn31 MiB serialized row để dành envelope overhead. Vượt giới hạn: fail toàn bộ, không tệp một phần. Không đổi IDB schema1/tám stores, SQL/RLS/protocol,18 keys hoặc dependencies.

Core kiểm JSON hữu hạn/dense arrays/plain objects, depth40/node1 triệu, đúng envelope/stores/owner, namespace và nested user_id, duplicate primary keys, credential keys/giá trị cả serialized JSON và URI encoding. Credential scan conservative có thể từ chối ghi chú chứa mẫu tương tự token; giữ dữ liệu gốc. Các payload không hợp domain vẫn nguyên; preview không cấp quyền restore.

Controller tách DOM, repository và Auth adapter; subscribe Auth, generation/task serial fences sau snapshot/file read/hash và trước publish. Logout/A→B clear inventory/prepared text, đóng scope hủy transaction chưa commit, revoke Blob URL. Download click kiểm trạng thái hiện tại đồng bộ. Không dữ liệu riêng trong URL filename, console, telemetry, localStorage hay artifacts. Trong cùng JS realm, XSS vẫn có quyền đọc cache: đây không là mã hóa hoặc remote wipe.

## Gate cho bước khôi phục tiếp theo

Cần thiết kế quarantine/preview, kiểm dependency/epoch/domain schema, xung đột với dữ liệu hiện hành và snapshot mới trước ghi; commit atomically hoặc rollback. Không kích hoạt consent/sender lease từ tệp; unknown commit phải giữ nguyên operation ID/frozen request và reconcile trước replay. Device IDs phải có chính sách khi chuyển máy. Kiểm two tabs, quota/abort, native reload/offline/A→B, fresh/stale cloud và importer provenance trước khi mở ghi. Purge chỉ sau preview/export pending và confirmation riêng; không xóa cloud/guest nhầm namespace. Những gate này chưa đạt trong PR5b2c1.

## Kiểm chứng và cấu hình

Unit14 ca: all stores/unknown data/1201 history rows, checksum/tamper/owner/credentials/size/complexity, consistent concurrent snapshot và delayed lifecycle. Browser native IDB + mock Auth: bốn viewports390/820/1180/1440, explicit capture/file preview không ghi/RPC, reload/offline, lỗi và late A→B/logout. PWA kiểm cache modules Settings và offline `/Pickleball/`, upgrade5.12 không mất local data. Real Auth harness kiểm OTP→mail capture→session/private RPC như trước, thêm snapshot dữ liệu thật local có device state/import receipt/conflict, preview read-only và logout clear link. Tệp chỉ ở RAM, không traces/screenshots/video/download artifacts. Mock không là real Auth/RLS; CI local không là Managed staging.

Local Node24:320 unit pass/0 fail; Chromium hệ thống:7 ca rescue mới +6 PWA pass/0 retry. Bundled Playwright install bị CDN403, WebKit và đầy đủ regression/Auth thật chạy bằng Actions.

Review không cần credentials. Auth flag/url/publishable key hợp lệ mới bật control; guest/unconfigured dùng bình thường. Giữ năm flags false, URL/key trống; build/assets/PWA5.13.0. Chưa production/public signup/Managed SMTP/gateway, full restore/purge/Auth recovery/account deletion/operational backup job hoặc physical-device QA. Pilot dữ liệu thật vẫn đóng.
