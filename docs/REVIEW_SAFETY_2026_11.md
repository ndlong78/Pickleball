# Rà soát Claude sau #41 — 11/11/2026

Baseline thực tế: main `1f6ecd91d22ef3696bf681a62063e4e4dab1413b`, V5.15.0. PR#41 đã merge, không PR mở trùng khi bắt đầu. [UI42936078967](https://github.com/ndlong78/Pickleball/actions/runs/42936078967) có557 pass/1 flaky, job failure đúng với `failOnFlakyTests`; bước countdown10 lượt bị skip. [Backend42936079023](https://github.com/ndlong78/Pickleball/actions/runs/42936079023) và Pages42936078550 success. Pages deploy không đồng nghĩa release sạch hoặc có database production riêng.

## Đánh giá và xử lý

| Nhận xét | Kết luận và phạm vi xử lý |
|---|---|
| Academy selection WebKit | Đúng, log xác nhận `SWITCH_PLAN_OWNER` chưa tồn tại. Test nay chờ lazy Settings hoàn tất và fixture function, giữ toàn bộ kiểm tra cách ly A/B. Nút gửi của ba nguồn mặc định disabled trước runtime. Thêm10 lượt WebKit không retry; giữ timeout/retry/assertions hiện có. |
| M1 Auth Pages dùng staging | Đúng. Guard dùng chung tại config và adapter, chỉ cho frontend staging chính + đúng project; loopback chỉ dùng backend loopback. Pages/custom/preview off, không tạo SDK/session hoặc gửi request. Test origin ảo dùng bytes local và config thật, không gọi Managed. |
| M2 storage dùng chung origin github.io | Đúng về trust boundary; đổi prefix/key hoặc path không tạo cách ly bảo mật. Tắt Auth/data trên Pages và giữ Auth trên Workers origin riêng giúp ngăn phiên mới ở Pages. Không tự xóa cache/token cũ hoặc hứa đã thu hồi server session; operator còn phải xử lý các phiên từng đăng nhập trên Pages. |
| M3 main protection | API xác nhận `protected:false`, rulesets=[] tại baseline. API tạo ruleset bị403 Resource not accessible by integration dù metadata permissions.admin=true; chưa thay repository settings. Template và các bước owner cấu hình ở dưới. Branch protection không tự chặn một post-merge flaky hoặc làm native Pages/Workers chờ CI main. |
| C1–C3 backup V1 | Mã hiện tại parse nhiều key trong một handler không catch và ghi nhiều key tuần tự; lỗi JSON/quota có rủi ro thật. Bản review gửi kèm chưa có đầy đủ C1–C3 trước đó; không tuyên bố đóng mọi phát hiện chỉ từ nhãn. Commit riêng thêm validate/fail-closed export, null/omitted semantics và journal guest restore/recovery trước feature reads; xem GUEST_BACKUP_SAFETY.md và giới hạn đồng bộ đa tab. |
| S1 legacy writer epoch | Đúng là public `apply_operation` protocol1 không nhận epoch; các writer mới có fence. Không có reset/restore/delete-account operator đang triển khai từ PR này. Commit migration7 thêm immutable first-epoch ledger: backfill user cũ fail closed, new head chỉ compatibility trong epoch đầu; guard dưới head lock và giữ profile/import contract. Có pgTAP/REST/SQL Editor upgrade fixture riêng theo LEGACY_EPOCH_GUARD.md. Không đổi migration cũ hoặc nới RLS; reset/restore/purge server vẫn đóng. |
| R1 rescue discovery | `capture` gọi `discover` dù chỉ xuất18 key đã biết; UI cũng yêu cầu discovery trước capture. Lỗi enumeration/giới hạn key lạ có thể chặn cứu hộ dữ liệu đã biết. Đã thêm degrade có cảnh báo: capture18 key không enumerate; unknown selection vẫn phải discovery thành công. Giữ credential/size/source-change checks; không gọi bản này là toàn origin. |
| C7 dependency CI | Dùng `npm ci`, pin `@playwright/test` đúng phiên bản lock1.64.1; không nâng browser/SDK hoặc sửa retries để xanh. |
| C8 dòng dài | Có thật ở các module/test cũ. Ưu tiên chia phần vừa sửa thành hàm/khối dễ review; không bulk-format toàn repo trong bản vá Auth hoặc gọi format là sửa tính đúng đắn. |

Guard origin là rollout control phía client, không thay Supabase Auth/RLS. Public key có thể được gọi từ client khác. Việc tắt checkbox đăng ký trên frontend không thay cài đặt signup/rate-limit server.

## Operator — cấu hình còn cần làm

1. Supabase project staging: kiểm tra **Allow new users to sign up** đang tắt nếu chỉ thử bằng user đã cấp. Mã frontend mặc định `allowSignup:false`, gửi OTP với `shouldCreateUser:false`; CI local riêng bật signup để tạo user giả. Không gửi key bí mật, OTP, token, email hoặc danh sách Users vào PR/log.
2. Rà Users và các phiên từng đăng nhập qua Pages. Thu hồi phiên bằng cơ chế quản trị Supabase được hỗ trợ, sau khi bảo toàn pending đúng account. Chưa có credential quản trị trong môi trường này; không tự xóa user, dữ liệu khách, token/cache trên origin dùng chung hoặc reset database.
3. Dùng `https://pickleup-staging.home-309.workers.dev/` cho Auth thử bằng dữ liệu giả. Tài khoản thật vẫn cần operational backup/recovery/delete và các gate policy; không bật Auth trên github.io hoặc dựa vào path repo để cách ly.
4. Cấu hình ruleset main theo template dưới. Sau owner merge bản vá, kiểm UI/backend/Pages/Cloudflare **cùng merge SHA**, đọc log0 fail/flaky/retry, không chỉ nhìn biểu tượng xanh ở PR.

## Ruleset main có thể review trước khi áp dụng

Repository → Settings → Rules → Rulesets → New branch ruleset:

- Target `refs/heads/main`, enforcement Active.
- Require pull request; required status checks **responsive**, **backend**, require branches up to date.
- Block force push và deletion. Nếu repo chỉ có một maintainer, không đặt số approving reviews khiến owner không thể merge PR của chính mình; thêm reviewer khi thực sự có người review độc lập.
- Không tự đặt bypass rộng cho mọi actor. Kiểm khả năng áp dụng theo gói GitHub hiện tại.

Template JSON ở [main-ruleset.json](admin/main-ruleset.json) pin check source GitHub Actions integration15368, chỉ là cấu hình đề xuất; không chứng minh server đã áp dụng. Native Pages/Cloudflare Git builds hiện chạy độc lập với post-merge UI/backend. Muốn chặn deploy theo CI main cần thiết kế thêm deployment workflow/gate và cấu hình hosting; required PR checks chỉ bảo vệ trước merge.

## Bằng chứng và giới hạn

Mỗi PR bổ sung kết quả đúng HEAD ở mô tả sau khi đọc logs. Unit/mock/native IDB khác Supabase local thật GoTrue/Mailpit, khác Managed staging và field QA. Môi trường hiện không truy cập trực tiếp site Managed/production hoặc quản trị Supabase; không vượt network policy để gọi site qua đường khác. WebKit local thiếu thư viện hệ thống/installer; dùng WebKit CI cho bằng chứng thực thi. Không dùng dữ liệu thật, không tự merge/deploy main, không thay SQL Managed từ PR.
