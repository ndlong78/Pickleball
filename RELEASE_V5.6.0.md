# V5.6.0 — PR5a2b Học viện trong kho tài khoản

Chế độ khách giữ nguyên. Mã UI pilot thêm opt-in riêng cho hoạt động, lưu/xóa lượt Academy local-first, đọc/gửi/retry thủ công, lịch sử phân trang và review trước xử lý conflict/reset. Điểm/lịch sử Học viện dùng chung source ở Academy/Journey/Progress; Coach chưa tự nạp account points sang giáo án khách. Không tự nhập dữ liệu, tạo attendance hoặc suy DUPR.

So sánh account cần cùng bài/nội dung/điều kiện được ghi rõ; giữ các lượt chưa rõ ngày hoặc tương lai ngoài phân tích, không trim lịch sử server. Latest giữ thứ tự microsecond/timezone. Điểm import chỉ có latest snapshot chưa xuất hiện trong event view; không tạo attempt giả.

Package/build/assets/PWA cache đồng bộ5.6.0. Auth/import/sync/activity flags mặc định false, chưa cloud rollout/public signup hoặc tự merge. PR CI/HEAD và giới hạn kiểm chứng ở mô tả PR; [hợp đồng PR5a2b](docs/ACADEMY_ACCOUNT_PR5A2B.md). Chưa staging SMTP/Managed gateway, QA thiết bị thật, full V6 backup/restore/purge/delete hoặc pilot dữ liệu thật.
