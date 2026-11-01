# PR4a — canonical pull/cache cho preferences và check-in

Nền main `2689b36672987da66f26f2d0785c7396336ced5c`, PR18 merge ngày31/10/2026. [Main responsive](https://github.com/ndlong78/Pickleball/actions/runs/41148021952):151 unit +282 browser pass, không flaky; [backend](https://github.com/ndlong78/Pickleball/actions/runs/41148022002) và [Pages](https://github.com/ndlong78/Pickleball/actions/runs/41148021628) success cùng SHA. Không có PR mở trùng lúc bắt đầu. Chưa có credentials Supabase/SMTP staging trong executor.

## Phạm vi

Tách PR4 thành các bước review được: PR4a canonical read/bootstrap; PR4b sender với epoch fence/CAS/ack/conflict; sau đó tích hợp nguồn dữ liệu preferences/check-in trên mọi reader/writer liên quan. PR4a **chưa phải sync hoàn chỉnh**, không gửi outbox, sửa server, tự import hoặc chuyển nguồn tám route. Guest/V5 vẫn hoạt động như trước. Flags Auth/import vẫn false, không provision hay đổi production.

`modules/data/pull-controller.js` standalone, chưa có trong page-loader/SW shell. Caller phải tạo controller đúng Auth UUID, truyền enabled callback đồng bộ trả đúng boolean true và chủ động gọi pull; mặc định disabled, login/subscribe không tạo RPC. Chỉ dùng Auth adapter hiện hữu với token ghim theo owner/generation, không thêm Supabase calls vào UI. Không có UI mới, background job, retry timer hoặc tuyên bố đã đồng bộ.

Repository thêm API, schema IndexedDB vẫn1, không migration/xóa store/keys. Module importer đã có vẫn chỉ dùng API cũ. Không phát hành hành vi app mới nên giữ version/PWA5.4.1; trước PR tích hợp runtime phải bump build/cache để trình duyệt đang giữ repository5.4.1 cũ nhận API mới. Các harness nạp module PR4a trực tiếp chỉ trong test.

## Giao thức đọc và commit

`reader.pull({forceReset:false})` đọc cursor riêng user rồi gọi `pull_changes` protocol1. Bootstrap từ0; trang đầu cố định high-water H/epoch, trang sau gửi lại H/epoch, không trộn commit mới sau H. Kiểm owner mọi row, kind allowlist12, decimal strings đến bigint max, record_revision=row.revision, server_revision liên tục, next/has_more/limit nhất quán. Unknown kind hoặc response sai làm dừng toàn lượt, không advance cursor. Không dùng Date.now/updated_at làm watermark hoặc chuyển bigint thành Number.

Mặc định50 changes/page, tối đa201 pages,10050 changes và16MiB JSON UTF8 mỗi lượt; có thể giảm cap cho test. Chỉ giữ latest map của `user_preferences` và `practice_checkins`. Những domain khác được kiểm envelope/owner và tính vào cursor/giới hạn nhưng chưa cache; Cursor có policy=preferences-checkins-1; policy khác buộc full-bootstrap. PR5 phải đổi policy khi thêm domain, không dùng cursor PR4 để bỏ qua lịch sử của domain mới.

Toàn lượt bounded được chuẩn bị trong memory; **chỉ sau trang cuối** mới gọi `applyCanonicalSnapshot` để commit bases + sync_cursor trong một transaction IDB. Mạnh hơn commit từng page trong giai đoạn bootstrap: lỗi mạng/cap/validation/quota ở trang bất kỳ giữ snapshot/cursor cũ; retry thủ công đọc lại từ cursor đã commit, không resume từ trang chưa commit. Chưa benchmark near-cap trên điện thoại.

`sync_cursor` key(namespace,protocol1) chứa afterRevision/epoch/localVersion, đều decimal string khi là số. CAS localVersion ngăn hai tab áp response ngược thứ tự; loser nhận cursor_conflict và cần pull mới, không sửa lại response cũ để ép commit. Writer local và canonical apply cùng khóa transaction records nên edit tới muộn vẫn được giữ. localRevision tăng để UI tương lai không ghi từ snapshot cũ.

## Pending, reset và tombstone

Canonical row nằm ở base/baseRevision/baseEpoch; optimistic overlay, deleted intent và tailOperationId giữ nguyên khi pending. Outbox request/body/dependency/state **không đổi một byte** bởi pull, không ack/rebase/coalesce. Khi remote thay đổi base của entity đang pending, lưu reviewBase đầu tiên và reviewRequired/reason, giữ cả intent lẫn remote mới. PR2 write tiếp tục giữ các metadata review này. Đây là dữ liệu cho conflict UI tương lai, không phải quyết định merge hay request đã gửi.

`reset_required` chỉ cho phép một lần restart từ0/H mới; reset lần nữa hoặc epoch/H đổi giữa pagination thì fail, giữ cache cũ. forceReset cũng chỉ thay base sau khi đọc đủ. Rows vắng ở snapshot mới có base=null/baseMissing=true; không bịa tombstone server. Tombstone thật giữ deleted_at/revision và yêu cầu restore tường minh. Pending của row vắng vẫn ở overlay/outbox, reviewReason=reset_required; device state/import checkpoints/domain chưa cache không bị sửa hoặc xóa.

Không có conflict resolution/ack/export cache V6 hoàn chỉnh trong PR4a; raw repository trả canonical metadata + intent, không projection thành dữ liệu đã được người dùng duyệt. Caller sau này phải validate đầy đủ domain schema/shape, trình bày local/remote/base và yêu cầu quyết định rõ; không được coi reviewRequired là tự xử lý xong hoặc gửi request cũ sau reset.

**Gate bắt buộc trước sender:** apply_operation protocol1 hiện chưa có expected epoch. Kiểm epoch bằng pull rồi push vẫn có race nếu DB restore giữa hai request. PR4b cần epoch fence trong cùng transaction/lock server trước mutation, tương thích client cũ, rồi mới delivery/ack/resolve; PR4a không giả rằng client-only guard đã giải quyết race này. Cần giữ receipts/tombstones theo policy, không GC/auto retry writes sau restore.

## Auth và lỗi

A logout/hết phiên/chuyển B làm controller A đóng scope; phản hồi muộn bị bỏ trước commit. A→B→A vẫn phải tạo controller mới. Cursor/cache/outbox nằm riêng namespace user, guest không apply server snapshot. Close/scope versionchange abort transaction đang chạy. Flag tắt lúc request chờ thì không áp response; không hứa rollback canonical commit đã complete trước khi flag đổi. Không lưu auth credentials trong cursor/records hoặc logs.

Lỗi gồm pilot_disabled/account_changed/busy/auth_required/network_error/stale/upgrade_required/reset_required/invalid_response/invalid_snapshot/pull_limit/cursor_conflict/quota_exceeded. Không log source, notes, email, OTP/token; caller tương lai hiển thị trạng thái đọc cache riêng với trạng thái sender. Không âm thầm trim, xóa pending hoặc fallback ghi V5.

## Kiểm chứng

Unit mới dùng fake-indexeddb + mock RPC: pagination/fixed H, không tạo attendance từ attempts, overlay/outbox/reviewBase, tombstone vs absence, full reset, failure page2/caps/invalid envelope, bigint>2^53, cursor CAS, A→B/kill switch và quota rollback tại cursor.put sau record.put. Phân biệt đây với native storage hoặc Auth/RLS evidence.

`canonical-pull.spec.cjs`: Chromium/WebKit + native IDB, mock Auth/RPC, SW blocked riêng fixture để không dùng module cache cũ; persistence/offline/reload, pending + remote change, reset, quota transaction, CAS hai tab, default-off và late A→B. Không trace/screenshot/video private fixtures. Giữ các suite PWA thực khác nguyên vẹn.

Backend real-browser harness tiếp tục OTP/Mailpit và SDK/RPC thật qua alias gateway test PR3d. Mỗi engine bootstrap A bằng pageSize2 qua nhiều trang, tạo skipped intent local; tab A khác dùng importer/consent hiện hữu cập nhật check-in45 và tạo preferences. Delta/full resync giữ overlay/queue cũ, đọc base mới; logout đóng readerA, B chỉ cache check-in30 của B và không có pendingA. Thêm dữ liệu fixture này không biến PR4a thành sender/UI sync; server write vẫn qua importer RPC thật. Không thêm users/SMTP quota ngoài sáu `.invalid` recipients hiện hữu.

Main/PR CI giữ pgTAP195 +REST9 +import14, Node real-RPC probe và hai scenario UI Auth/browser thật. Exact HEAD/counts/fail/flaky lấy từ PR CI; chưa staging SMTP/Managed gateway, operational restore drill, physical devices, quota/eviction/load, large histories, full cache export/purge, sender/conflict UI hoặc switch nguồn các route. Không rollout dữ liệu thật trước backup/privacy/repair gates của policy.

Executor đã thử cài engines chuẩn nhưng CDN trả403; không có browser chuẩn khả dụng tại local. Full Chromium/WebKit và Supabase local/Auth thật được kiểm ở CI ephemeral; không gọi local unit là native browser hoặc staging evidence.

PR4b bổ sung prepare_sync/apply_sync_operation với epoch fence, immutable sender/ack/conflict API theo [SYNC_SENDER_PR4B](SYNC_SENDER_PR4B.md). Legacy RPC giữ nguyên; chưa UI/source switch hoặc rollout.
