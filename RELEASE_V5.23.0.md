# V5.23.0 — CMS cho phép đổi đề kiểm tra thành phiên bản đề mới

## Thay đổi
- **CMS**: sửa được vùng mục tiêu, hướng dẫn kiểm tra và mục tiêu /20 của bài. Mỗi lần xuất bản thay đổi này là một **phiên bản đề mới** (tự tăng đúng 1). CMS cảnh báo trên bài, gắn nhãn "đổi đề" và chỉ cho xuất khi đánh dấu ô xác nhận. Số lượt (20), số phút drill, kỹ năng, cấp độ vẫn khóa.
- **Kiểm tra nội dung (CMS và CI)**: đề đổi thì phiên bản đề phải tăng đúng 1; đề không đổi thì phải giữ nguyên.
- **Lịch tuần** không còn dùng điểm khách theo đề cũ để xếp ưu tiên "giảm điểm" hoặc "chưa đạt mốc" (bổ sung cho V5.22.0).
- Người tập chỉ thấy khác khi một bài thật sự đổi đề: điểm cũ được giữ, ghi "theo đề kiểm tra cũ", xu hướng bắt đầu lại với đề mới.

## Tương thích và dữ liệu
- Không đổi localStorage/IndexedDB, SQL/RPC/RLS, Auth hay dependency. Nội dung 80 bài không đổi trong bản này.
- Giới hạn đã biết: Tổng quan và điểm nền HLV cá nhân vẫn tính điểm gần nhất kể cả theo đề cũ. Xem [CONTENT_VERSIONING_CMS mục 12](docs/CONTENT_VERSIONING_CMS.md).
- App/assets/PWA `5.23.0` (`pickleup-shell-v5-23-0-stable`); test nâng cấp xóa cache 5.22.0.

Hướng dẫn HLV: [docs/CMS_GUIDE.md](docs/CMS_GUIDE.md).
