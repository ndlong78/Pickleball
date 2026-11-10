# Gói upload staging PickleUp

## Bản sửa5.14.1 — PR #40

[Tải ZIP5.14.1](https://github.com/ndlong78/Pickleball/raw/refs/heads/feature/v5.14-staging-download/downloads/pickleup-staging-5.14.1.zip). Source hiện tại `4e17d5c803cc80d0fa1c128207cccb21007ae325`, [PR #40](https://github.com/ndlong78/Pickleball/pull/40). Gói102 tệp runtime đã đối chiếu từng byte với source; các commit config/test sau13bddb6 không thay bytes của static package. Manifest ghi source/hash và trạng thái chưa merge tại lúc đóng gói.

Sửa thông báo sync cũ sau thay đổi cùng tab/qua tab khác; giữ opt-in và gửi thủ công. Source bổ sung block Wrangler `previews:{}` cho PR builds; config này không phải asset upload. Check Cloudflare đã success tại source hiện tại: [build817bbeb2](https://dash.cloudflare.com/30960f67a013cb4a835d79f2194508a0/workers/services/view/pickleup-staging/production/previews/fix-v5-14-1-sync-status/builds/817bbeb2-9250-496e-9fb7-73fbfd43b977). GitHub Actions [UI42831272660](https://github.com/ndlong78/Pickleball/actions/runs/42831272660)/[backend42831272587](https://github.com/ndlong78/Pickleball/actions/runs/42831272587) của HEAD cuối đã được đọc logs:332 unit,540 Chromium/WebKit +10 lượt WebKit bổ sung,3 HTTP host,1 Workers local,275 pgTAP,45 REST và Auth local thật hai engines pass,0 fail/flaky/retry. Cả ba checks cùng HEAD đều success; owner merge PR riêng trước upload/deploy lên domain chính.

Gói chưa kiểm chứng trên domain chính/Managed staging. Cách giải nén/upload như5.14.0 bên dưới; build cần hiển thị5.14.1 và flag=true trên URL thử. Check preview xanh không mở sync trên preview host hoặc thay nghiệm thu Managed.

SHA256 ZIP5.14.1: `a85cbc00f9fac7a639a075e3e6259d6a4c75e7cbbd47b4cf56ad8a589b9f055c`

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
