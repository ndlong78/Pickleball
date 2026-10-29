# V6 — quyết định pilot và chính sách vận hành

Ngày 29/10/2026. Chủ repository đã chọn Supabase Managed, ưu tiên miễn phí, duyệt CAS và giao Codex chủ động chọn Auth/backup/retention/xóa tài khoản phù hợp giai đoạn đầu. Đây là quyết định được ghi nhận từ hội thoại sau PR0; **chính sách chưa được triển khai**. PR0 #10 đã được merge ở `40c2ad3789dadfe005e43ef8f45a618010ee8689`; phiên bản ứng dụng vẫn5.1.0.

PR1a hiện thực một phần nền tảng schema/RLS/CAS/RPC trong môi trường local/test, xem [BACKEND_PR1A](BACKEND_PR1A.md). Chưa có dịch vụ cloud, email, backup/retention job, xóa account UI hoặc client sync đang vận hành; các target vận hành dưới đây chưa thành SLA.

## 1. Phạm vi ủy quyền và chi phí

- Codex được chủ động thiết kế, viết code/tests/migrations, mở các PR theo lộ trình V6 và chọn chi tiết kỹ thuật trong các hợp đồng dữ liệu; không cần hỏi lại các lựa chọn đã được giao. Giữ tám route, guest/offline, check-in thủ công, dữ liệu legacy, RLS và không silent overwrite.
- Dùng Supabase Managed Free cho pilot, local/ephemeral Supabase cho development/CI; chọn Singapore cho pilot dự kiến người dùng Việt Nam nếu region đó khả dụng khi provisioning. Đây là lựa chọn kỹ thuật của Codex, không phải owner đã chỉ định region hay cam kết tuân thủ lưu trú dữ liệu cho mọi thị trường.
- Ngân sách tự động **0 USD**: không tự nâng gói, mua domain/SMTP hoặc bật add-on trả phí. Khi sắp chạm quota, báo lựa chọn giảm tải hoặc nâng gói cùng chi phí thực tế; không âm thầm cắt lịch sử để giữ free. Kiểm tra quota trong dashboard trước provisioning, không dựa bảng giá cũ trong blueprint. Ngưỡng cảnh báo đề xuất70%/85% DB/egress/email quota; chỉ tuyên bố đã giám sát sau khi có job thực sự.
- Development và CI không cần cloud project trả phí. Nếu một Free project không đủ tách staging/pilot thì dùng local staging hoặc trì hoãn pilot, không dùng dữ liệu thật làm fixture và không tự trả phí tạo project thứ hai.
- Quyền chủ động không thay thế quyền truy cập thực tế. Hiện chưa có kết nối/quyền Supabase, SMTP hay kho backup được cấu hình trong môi trường; không tự tìm secrets. Cấu hình bảo mật qua cơ chế kết nối được hỗ trợ khi cần, không gửi secret vào chat.
- Giữ yêu cầu **không tự merge**. Việc sửa production, tạo database production hoặc dùng secrets production vẫn nằm ngoài tác vụ hiện tại. PR1a local/schema/CI có thể tiến hành theo ủy quyền này; không cần chờ một lần duyệt lại provider/CAS/retention. Provisioning pilot nhận dữ liệu thật cần kiểm chứng các gate ở mục5.

## 2. Auth đơn giản cho MVP

Chọn **email OTP nhập mã** làm luồng chính: nhập email → nhận mã → nhập mã → giữ phiên trên thiết bị riêng bằng Supabase SDK. Không mật khẩu, không SMS, chưa cần Google OAuth hay magic link trong MVP. OTP và magic link là hai cách xác nhận khác nhau; mã OTP dễ dùng khi đọc email trên điện thoại nhưng đăng nhập ở máy tính, tránh phụ thuộc PKCE verifier của thiết bị mở link. Khi cần magic link ở PR sau, giữ OTP làm phương án dự phòng và kiểm tra callback dưới `/Pickleball/`.

Signup/signin dùng cùng form, gửi lại mã có cooldown theo giới hạn Auth thực tế, thông báo chung tránh dò email; mã/phiên hết hạn có hướng dẫn thử lại. Xác minh cấu hình token length/expiry theo phiên bản Supabase tại triển khai, không hardcode độ dài giả định. Guest không bị chặn; đăng nhập không tự import/bật sync. Phiên hết hạn giữ local pending đúng account; login lại để gửi. Trên máy chung cung cấp đăng xuất và xóa cache có preview/export pending.

Email test built-in Supabase có giới hạn người nhận/rate và không được coi là SMTP cho người dùng pilot thông thường. Trước pilot dùng custom SMTP có free tier phù hợp, domain/sender được xác minh, kiểm thử deliverability/rate limit; Codex chọn provider theo dịch vụ thực tế có thể kết nối và ngân sách0. Không thêm tester vào Supabase organization chỉ để nhận email. Chưa có SMTP khả dụng thì Auth cloud pilot chưa ready; vẫn triển khai/test Auth bằng local mail capture. Không hứa email production miễn phí vô hạn.

## 3. CAS, offline và retention

