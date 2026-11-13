# V5.21.0 — CMS nội dung Học viện và video YouTube

## Thay đổi
- **`curriculum.js` thành nguồn nội dung duy nhất** (JSON giữa hai dấu mốc + adapter cố định); `advanced-curriculum.js` chỉ còn là adapter. Dữ liệu 80 bài giống hệt bộ sinh cũ.
- **Trang `cms/`**: tìm bài, sửa tên, mục tiêu, chuẩn bị, 3 điểm cần nhớ, lỗi thường gặp, drill; thêm video YouTube theo góc quay (sau lưng, bên hông, trên cao, phía trước) và giây bắt đầu/kết thúc; kiểm lỗi ngay; tự tăng `revision`; bản nháp trên trình duyệt; xuất `curriculum.js` để tải lên GitHub qua pull request.
- **Khóa trường chấm điểm** (đề kiểm tra, mục tiêu /20, vùng, số phút drill, kỹ năng, cấp độ) bằng `assessmentHash`; đổi đề cần PR lưu phiên bản đề theo lượt điểm.
- **Video trong bài Học viện**: tầng 1, dưới sơ đồ sân; chọn góc quay; chỉ nhúng `youtube-nocookie.com` sau khi bấm xem; báo cần mạng khi offline.
- **CI**: `scripts/check-content.cjs --previous` so với bản base, chặn xóa bài, lùi phiên bản, sửa không tăng `revision`.
- **Service worker** bỏ qua `/cms/` để CMS không thay shell offline của app.
- **Domain Workers là trang công khai**: `https://pickleup-staging.home-309.workers.dev` là host chính cho người tập. Trang Dữ liệu ở đây mặc định chỉ hiện Sao lưu và Cứu hộ dữ liệu khách. Thẻ đăng nhập, đồng bộ, hoạt động, giáo án tài khoản, nhập và dọn cache chỉ hiện với URL vận hành `?pilot=account-data`, `?pilot=preferences-checkins` hoặc `?maintenance=account-cache`; Web Vitals chỉ hiện với `?debug=1`. Nút "mở thử" trong thẻ đồng bộ vì vậy không còn hiện ở URL thường; operator vào thẳng URL pilot. Chỉ đổi phần hiển thị: Auth, RLS, dữ liệu và cờ pilot không đổi.

## Tương thích và dữ liệu
- Không đổi localStorage/IndexedDB, Auth, SQL hay dependency. Lượt điểm cũ coi là phiên bản đề 1.
- Đối tượng bài ở runtime thêm `status`, `revision`, `assessmentVersion`, `media`; giữ nguyên các trường cũ.
- Dung lượng tải nội dung sau gzip: 9,6 KB → 13,8 KB.
- App/assets/PWA `5.21.0` (`pickleup-shell-v5-21-0-stable`); test nâng cấp xóa cache 5.20.0.

CMS: `https://pickleup-staging.home-309.workers.dev/cms/`. Hướng dẫn: [docs/CMS_GUIDE.md](docs/CMS_GUIDE.md) · thiết kế: [docs/CONTENT_VERSIONING_CMS.md](docs/CONTENT_VERSIONING_CMS.md).
