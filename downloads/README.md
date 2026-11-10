# Gói upload staging PickleUp

## Bản sửa5.14.1 — PR #40

[Tải ZIP5.14.1](https://github.com/ndlong78/Pickleball/raw/refs/heads/feature/v5.14-staging-download/downloads/pickleup-staging-5.14.1.zip). Nguồn `13bddb6d3a43e47692ff0a6abf0cfef3231d285e`, [PR #40](https://github.com/ndlong78/Pickleball/pull/40). Gói102 tệp runtime khớp source; manifest ghi source/hash và trạng thái chưa merge tại thời điểm đóng gói. Owner merge PR riêng trước khi upload bản sửa; không deploy tự động từ nhánh tải gói.

Sửa thông báo thành công cũ khi có thay đổi mới cùng tab/qua tab khác; giữ opt-in và gửi thủ công. [UI CI42828298883](https://github.com/ndlong78/Pickleball/actions/runs/42828298883) và [backend42828298984](https://github.com/ndlong78/Pickleball/actions/runs/42828298984) của đúng source đã được đọc logs:332 unit,540 Chromium/WebKit +10 lượt WebKit bổ sung,275 pgTAP,45 REST và Auth local thật hai engines pass,0 fail/flaky/retry. Gói chưa được kiểm chứng tại Cloudflare edge/Managed staging. Cách giải nén/upload như bản5.14.0 bên dưới; build cần hiển thị5.14.1 và flag=true trên URL thử.

SHA256 ZIP5.14.1: `a85cbc00f9fac7a639a075e3e6259d6a4c75e7cbbd47b4cf56ad8a589b9f055c`

**Gate5.14.1 còn chặn:** check ngoài GitHub Actions `Workers Builds: pickleup-staging` đang failure ở cùng source, [build log trên Dashboard](https://dash.cloudflare.com/30960f67a013cb4a835d79f2194508a0/workers/services/view/pickleup-staging/production/builds/28fae355-cc6d-45c9-8a6c-c309a1bea82f). GitHub không gửi lý do; PR #40 giữ draft chờ đối chiếu log. Hai workflow UI/backend xanh không thay check Cloudflare. Gói là candidate để review, chưa đủ gate merge/deploy.

## Bản5.14.0 đã merge #39

[Tải ZIP trên GitHub](https://github.com/ndlong78/Pickleball/raw/refs/heads/feature/v5.14-staging-download/downloads/pickleup-staging-5.14.0.zip).

Nguồn: main `6cfec8ddf04f08a0bfe98997d21423292efca0cf`, sau PR #39. Gói102 tệp runtime khớp nội dung source; không gồm tests/docs/SQL hoặc dữ liệu tài khoản, OTP, session. Cấu hình frontend public giữ nguyên source đã review. Manifest bên cạnh ghi SHA256 từng tệp và ZIP.

1. Tải và giải nén ZIP.
2. Trong Cloudflare, xác nhận đang mở Worker staging `pickleup-staging` / `pickleup-staging.home-309.workers.dev`.
3. Ở New deployment → Upload static files, kéo thư mục đã giải nén chứa trực tiếp index.html, sw.js và modules/, pages/, vendor/, icons/ vào vùng upload rồi Deploy.
4. Mở `https://pickleup-staging.home-309.workers.dev/?page=settings&pilot=preferences-checkins`, tải lại trang. Console chỉ đọc `({build: window.PICKLEUP_BUILD, sync: window.PICKLEUP_SYNC_CONFIG?.enabled})` cần trả build5.14.0 và sync=true. Chỉ dùng dữ liệu giả để nghiệm thu.

Không clear site data. Upload này chưa được kiểm chứng tại edge Cloudflare/Managed staging. Kết nối GitHub–Cloudflare vẫn cần khôi phục để tự build sau merge. Nhánh này dành bàn giao gói, không cần merge vào main.

CI nguồn main đã được đọc logs: [UI42741124415](https://github.com/ndlong78/Pickleball/actions/runs/42741124415), [Backend42741124556](https://github.com/ndlong78/Pickleball/actions/runs/42741124556),0 fail/flaky/retry. Chỉ đóng gói byte-identical; không thay mã ứng dụng.

SHA256 ZIP: `e5cbdbaa0ecb6a5bcd4e7f71a83278c759c3fffdaf1985ed8aafcabb91391df1`
