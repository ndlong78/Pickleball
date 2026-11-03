# V5.9.0 — nhật ký tập tài khoản

PR5a2d nối Court với kho hoạt động tài khoản: ghi drill/kiểm tra riêng từ own plan đã ACK, local-first và gửi/retry chủ động. Mọi reader nhật ký dùng cùng facade; phân trang không trim1000, so sánh tách plan/bài/cấp độ/kind/conditions. Xóa và review giữ intent; quota và A→B không ghi nhầm kho khách. Không tự tạo attendance hoặc lượt tập từ điểm/timer.

Năm flags vẫn false, URL/key rỗng, chưa merge/deploy5.9.0 hoặc mở pilot. Main5.8 đã deploy nhưng backend sau merge #29 fail fixture dependency; bản này có regression và sửa sequencing fixture, cần CI đúng HEAD sạch. [Hợp đồng/kiểm chứng/giới hạn](docs/TRAINING_ACCOUNT_PR5A2D.md), [tiến độ V6](docs/V6_PROGRESS_REVIEW.md). Academy lesson selection, full backup/privacy và staging/QA thật còn lại.
