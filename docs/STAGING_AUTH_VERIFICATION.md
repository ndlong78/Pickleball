# Staging Auth — kết quả và kiểm thử tiếp theo

Ngày ghi nhận **09/11/2026**, múi giờ Asia/Saigon. Phạm vi: `https://pickleup-staging.home-309.workers.dev/`, dữ liệu thử do operator kiểm soát. Đây là sổ bằng chứng vận hành, không là quyền bật thêm flags hoặc mở pilot.

## 1. Bằng chứng do operator xác nhận

Owner xác nhận trong hội thoại: đã nhận email, đăng nhập, kiểm dữ liệu riêng; sau đó xác nhận tải lại vẫn giữ phiên và đăng xuất đồng bộ giữa hai tab. OTP/token được giữ riêng. Không thu thập địa chỉ email, OTP, token, session, dữ liệu tài khoản hoặc email thô trong repo/artifact.

| Luồng | Trạng thái | Phạm vi kết luận |
|---|---|---|
| Yêu cầu OTP và nhận email | ĐẠT — operator xác nhận | Email đến được hộp thư đã thử; chưa xác định SMTP provider/custom SMTP, sender DNS, quota, spam hoặc khả năng gửi cho người dùng khác |
| Xác thực OTP và đăng nhập | ĐẠT — operator xác nhận | Có luồng đăng nhập thực tế; refresh/expiry theo thời gian thực còn cần kiểm |
| Kiểm tra truy cập dữ liệu riêng | ĐẠT — operator xác nhận | Phép kiểm dữ liệu riêng trong phiên đăng nhập đã được operator xác nhận; chưa có transcript trạng thái domain hoặc bằng chứng cách ly A/B/anonymous với dữ liệu khác nhau |
| Tải lại giữ phiên | ĐẠT — operator xác nhận bổ sung | Phiên giữ qua tải lại; chưa suy thành refresh token hoặc expiry theo thời gian thực |
| Logout nhiều tab | ĐẠT — operator xác nhận bổ sung | Đăng xuất đồng bộ hai tab trong lượt thử; không suy cache purge hoặc logout mọi thiết bị |

Đây là kiểm chứng Managed staging do operator báo, tách khỏi Auth mock và GoTrue/Mailpit local CI. Codex chưa trực tiếp quan sát website hoặc Dashboard: môi trường vẫn không có kết nối quản trị Cloudflare/Supabase/SMTP và domain staging chưa được cho phép trong network policy. Không suy rằng website lỗi từ giới hạn truy cập của executor.

