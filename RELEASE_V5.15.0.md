# V5.15.0 — thử hoạt động và giáo án tài khoản trên staging

Thêm chế độ `pilot=account-data` trên đúng Workers origin/project staging, với nút mở thử và nhãn phiên bản trong Dữ liệu. Mở các flags mục tiêu/check-in, hoạt động và giáo án để người dùng chọn nguồn riêng; importer vẫn tắt. Link PR6a chỉ mục tiêu/check-in giữ tương thích. URL thường/preview/Pages/config sai fail closed.

Học viện, đánh giá, trận đấu, giáo án/lựa chọn và nhật ký own ACK plan dùng các luồng đã có. Chỉ dữ liệu mới sau chọn nguồn được lưu vào account queue và gửi thủ công; không nhập dữ liệu khách cũ hoặc tạo attendance tự động. Banner/notice ghi phạm vi dữ liệu giả và phần timer/checklist/checkpoint còn local. Hoạt động/giáo án không giữ success cũ khi queue thay đổi.

Shared gate lazy sau Auth config; package/build/assets/cache đồng bộ5.15.0, kiểm upgrade từ5.14.1 giữ dữ liệu local. Không SQL/RLS/Auth transport/IDB schema/dependencies thay đổi. [Hợp đồng và nghiệm thu](docs/STAGING_ACCOUNT_PR6B.md).

PR chưa merge/deploy. Các test mock/native IDB, Auth local thật và Managed operator evidence được ghi tách biệt ở PR đúng HEAD. Chưa mở pilot dữ liệu thật hoặc hoàn tất restore/purge/backup/SMTP/QA thực tế. Owner merge riêng; GitHub → Cloudflare tự build/deploy, không upload thủ công.
