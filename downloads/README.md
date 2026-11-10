# Gói upload staging PickleUp 5.14.0

[Tải ZIP trên GitHub](https://github.com/ndlong78/Pickleball/raw/refs/heads/feature/v5.14-staging-download/downloads/pickleup-staging-5.14.0.zip).

Nguồn: main `6cfec8ddf04f08a0bfe98997d21423292efca0cf`, sau PR #39. Gói102 tệp runtime khớp nội dung source; không gồm tests/docs/SQL hoặc dữ liệu tài khoản, OTP, session. Cấu hình frontend public giữ nguyên source đã review. Manifest bên cạnh ghi SHA256 từng tệp và ZIP.

1. Tải và giải nén ZIP.
2. Trong Cloudflare, xác nhận đang mở Worker staging `pickleup-staging` / `pickleup-staging.home-309.workers.dev`.
3. Ở New deployment → Upload static files, kéo thư mục đã giải nén chứa trực tiếp index.html, sw.js và modules/, pages/, vendor/, icons/ vào vùng upload rồi Deploy.
4. Mở `https://pickleup-staging.home-309.workers.dev/?page=settings&pilot=preferences-checkins`, tải lại trang. Console chỉ đọc `({build: window.PICKLEUP_BUILD, sync: window.PICKLEUP_SYNC_CONFIG?.enabled})` cần trả build5.14.0 và sync=true. Chỉ dùng dữ liệu giả để nghiệm thu.

Không clear site data. Upload này chưa được kiểm chứng tại edge Cloudflare/Managed staging. Kết nối GitHub–Cloudflare vẫn cần khôi phục để tự build sau merge. Nhánh này dành bàn giao gói, không cần merge vào main.

CI nguồn main đã được đọc logs: [UI42741124415](https://github.com/ndlong78/Pickleball/actions/runs/42741124415), [Backend42741124556](https://github.com/ndlong78/Pickleball/actions/runs/42741124556),0 fail/flaky/retry. Chỉ đóng gói byte-identical; không thay mã ứng dụng.

SHA256 ZIP: `e5cbdbaa0ecb6a5bcd4e7f71a83278c759c3fffdaf1985ed8aafcabb91391df1`
