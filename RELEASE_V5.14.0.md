# V5.14.0 — thử đồng bộ mục tiêu/check-in trên staging

Thêm URL opt-in cho đúng Workers origin/project staging để thử hai domain hiện có bằng dữ liệu giả. Mở URL thường vẫn tắt sync; importer/activity/plan còn false. Người dùng chủ động chọn nguồn, đọc và gửi; không tự nhập dữ liệu khách hoặc tự ghi attendance.

Banner/notice trên Settings và Journey/Progress ghi phạm vi thử; router giữ query, thoát URL rồi reload giữ queue/cache riêng. Đồng bộ version/build/assets/cache5.14.0, kiểm upgrade từ5.13.1 không mất guest data. Không SQL/RLS/Auth transport/IDB schema/dependencies thay đổi.

[Hướng dẫn/giới hạn](docs/STAGING_SYNC_PR6A.md). Unit, browser mock/native IDB, Workers local và Auth local thật được ghi ở PR đúng HEAD sau đọc logs. Chưa merge/deploy hoặc nghiệm thu Managed/physical QA cho mode mới; không tự merge.
