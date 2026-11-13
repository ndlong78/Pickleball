# PR5b2d1 / V5.19.0 — đối chiếu cache trước khôi phục

Baseline main `6e22b1f89d373cec6fb1342287c31b3987e53741` /5.17.0 sau #46, không PR mở trùng. UI main43240835088 đã hoàn tất394 unit/604 browser +50 lượt bổ sung/3 HTTP/1 Workers,0 fail/flaky/retry; Pages43240834380 và Cloudflare Production buildce39f4a1 success cùng SHA. Backend main không tạo run mới do push path filters (bản sửa46 test/workflow/docs-only); PR46 HEAD8c180b9 backend43235807953 có300 pgTAP/48 REST/GoTrue-Mailpit hai engines sạch. CI exact HEAD PR mới ghi trong PR trước ready; không tự merge.

## Hành vi

Trong Settings → Cứu hộ cache V6, user chọn tệp đúng account và kiểm structure/owner/checksum bằng luồng hiện có. Chọn file không tự mở repository hoặc đọc thêm cloud. Nút **So tệp với cache tài khoản trên máy** chỉ bật sau preview file hợp lệ. Bấm nút mới đọc consistent snapshot bảy stores của own namespace và đối chiếu. Không có nút restore/commit, không truyền RPC hoặc ghi đè business rows.

Theo từng store: cùng khóa/cùng toàn nội dung; chỉ có trong tệp; chỉ có trên máy; cùng khóa/khác toàn nội dung; khóa chưa đối chiếu được phía tệp/máy. Số dòng không là số buổi tập. Cache tại lúc đọc có thể đổi ngay sau đó, không là token cho một write tương lai. Giống hệt cũng luôn canRestore=false/cloudVerified=false.

Danh sách cố định nhắc kiểm server cho mọi record, reconciliation cho mọi operation kể cả ACK/resolved, các pending/sending theo trạng thái trong tệp, conflict decisions, fresh pull cho cursor, importer provenance, device/plan references và settings/identity/generation/consent/lease không được tự kích hoạt. Đây chưa là domain schema/dependency validation đầy đủ hoặc quarantine storage. Unknown data vẫn ở tệp gốc; không trim, normalize hay kích hoạt.

## Hợp đồng core và lifecycle

`account-rescue-core.validateSnapshot` clone và kiểm container JSON/owner/bounds, tối đa100.000 rows/32 MiB snapshot; không xác nhận domain hoặc server. Existing file preview còn kiểm cả envelope/checksum/credential scan. Chấp nhận repositoryVersion1/2/3, không đổi rescue envelope1 hoặc IndexedDB3.

`restore-preview-core.compare(fileSnapshot,deviceSnapshot,{expectedOwner})` yêu cầu account UUID rõ ràng, kiểm cả hai snapshot trước tính report. Map identity theo đúng primary-key fields của bảy stores. Nhận diện string không rỗng; riêng protocol còn nhận số nguyên an toàn không âm. Khóa không nhận diện không match với nhau và được tính riêng, không bị bỏ khỏi tổng kiểm kê. Cùng nội dung dùng canonical object-key order, giữ array order/strings/numbers; không sửa input. Giới hạn container vẫn áp dụng trước khi dựng maps.

Report version1 chỉ có hai repository versions, store/totals counters, fixed risk code/count và hai flags false. Không owner UUID, row IDs, filenames, notes hoặc arbitrary state strings trong report/DOM. Raw parsed file chỉ RAM của controller, không artifact/log/URL/localStorage. File chọn không được download lại thành ảnh chụp mới trên máy. Trước mở file/compare/capture mới, clear comparison cũ. Đổi owner xóa ngay filename trong input, kể cả File.text còn đang chờ. Error/storage failure/account switch/guest/expiry/invalidate đóng scope và bỏ report/selected file; late read/hash guard generation/serial sau await. Không nhận file như purge preview hoặc restore authority.

Comparison dùng `getAccountRescueSnapshot()` readonly; openRepository có thể bootstrap/upgrade schema theo repository hiện hữu, không có migration/store mới hoặc ghi business records. Không đụng guest/tài khoản B/legacy_snapshots/Auth. Core chỉ lazy-load ở Settings; Home không nạp thêm feature. PWA5.18.0 versioned URLs và upgrade từ5.17.0; offline visited Settings có module đối chiếu.

## Kiểm thử

Unit so đủ bảy stores, object property order/array order, versions1/2/3, key khó hiểu, pending/uncertain/ACK không cấp quyền, credentials/foreign owner/duplicate/size và report không payload. Controller inspect chưa mở DB, compare explicit/repeat readonly, new invalid file/storage failure và delayed A→B không giữ report A.

Native IDB/mock Auth bốn viewport390/820/1180/1440, offline, no RPC, so sánh không đổi snapshot/guest, file cũ/unknown key/XSS note không render, invalid new file, late A comparison/logout clear. Core/readonly UI không thay backend ownership proof. Local Node24 có409 unit pass, Chromium24 browser pass; Full unit gồm kiểm đồng bộ phiên bản5.18.0. Fixture PWA tạo riêng old caches5.17 và5.16, kiểm cleanup và giữ local data.

GoTrue/Mailpit/SDK browser thật mở cứu hộ từ private cache trong RAM, so tệp/cache qua UI, kiểm đủ bảy nhóm và0 khác biệt, không RPC mới/rows đổi hoặc artifact chứa private file. Auth/refresh/logout/A→B/purge/import regressions vẫn chạy trên Chromium/WebKit CI. Exact HEAD results ghi trong PR, không suy test mock thành Managed.

## Cấu hình và bước tiếp

Không SQL, RLS, Auth config, signup hoặc dependencies mới. Staging vẫn migration7/latest20261111000100, signup-off theo owner xác nhận; không chạy lại6→7. GitHub→Cloudflare sau owner merge, không ZIP/upload, không production changes. Guest và flags các nguồn/import giữ nguyên.

Chưa thực hiện khôi phục. Bước sau cần quarantine candidate, policy device IDs/plan dependency và provenance/epoch, đối chiếu server cùng target snapshot mới, rồi atomic commit/quiesce/confirmation/rollback trước cho write. Không tự replay frozen requests hoặc nhập ACK như server proof. Full account/DB backup, Auth recovery/delete/retention jobs, custom SMTP, Managed đủ các luồng và physical QA còn gate; chỉ dữ liệu giả.