Giữ CAS toàn entity cho preferences/profile/plans/selections/checkins; không tự merge các field khác nhau trong MVP. Conflict UI trình bày local/remote và cho chọn hoặc hợp nhất có preview; quyết định tạo operation mới với revision mới nhất. Server clock không quyết định bên thắng. Events append bằng UUID/idempotency; clear dùng tombstone. Timer/checklist/focus giữ theo device.

| Dữ liệu | Chính sách pilot |
|---|---|
| Lịch sử luyện tập/checkins/plans/matches | Giữ đến khi user xóa hoặc đóng account; không trim theo giới hạn client cũ |
| Conflict chưa giải quyết / pending outbox | Không tự xóa; nhắc xử lý/export, không gửi nội dung riêng tư vào logs |
| Conflict đã giải quyết | Giữ local30 ngày sau resolution, rồi được dọn nếu quyết định đã ack và không còn pending phụ thuộc; user có thể export trước |
| sync receipts/change log/tombstones/import mappings | Giữ toàn pilot, **không TTL/GC tự động**. Theo dõi dung lượng; thiết kế GC ở PR6 với minimum cursor, replay horizon, reset_required và tests trước khi dọn |
| Legacy localStorage/rescue exports | Không tự xóa hoặc upload; người dùng giữ file. Raw hỏng vẫn phục hồi được |
| Operational logs | Mục tiêu30 ngày, chỉ metadata outcome/latency/error; không token, OTP, email, notes hoặc backup payload |

Không hứa retention vô hạn trên free quota. Khi ledger tăng gần ngưỡng, ưu tiên kế hoạch GC đã kiểm chứng hoặc nâng gói được duyệt, giữ khả năng local/offline; không xóa receipts làm retry sinh trùng.

## 4. Backup và xóa account

Free không được coi là có automatic DB backup/PITR/SLA. Mục tiêu pilot: **RPO24 giờ, RTO1 ngày làm việc** khi job và quy trình restore đã được kiểm chứng; đây là target, chưa phải bảo đảm đang hoạt động.

- Trước nhận dữ liệu thật: cấu hình backup mã hóa hằng ngày ra kho riêng ngoài Supabase, quyền truy cập hẹp; giữ7 bản ngày +4 bản tuần, tuổi tối đa35 ngày. Cấu hình tên/đường dẫn theo allowlist, không public bucket/Git repo/GitHub artifact chứa plaintext. Không tự cấp quyền kho chưa được kết nối.
- Backup bao gồm schema/data/RLS/functions/grants và kế hoạch phục hồi Auth identities/sessions theo khả năng export/import được Supabase hỗ trợ; không coi `pg_dump` schema public là đủ. Nếu chưa thể phục hồi Auth identity thì restore drill chưa đạt, giữ gate pilot đóng.
- Backup trước migration rủi ro; restore drill trước pilot và mỗi tháng khi automation/operator được thiết lập. Restore DB đổi sync epoch để full-resync, bảo toàn outbox/conflict. JSON user export là cứu hộ bổ sung, không thay DB backup.
- Nếu chưa có nơi lưu backup an toàn/credential/job, ghi trạng thái **chưa vận hành**; chỉ dùng dữ liệu giả/local, không quảng bá đã có sao lưu tự động. Không hứa Codex chạy nền ngoài phiên khi chưa tạo automation.
- Xóa account: user reauthenticate, xem preview và cơ hội export; revoke/quiesce writes, xóa Auth identity và dữ liệu own account/ledgers theo workflow đặc quyền, mục tiêu hoàn tất active storage trong24 giờ. Gate chống request pending tái tạo dữ liệu; chỉ xác nhận hoàn tất sau khi server ack. Backup cũ hết theo lịch tối đa35 ngày, không hứa xóa tức thì khỏi mọi bản sao. Giữ deletion marker được mã hóa, chỉ định danh account tối thiểu và thời điểm xóa, không email/nội dung tập, trong cửa sổ backup tối đa35 ngày để restore không resurrect account đã xóa; replay purge trước khi mở server phục hồi.
- Cache trên máy offline và JSON user đã tải không thể remote wipe tức thời. Thiết bị reconnect purge theo policy, pending cần export hoặc loại bỏ có xác nhận, không nhập vào account mới.

## 5. Thứ tự triển khai và readiness

Tiếp theo là PR1a: migrations/schema/RLS/RPC contracts/backend CI trên local ephemeral, tests A/B/anon, CAS/replay/cursor; chưa sửa ứng dụng live hoặc tạo production DB. Sau đó PR1b Auth opt-in staging; các PR2–PR6 theo [kiến trúc](ARCHITECTURE_V6_DATABASE.md).

Gate cloud pilot thật: quyền Supabase project đúng môi trường, xác nhận region/quota, SMTP hoạt động, backup destination/job và restore drill đạt, privacy/export/delete được kiểm thử, CI đúng HEAD, feature flag opt-in. Owner đã ủy quyền lựa chọn kỹ thuật; thiếu quyền truy cập/cấu hình thực tế là công việc còn lại, không phải quyết định kỹ thuật cần hỏi lại.
