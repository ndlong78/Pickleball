# PR5b2c2b / V5.17.0 — UI dọn cache sạch và đăng xuất

Baseline main `da28b27cd22e92518146f47a84da3f712b662d3c` /5.16.0 sau #44; không PR mở trùng. Main UI43121745320:372 unit/586 browser +40 lượt bổ sung,3 HTTP/1 Workers; backend43121745369:300 pgTAP/48 REST/GoTrue-Mailpit thật hai engines;0 fail/flaky/retry. Pages43121744114 và Cloudflare Production build1da41b81 cùng merge SHA success. Không dùng baseline thay CI HEAD của PR mới.

## Luồng người dùng và gate

Trên đúng staging origin/project/key hiện có, Dữ liệu có nút mở chế độ bảo trì. Entry reload toàn trang, cảnh báo lưu timer/form/RAM trước; URL mới `?page=settings&maintenance=account-cache`, không `pilot`. Sync/activity/plan/import configs đều false. URL thường/preview/production/unconfigured không mở UI purge; không thay login thành auto sync/import.

1. Đăng nhập đúng tài khoản; xem email trong mục Tài khoản. Đóng mọi cửa sổ/tab PickleUp khác của cùng browser, kể cả PWA và trang khác đường dẫn cùng origin.
2. Đọc cache từ bảy stores namespace hiện tại, tạo cứu hộ chỉ trong RAM. Chỉ hiển thị số dòng/blockers, không payload. Có pending/unknown/conflict/import dở vẫn xuất cứu hộ được nhưng không cho dọn.
3. Bấm tải tệp, tự giữ tệp riêng ngoài browser và tick xác nhận. Ứng dụng chỉ chứng minh đã yêu cầu tải, không biết OS đã lưu thành công. Tệp plaintext chưa nhập lại được, chưa toàn cloud/DB backup; checkpoint/checklist/focus chỉ trên máy có thể mất khỏi browser sau xóa.
4. Bấm **Xác nhận dọn cache và đăng xuất**. Online, preflight worker/tabs trước native confirmation. Lease được acquire sau confirmation để hộp thoại không làm hết TTL; sau đó đọc lại toàn snapshot, blockers và Auth identity.
5. SDK logout local thành công: nguồn/DOM/RAM/file links cũ được đóng theo Auth lifecycle; mới gọi primitive snapshot CAS/generation fence. Logout lỗi/network/offline không purge. Quota/abort rollback toàn transaction.
6. Thành công chỉ còn bốn metadata rows (generation + ba consent off), trở về guest. Không xóa guest18/localStorage khác, cache B, legacy rescue, Auth identity hay rows cloud. Đăng nhập lại/chọn nguồn/đọc lại là lựa chọn riêng; device-only state đã xóa không có cloud để tự khôi phục.

Không force erase pending; hãy đồng bộ/đối soát rồi đọc/xuất tệp mới. Không tuyên bố secure erase, remote wipe hoặc xóa tài khoản.

## Quiesce và phiên đến muộn

Dedicated mode reload đóng source/timer cũ. Auth controls khóa trong operation; adapter vẫn phản ứng session change từ SDK. Preview/download/ack bind owner + generation + nonce. Đổi A→B, bất kỳ login mới trong logout, route/pagehide hoặc worker/lease mất hiệu lực đóng scope/revoke BlobURL; response A không tạo file/success dưới B. Logout/request đã gửi không thể thu hồi, không hứa hủy RPC từ server.

Worker protocol1 chỉ public metadata qua MessagePort. DB riêng `pickleup-maintenance-v1`/VERSION1, store `lease` key `active`, chứa WindowClient ID/UUID/cache release/deadline/expires, không user/session/payload. Reserve trước enumerate tất cả cửa sổ includeUncontrolled; SDK connect hỏi status trước import/createClient. Cửa sổ có từ trước làm begin fail, cửa sổ mới bị chặn SDK. Renew3s, TTL15s, deadline tối đa60s; persisted lease sống qua worker restart. Sai cache/unknown storage/không worker hiện hành thì UI purge fail closed. Không fetch intercept Auth/API mới. Không chống XSS/OS/manual client ngoài ứng dụng.

