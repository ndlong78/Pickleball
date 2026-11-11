# Staging Auth — kết quả và kiểm thử tiếp theo

## Cập nhật 12/11/2026 — sau nâng cấp migration7

Ngày ghi nhận theo Asia/Saigon; không suy thời điểm thực thi từ ngày ghi nhận. Owner báo đã chạy nâng cấp trên project staging đã đối chiếu `rfeoeagklmaqmkcdhprb`, gửi ảnh SQL Editor cho query `count(*) / max(version)` với kết quả **7 / 20261111000100**; sau đó xác nhận đã tắt và lưu **Allow new users to sign up** trên Supabase Authentication. Không cần chạy lại bundle6→7 trên database này.

| Kiểm tra | Trạng thái | Phạm vi kết luận |
|---|---|---|
| Lịch sử migration sau nâng cấp | ĐẠT — kết quả SQL do operator cung cấp | Xác nhận số lượng7 và version lớn nhất20261111000100; chưa kiểm đủ từng version, source/checksum hoặc RLS/ACL của bảng mới |
| Chặn signup trên server | ĐÃ CẤU HÌNH — operator xác nhận đã tắt và lưu | Không suy thành phép thử request signup từ client khác hoặc kiểm toàn bộ rate limits |
| FORCE RLS/ACL của `legacy_write_epochs` | ĐẠT — operator báo đúng bốn giá trị mong đợi | `rls_enabled=true`, `rls_forced=true`, `client_access=false`, `api_can_rebind=false`; không thay kiểm tra toàn bộ ACL/RLS hoặc cách ly A/B |
| Login và đọc/gửi bằng writer fenced sau nâng cấp | CHƯA KIỂM trên Managed | Nghiệm thu mục tiêu/check-in trước migration7 giữ nguyên là bằng chứng lịch sử |

Phép kiểm SQL Editor đã dùng, chỉ đọc catalog, không lấy nội dung tài khoản:

```sql
select c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       has_table_privilege('authenticated', c.oid,
         'SELECT,INSERT,UPDATE,DELETE') as client_access,
       has_table_privilege('pickleup_api', c.oid,
         'UPDATE,DELETE') as api_can_rebind
from pg_class c
where c.oid = to_regclass('pickleup_private.legacy_write_epochs');
```

Owner đã báo kết quả đúng kỳ vọng **true / true / false / false**. Phép kiểm phải có đúng một dòng. Không có dòng hoặc khác kỳ vọng thì dừng ghi thử và đối chiếu [hợp đồng migration7](LEGACY_EPOCH_GUARD.md); không nới quyền hoặc xóa lịch sử để sửa nhanh. Sau khi metadata đạt, dùng tài khoản hiện hữu trên staging, chỉ dữ liệu giả: đăng nhập, gửi thay đổi mục tiêu/check-in ở browser profile A, đợi ACK và0 pending, rồi cùng tài khoản chọn đúng nguồn/đọc lại ở profile B. Hai profile cùng account không chứng minh cách ly hai account; nghiệm thu hoạt động/giáo án, A→B, conflict, expiry và phục hồi vẫn riêng. Chỉ báo trạng thái và số lượng, giữ email/OTP/token/nội dung riêng ngoài repo/log/artifact.

Nguồn đã merge [#42](https://github.com/ndlong78/Pickleball/pull/42): main `c7729774d53bac295a15685f7e0655f7f321be8f` /5.15.1. [UI42966329683](https://github.com/ndlong78/Pickleball/actions/runs/42966329683):359 unit,580 browser Chromium/WebKit,40 lượt WebKit bổ sung,3 HTTP và1 Workers pass,0 fail/flaky/retry. [Backend42966329674](https://github.com/ndlong78/Pickleball/actions/runs/42966329674):300 pgTAP,48 REST và GoTrue/Mailpit/SDK Auth browser thật hai engines pass. [Pages42966328494](https://github.com/ndlong78/Pickleball/actions/runs/42966328494) và Cloudflare Production build582f21e0 success cùng merge SHA. Đây là evidence CI/deploy của source, không thay xác minh build đang chạy trên browser hoặc Managed sau upgrade. CI của PR tài liệu mới ghi riêng trong mô tả PR.

Các mục bên dưới là bằng chứng lịch sử được giữ theo ngày.

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

### Nghiệm thu sau #40

Main `cc0d94498a19cec64570159b953e43d271389ab0` /5.14.1 đã tự build/deploy qua GitHub→Cloudflare; check Production8bb66828 success cùng merge SHA và operator xác nhận primary trả5.14.1. Main UI42834392634/backend42834392650/Pages42834391795 success; logs0 fail/flaky/retry. Owner yêu cầu chỉ triển khai qua GitHub, không dùng gói ZIP/upload thủ công.

Hai browser profiles **cùng tài khoản** báo source=account, error=null, sync=true,1 preferences/2 check-ins, pending0, cursor/serverHighWater11; writer có11 acked, reader0 acked là bình thường. Operator đã thấy lịch tập đề xuất khớp và xác nhận check-in hôm nay đúng ngày/trạng thái/phút. Ghi nhận nhóm này ĐẠT theo operator; không lưu email, UID/hash tài khoản, OTP/token hoặc payload riêng. Không dùng kết quả cùng account thay phép cách ly hai account.

Phần user ban đầu thấy thiếu là lịch sử điểm/Học viện/giáo án/trận đấu, nằm ngoài flag PR6a. [PR6b/V5.15.0](STAGING_ACCOUNT_PR6B.md) đang mở thử các nguồn mới, chưa Managed QA cho chúng. Account switch/expiry/conflict/SMTP/backup/restore/deletion/physical QA vẫn cần bằng chứng riêng.


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
