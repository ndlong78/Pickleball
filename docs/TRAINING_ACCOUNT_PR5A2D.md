# PR5a2d / V5.9.0 — nhật ký tập tài khoản

Nền main `411df63808ece47d64f78df5bfc8bf38b70e8d65` sau [#29](https://github.com/ndlong78/Pickleball/pull/29), app5.8.0; không PR mở trùng lúc bắt đầu. [Pages41599356513](https://github.com/ndlong78/Pickleball/actions/runs/41599356513) và [UI41599358040](https://github.com/ndlong78/Pickleball/actions/runs/41599358040) success; [backend41599358269](https://github.com/ndlong78/Pickleball/actions/runs/41599358269) fail bước browser Auth Chromium xử lý xung đột giáo án, **main chưa có clean backend sau merge**. Exact HEAD/CI của PR mới ghi tại PR, không lấy trạng thái Pages thay backend gate.

## Phạm vi và thao tác

Dùng nguồn hoạt động/consent/controller/RPC hiện hữu, không thêm Supabase calls vào UI, SQL/RLS/migration hoặc đổi IDB schema1. Bump đồng bộ package/build/assets/PWA cache5.9.0; giữ8 route/80 bài/18 khóa V5. **Năm flags vẫn false**, Auth URL/key rỗng; guest không cần SDK. Review không cần cấu hình/credentials mới. Không production/public signup/tự merge.

- Dữ liệu → chọn kho hoạt động tài khoản và kho giáo án tài khoản độc lập. Tạo/chọn/đồng bộ giáo án trước Court. Chỉ nhận plan live đã ACK, cùng owner và epoch; pending selection/orphan/review/error không dùng plan guest để thay thế.
- Court → phần kỹ thuật → nhập hits nguyên0–20, note≤240 codepoints và đủ feed/pace/target → bấm lưu. Một lần bấm tạo event/client_event/command UUID riêng; record+queue commit nguyên tử trước thông báo. Hai lượt cùng nội dung vẫn là hai identity.
- Phần kiểm tra Court cho **ghi một lượt kiểm tra riêng** bằng cùng form, gắn exercise đầu tiên của snapshot, kind=assessment. Không tự tạo lượt từ timer hoặc cập nhật điểm plan. Nút nhập kết quả giáo án vẫn chỉ cập nhật result CAS; hai hành động độc lập, không sinh attendance.
- Gửi bằng “Đồng bộ hoạt động”; read/send/retry tách biệt. Login/reload/focus/route chỉ đọc cache, không RPC/import/gửi queue. Timeout-after-commit giữ frozen request và replay đúng body/UUID.
- Mismatched sources (plan account/activity guest hoặc ngược lại) chặn ghi Court; chỉ dẫn chọn cùng nguồn. Điểm plan guest khi activity account không tự append vào nhật ký khách. Khi cả hai nguồn guest, giữ writer/caps/keys/backup cũ.

## Dependency và cách ly nguồn

`activity-runtime.saveTraining` chụp input/plan, token cả hai nguồn và plan localRevision/consentRevision/epoch trước await. Facade kiểm ACK và owner. Repository nhận proof optional riêng cho writer UI mới, clone proof và kiểm lại consent, live canonical own-plan, local revision và plan cursor epoch **trong transaction ghi record+queue**. Tab khác đổi/xóa/revoke plan làm lưu thất bại; không báo thành công hoặc sửa input. APIs nền cũ vẫn tương thích cho fixture/import đã có; RPC vẫn là authority cuối về ownership/live FK. Server thay đổi sau local commit có thể trả domain invalid/conflict trong HTTP200; sender giữ intent để review/export, không đổi plan_id hoặc dựng plan giả.

Đổi A→B/logout/consent xóa note/hits/conditions và status cũ, bỏ phản hồi muộn. A queue giữ namespace A; không chuyển sang B. Nút và form có trạng thái đang lưu; quota giữ input. Đổi bài trong lúc save không xóa draft bài mới. Clock account vẫn RAM trong phiên trang, reset reload/owner/source, không ghi private plan UUID/note vào timer V5. Không thêm device_state persistence.

Activity controller nay bỏ cache load cũ sau load mới hơn, giống plan controller; regression giữ event và revision mới khi refreshLocal cũ đến muộn. BroadcastChannel chỉ type+owner, không payload và không auto RPC.

## Reader, lịch sử và so sánh

`activity-source-core` project training raw/eligible, `activity-runtime.training/raw/events` cung cấp cùng nguồn cho Progress history/evaluation, tactical report, Journey, weekly goals/planner và plan–actual. Không chạy validator capped1000 của guest trên account. Raw history20 lượt/trang giữ mọi identity, ngày null/future, orphan legacy reference và note; ngày chưa rõ/tương lai không thành activity day/analysis. Sort instant microsecond/timezone với UUID tie; giữ chuỗi thời gian gốc.

So sánh tài khoản tách theo **plan UUID bất biến + exercise + level + kind + cả ba conditions**. Orphan/null plan hoặc thiếu conditions không thành nhóm tương đương; không trộn nhiều plan cùng mã bài. Báo cáo chỉ mô tả, không suy nguyên nhân/rating/DUPR hoặc tự nâng level. History raw và projection phân tích riêng, không dựng ngày/điểm hoặc tạo plan cho orphan. Deleted plan không cascade xóa training history.

Xóa từng lượt có confirm/local revision/source guard; tombstone append/delete, không update/restore event. Settings review original/local/remote gồm bài, plan reference, điểm, note và conditions; sending phải replay trước, epoch cần acknowledgement; giữ archive/full-preview CAS. Export activity vẫn riêng tư/chưa round-trip hoặc backup toàn V6. Backup V5/rescue/importer tiếp tục raw guest, không mirror account.

## Kiểm chứng và vấn đề sau merge #29

Unit mock/fake-IDB kiểm typed plan binding, >1000 identities, null/future/orphan/microseconds, comparability theo plan/conditions, default-off/no RPC, ACK/local-first/manual sync/delete, transaction fence khi revision/revoke đổi và late A reply. Native-IDB/mock Auth/RPC kiểm4 viewports, basic/advanced, source mismatch, quota input, explicit checkpoint riêng, cross-reader, exact replay qua reload, delete conflict/review, multi-tab A→B và phân trang>1000. PWA giữ upgrade5.8 và visited Court offline dưới `/Pickleball/` với cả activity/plan modules. Đây không phải Auth/RLS thật.

Auth integration CI dùng Supabase local/GoTrue/Mailpit/SDK thật, Chromium/WebKit; giữ luồng cũ, thêm training product UI→manual send→commit-loss/reload/exact replay→private canonical data→delete HTTP200 conflict→review/archive. Không token/OTP/payload/notes trong logs hoặc Auth artifacts. Gateway publishable alias loopback vẫn fixture, chưa Managed staging.

Lỗi main backend sau #29: fixture để selection và result cùng pending rồi chỉ giải quyết result conflict. Sender không bảo đảm thứ tự các entity độc lập; selection có thể bị dependency_changed khi plan result đang review, cần quyết định riêng. Regression mới chứng minh riêng selection review vẫn bắt buộc sau result decision. Fixture Auth nay ACK selection trước khi tạo single-result conflict, giữ mọi assertion; không tắt test/retry hoặc bỏ dependency gate. Phase lưu và gửi decision tách rõ. CI đúng HEAD mới phải sạch trước ready review; không gọi main cũ đã clean.

Chưa Managed staging SMTP/delivery/gateway, browser expiry theo wall clock, thiết bị thật/installed PWA, full V6 backup round-trip/purge/Auth recovery/account deletion/restore drill/importer repair/near-cap load. Bài Học viện gần nhất/selected_academy_lesson_id và checklist vẫn device-only, chờ PR5b2 trước full-route gate. Nguồn training chỉ mở khi flags/consent được bật trong local/staging được cấp quyền. Không mở pilot dữ liệu thật.