Main nguồn hiện tại là `0fb6fc85060cd025482394e0f53f527e1f3f6bbc`, app5.13.1 sau [#37](https://github.com/ndlong78/Pickleball/pull/37). **Chưa đối chiếu commit/build thực tế đang chạy trên Cloudflare**, thời điểm thao tác, browser/OS hoặc thiết bị. Việc ghi nhận ngày 09/11 không khẳng định mọi thao tác được thực hiện đúng ngày đó. Một phép kiểm riêng thành công cũng chưa chứng minh đầy đủ sáu migrations/RLS/grants hoặc mọi domain đã sẵn sàng.

## Bổ sung 10/11/2026

Sau #39, operator cung cấp ảnh Console `build:5.14.0` / `sync:true`, banner dữ liệu giả và UI đã chọn nguồn tài khoản/múi giờ. Ảnh sau đó hiển thị thông báo thành công cũ cùng3 pending; operator xác nhận đây là thay đổi mới, chưa gửi lại. Vì vậy chưa coi ảnh này chứng minh lỗi server hoặc cả3 mục đã ACK. Sửa UI5.14.1 đang PR cập nhật thông báo khi queue thay đổi cùng tab/qua tab khác. Chưa ghi nhận đọc lại mục tiêu/check-in từ browser profile độc lập hoặc Managed A/B/conflict/expiry; không ghi email/OTP/token từ ảnh vào tài liệu.

Operator gửi kết quả cài database: `INSTALLED`,6 migrations,16 tables,10 public RPC; audit báo migration_history PRESENT, PostgreSQL17,27 kiểm table/RPC/role OK. Trước cài, cùng project được đối chiếu ref `rfeoeagklmaqmkcdhprb` nhưng audit báo mọi đối tượng PickleUp MISSING; do đó báo cáo private access trước đây được giữ là lịch sử operator, **chưa coi là kiểm chứng RPC sau cài**.

Sau sửa mẫu email Magic Link sang nội dung `{{ .Token }}` trên Dashboard theo hướng dẫn, operator xác nhận đăng nhập được. Chưa ghi nhận lại private probe, A/B hoặc data writes trên Managed sau cài. [PR6a](STAGING_SYNC_PR6A.md) chuẩn bị mode dữ liệu giả cho hai domain đầu; chưa merge/deploy hoặc chứng minh rollout.

## 2. CI đã đọc log ở main nguồn

| Loại evidence | Merge SHA / run | Kết quả |
|---|---|---|
| Guest/mock browser và static deployment local | `0fb6fc8`, [UI42367445245](https://github.com/ndlong78/Pickleball/actions/runs/42367445245) | 327 unit,3 HTTP host,1 Workers/workerd local integration; Wrangler dry-run;528 browser (264 Chromium +264 WebKit) và10 lượt WebKit bổ sung pass,0 fail/flaky/retry |
| Supabase local thật | Cùng SHA, [backend42367445298](https://github.com/ndlong78/Pickleball/actions/runs/42367445298) | 275 pgTAP +45 REST (9+14+6+8+8); GoTrue/Mailpit/SDK và real Auth browser Chromium/WebKit pass, không browser retry |
| GitHub Pages | Cùng SHA, [Pages42367444675](https://github.com/ndlong78/Pickleball/actions/runs/42367444675) | completed/success; không thay bằng chứng Cloudflare hoặc Managed |

CI local có OTP sai/nhận mã/verify/private RPC, refresh/logout, native tab logout, A→B và phản hồi A đến muộn. Các ca này không tự chuyển thành ĐẠT trên Managed. Exact HEAD của PR tài liệu này và kết quả CI mới ghi trong mô tả PR sau khi đọc logs; không dùng baseline thay gate của PR mới.

## 3. Kiểm phiên tiếp theo trên staging

Dùng browser profile thử nghiệm, cùng domain ở trên và tài khoản hiện hữu. Giữ đăng ký công khai tắt, bốn flags dữ liệu false; không cần bật importer/sync/activity/plan để thử phiên. Không đổi thời hạn JWT server chỉ để chạy nhanh checklist, không xóa storage/queue hoặc xuất HAR/trace chứa credentials.

| Ca | Thao tác | Kỳ vọng | Staging hiện tại |
|---|---|---|---|
| Restore | Đăng nhập A, tải lại `/?page=settings`, chờ khôi phục rồi kiểm dữ liệu riêng | Phiên vẫn là A, truy cập riêng hoạt động, dữ liệu guest không bị nhập/gửi | ĐẠT — operator xác nhận |
| Logout nhiều tab | Mở hai tab cùng browser profile/origin, xác nhận cùng A; đăng xuất từ tab1, quay lại tab2 | Cả hai về guest sau thông báo đồng bộ; UI riêng của A bị gỡ | ĐẠT — operator xác nhận |
| Re-login | Sau logout, tải lại trang rồi đăng nhập lại bằng mã mới | Không tự khôi phục phiên đã logout; mã mới đăng nhập được | CHƯA GHI NHẬN |
| Đổi A→B | Logout A, đăng nhập B hiện hữu trong cùng profile, mở Settings | Identity và UI riêng thuộc B; không hiện lại dữ liệu A | CHƯA GHI NHẬN |
| Refresh/expiry thực tế | Quan sát theo thời hạn đang cấu hình và thử mất/kết nối lại mạng | Refresh hợp lệ giữ đúng account; khi không thể phục hồi phiên, UI báo đăng nhập lại và không lộ account khác | CHƯA GHI NHẬN |

Mã sai/hết hạn, resend/server rate limit/network error, phản hồi A đến muộn, RLS A/B/anonymous với dữ liệu tổng hợp khác nhau, PWA update/offline/return-online và Safari iPhone/iPad/Android thật vẫn cần kết quả staging riêng theo [ma trận đầy đủ](SUPABASE_STAGING_DEPLOYMENT.md#6-ma-trận-nghiệm-thu-managed-staging). Đổi account khi không có dữ liệu phân biệt được chỉ xác minh identity UI, chưa chứng minh isolation dữ liệu. Mẫu ghi kết quả chỉ cần tên ca, ĐẠT/LỖI/CHƯA CHẠY, browser/OS, build hiển thị và mô tả lỗi đã bỏ thông tin riêng; giữ email/OTP/token/export riêng.

## 4. Trước khi thử dữ liệu và mở pilot

Sau các ca phiên, đối chiếu deployment commit/build, sáu migrations và server settings; kiểm SMTP/sender/rate trên phạm vi người nhận dự kiến, không suy custom SMTP từ một email đã đến. Chỉ kiểm ghi dữ liệu tổng hợp qua RPC trong lượt staging được chuẩn bị riêng, từng domain với consent/manual send và A/B/conflict/retry; không bật flags trong PR tài liệu này hoặc dùng direct table writes.

Pilot dữ liệu thật vẫn cần backup mã hóa và restore drill gồm Auth, full V6 restore/purge, privacy/export/delete, importer repair, quota/retention và QA thiết bị theo [policy](PILOT_OPERATING_POLICY.md). Login không tự nhập/sync dữ liệu luyện tập; dữ liệu origin cũ không tự chuyển. Cache rescue V6 còn preview chỉ đọc, chưa restore.
