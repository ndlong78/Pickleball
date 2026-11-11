# V5.15.1 — chặn Auth sai origin và sửa readiness sau #41

Auth config và adapter dùng cùng guard: Workers staging chính/đúng project, hoặc frontend loopback/backend loopback. Pages/preview/custom domain/config thiếu helper không tạo SDK hoặc khôi phục phiên; dữ liệu khách vẫn dùng được. Nút signup mặc định đóng, adapter từ chối tạo user khi chưa bật; OTP cho user thử đã cấp vẫn hoạt động. Supabase server signup/rate limit và thu hồi phiên cũ là việc quản trị riêng, không được chứng minh bằng cờ frontend.

Sửa test Academy A→B chờ Settings runtime và fixture Auth trước khi đổi user; nút gửi mặc định disabled trước runtime. CI thêm10 lượt WebKit không retry, dùng npm ci và pin Playwright đúng lock1.64.1. Không tăng timeout/retry hoặc giảm assertions; gate fail-on-flaky tiếp tục bật. Đồng bộ build/assets/cache5.15.1 và kiểm upgrade từ5.15.0 giữ dữ liệu guest.

[Rà soát từng nhận xét và cấu hình owner cần làm](docs/REVIEW_SAFETY_2026_11.md). PR chưa merge/deploy, không tự đổi settings repo, Supabase Managed hoặc production. Backup/rescue/epoch cần các bản vá riêng có kiểm chứng, không tuyên bố full V6 hoàn tất.