Normal Auth không worker vẫn dùng được. Nếu worker đã đăng ký nhưng cũ, không phản hồi hoặc coordination storage không dùng được, Auth gate chặn khởi tạo SDK; guest vẫn hoạt động. Cập nhật/đóng tab/tải lại khi bảo trì kết thúc, không xóa browser storage làm workaround. Ancestor worker `/sw.js` có thể gate normal Auth dưới `/Pickleball/`; purge cần đúng worker kiểm soát đường dẫn.

## Dữ liệu và rollback

`pickleup-v6` VERSION3 giữ nguyên tám stores/key paths/indexes, nâng1/2→3 kiểm layout trước, preserve mọi dòng/generation. Đây là capability fence ngăn repository2 thiếu Auth gate mở lại. `onversionchange` đóng scope/connection, blocked thì yêu cầu đóng/cập nhật tab cũ. Không downgrade schema hoặc xóa DB; nếu cần tắt UI, ship config-off trên repository3 tương thích. Không sửa server/RLS/migrations/RPC protocol1/18 keys guest.

Rescue vẫn account-cache-rescue-v1/envelope1, đọc snapshot repositoryVersion1/2/3, chỉ preview. File không cấp quyền purge; chỉ snapshot vừa đọc từ máy + Auth user hợp lệ được dùng CAS. Primitive fence không tự hủy server request; UI phối hợp trước logout/commit như trên.

## Kiểm thử và giới hạn

Unit fake-IDB kiểm controller owner/generation/confirm/logout failure/late hash/account switch/lease loss/quota rollback; worker persisted lease/restart/expiry/malformed storage; host gate trước SDK import; exact-origin/mode config; nâng DB2→3 giữ rows/generation và file2 vẫn đọc được.

Native IDB/SW với mock Auth: bốn viewport390/820/1180/1440, actual download chỉ dữ liệu fixture và xóa tệp tạm, giữ B/guest, pending/offline/cancel, tab cũ/tab mới chặn SDK, route/hash A→B/disabled mode. Không gọi mock là Auth integration. Local Chromium pass; WebKit cần CI vì thư viện hệ thống máy này chưa đủ.

GoTrue/Mailpit local thật: tài khoản fixture độc lập nhận OTP, login UI, tạo mục tiêu/ACK qua RPC, RAM-only rescue/request/ack, native confirm, worker lease, SDK logout/session removal và purge product DB. SELECT count/revision chỉ đọc trên PostgreSQL local sau logout chứng minh row cloud fixture còn nguyên; không gọi đây là authenticated UI reread khi guest. Không tạo private file/download artifact, traces/screenshots/storageState hoặc OTP/token log. Suite cũ vẫn kiểm Auth refresh, revoked refresh, A/B, private pull/import/late responses. CI exact HEAD/số pass/fail/flaky/retry ghi trong PR trước ready.

Không cần SQL/cấu hình Supabase mới. Owner đã xác nhận migration7/latest20261111000100, signup-off và ledger metadata đúng. Managed sau upgrade/UI purge mới, hoạt động/giáo án/A→B/conflict/expiry/custom SMTP và thiết bị thực chưa được chứng minh; chỉ dữ liệu giả, không mở pilot. Deploy GitHub→Cloudflare sau owner merge, không ZIP/upload thủ công. Kế tiếp full restore compatibility/importer repair và vận hành backup/Auth recovery/delete/retention theo policy.

## Tình trạng sau merge #45

Đã merge app5.17.0 tại `5767079`, Pages/Cloudflare/backend success. UI main có603 pass/1 flaky WebKit820, workflow failure; không ghi clean run. [Điều tra và bản sửa fixture](POSTMERGE_V5_17.md) xử lý test gọi repository trước khi lazy module thực thi sau reload. Runtime purge/IDB3/worker protocol không đổi; Managed mới chưa nghiệm thu.
