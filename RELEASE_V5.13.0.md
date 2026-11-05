# V5.13.0 — cứu hộ cache V6 của tài khoản

Thêm tại Dữ liệu: chủ động chụp đủ bảy kho cache tài khoản trên máy, tải JSON và mở tệp để kiểm owner/checksum/inventory. Bao gồm pending/frozen requests, conflict/provenance, checklist/focus và điểm dừng Court; giữ nguyên JSON unknown/corrupt, không cắt lịch sử. Đổi account/logout bỏ kết quả cũ và link tải. Guest/backup V5 giữ nguyên.

Đây chưa là toàn dữ liệu cloud/backup DB và **chưa khôi phục hoặc purge**. Không gửi RPC, tự sync hoặc import localStorage. Tệp riêng tư chưa mã hóa; checksum không chứng minh khả năng restore. Fail toàn bộ khi credentials, unsupported JSON hoặc vượt32 MiB/100.000 rows.

[Hợp đồng và gates](docs/ACCOUNT_RESCUE_PR5B2C1.md), [tiến độ V6](docs/V6_PROGRESS_REVIEW.md). Baseline #33/main078f98c:306 unit/512 browser/+10 WebKit,275pgTAP/45REST/Auth thật hai engines sạch. Evidence cuối đúng HEAD ở PR; mock/native IDB, Auth local thật và staging tách riêng. Chưa staging SMTP/physical QA; không production/signup/tự merge. Năm flags tắt, URL/key trống; app/assets/cache5.13.0.
