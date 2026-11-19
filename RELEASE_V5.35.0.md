# V5.35.0 — Mở đăng ký tài khoản (kế hoạch cloud, bước D)

## Thay đổi
- Trên host chính, ai cũng tạo được tài khoản: nhập email, tích **Đăng ký tài khoản mới nếu chưa có**, bấm **Gửi mã OTP**, nhập mã nhận qua email. Không cần mật khẩu.
- Chỉ tạo tài khoản khi người dùng tích ô đăng ký; đăng nhập với email gõ nhầm không tạo tài khoản mới.
- Thông báo rõ: email chưa có tài khoản → nhắc tích ô đăng ký; đăng ký bị tắt phía máy chủ → "Đăng ký mới đang tạm đóng…"; gửi mã thành công → nhắc xem thư rác.
- Mục **Dữ liệu tài khoản và xóa tài khoản** trong Tài khoản: dữ liệu nào được lưu, lưu ở đâu, không dùng cho quảng cáo; chưa có nút tự xóa, yêu cầu xóa gửi người quản trị.

## Không đổi
- SQL, RLS, RPC/CAS, IndexedDB 3, 18 khóa localStorage, dependency. Bước B (chưa đăng nhập không lưu được) và lời mời nhập dữ liệu cũ (bước C) giữ nguyên. GitHub Pages và host khác vẫn không có đăng nhập.

## Kiểm chứng và giới hạn
Owner báo đã bật đăng ký trong Supabase (19/11/2026) và SMTP riêng (15/11). Bản này: unit, Playwright Chromium cục bộ (mock Auth/RPC); WebKit chỉ có CI; **chưa thử đăng ký thật** trên project thật và thiết bị thật. Xóa tài khoản chưa tự động (làm thủ công trong Supabase); backup định kỳ chưa vận hành. App/assets/PWA `5.35.0` (`pickleup-shell-v5-35-0-stable`); test nâng cấp xóa cache 5.34.0. Kế hoạch: [docs/CLOUD_DEFAULT_PLAN.md](docs/CLOUD_DEFAULT_PLAN.md).
