# PR1b — email OTP và phiên (flag mặc định tắt)

Nền: main baf60b9, PR #12 đã merge; không có PR mở khi bắt đầu. Auth mặc định tắt. Không provision/deploy cloud hoặc mở signup production.

Adapter duy nhất `modules/auth-adapter.js` dùng Supabase JS 2.57.4 bundled cùng app (MIT, build lại bằng `npm run build:auth`). UI không gọi Supabase trực tiếp. SDK sở hữu session persistence/refresh và broadcast giữa tab; auth generation loại phản hồi cũ, AbortController hủy private RPC. Session hết hạn ẩn trạng thái xác thực; SDK refresh thành công mới khôi phục. Logout scope local: trình duyệt này, không revoke thiết bị khác; nếu offline/revoke thất bại UI yêu cầu thử lại, không hứa đã thu hồi server. Không tạo/cập nhật profile từ UI; nút kiểm truy cập gọi pull_changes, kiểm domain status trong HTTP200. Không thay RLS hoặc ghi bảng.

Tất cả dữ liệu luyện tập hiện còn guest/local trên thiết bị, dùng chung giữa người dùng cùng browser. Đăng nhập không gán ownership, nhập localStorage hay sync. Nội dung này hiển thị trong UI. Không có account training cache/outbox trong PR1b.

## Cấu hình staging sau review

- Dùng project staging riêng, áp dụng migrations PR1a; chưa có quyền/project/SMTP staging được kết nối trong tác vụ này.
- Điền URL HTTPS và **sb_publishable_** key vào `modules/auth-config.js`, bật enabled chỉ ở staging được cấp quyền. Không dùng service_role, secret key, DB password; frontend không chấp nhận key khác publishable. Cờ trong repo luôn false.
- Supabase email OTP: confirmations on, template dùng `{{ .Token }}` (6–10 chữ số), expiry và rate limits server; frontend chờ60s gửi lại chỉ là UX, không thay server anti-abuse. Signup checkbox điều khiển shouldCreateUser; không bật public signup production.
- Site URL và redirect allowlist staging phải đúng `/Pickleball/`. Luồng này chỉ nhập mã, detectSessionInUrl=false, không hỗ trợ magic link/PKCE callback. SW bỏ qua auth/REST và query callback nhạy cảm; không lưu token vào URL/log/export.
- SMTP staging cần cấu hình qua dashboard/kết nối bảo mật, kiểm delivery, spam, quota và rate limits trước pilot. Không gửi secret qua chat.

## Kiểm thử

`npm run test:unit`: gồm adapter mocked, A→B khi private response đến muộn, logout, rate limit, OTP hết hạn. `tests/auth.spec.cjs`: SDK thật với transport mock, OTP/restore/multi-tab/logout, host mô phỏng prefix Pages; tắt screenshot/trace/video, SW bị block ở suite mock. Không gọi đây là Auth/RLS integration.

`python3 scripts/test_auth.py`: integration không mock GoTrue/Mailpit/Postgres/PostgREST trên Supabase local, chạy sau migration reset. Yêu cầu Supabase CLI2.54.11 trên PATH và Docker; `supabase start` không loại mailpit, sau đó `supabase db reset --local`. Script lấy local keys/OTP/session vào memory, không in chúng. Gửi OTP→Mailpit→verify A/B→apply_operation profile CAS→pull private data→refresh→logout/revoked refresh. Backend CI chạy script này; trạng thái cuối phải kiểm đúng PR HEAD.

Executor local đã thử full Supabase nhưng image PostgreSQL17.6.1.029 giải nén hết disk với VFS. Không gọi JWT fixture PR1a là Auth thật. Chromium/WebKit và integration CI: evidence cụ thể ở PR, không suy từ code. Chưa staging SMTP, thiết bị thật, production, hoặc magic link; không có importer/sync engine.

PR13 đã merge thành5d99168 ngày30/10/2026; backend/responsive và Pages của merge SHA thành công (242 browser tests pass, không flaky). Auth code đã deploy cùng5.2.0, chưa bật đăng nhập staging/production hoặc SMTP thật.
