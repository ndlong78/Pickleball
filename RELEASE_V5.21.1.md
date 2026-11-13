# V5.21.1 — Nhãn link sang trang Dữ liệu và test CMS bền với nội dung

## Thay đổi
- **Học viện, Hành trình, Tiến bộ**: nút "Chọn nguồn / đồng bộ" đổi thành **"Sao lưu và dữ liệu trên thiết bị"**. Từ V5.21.0, trang Dữ liệu trên site công khai chỉ hiện Sao lưu và Cứu hộ; thẻ chọn nguồn và đồng bộ chỉ hiện với URL vận hành `?pilot=…`/`?maintenance=…`. Vì vậy nhãn cũ hứa một tính năng người tập không thấy. Link vẫn trỏ tới `?page=settings#performanceDiagnostics`; thông báo nguồn dữ liệu trên từng trang giữ nguyên.
- **Test CMS** (PR #52, đã merge): `tests/content-cms.spec.cjs` lấy PU-001 trong `curriculum.js` làm mốc, nên nội dung sửa qua CMS (ví dụ thêm video) không làm đỏ CI nữa.
- Test mới: link từ các trang sang Dữ liệu không được dùng chữ "đồng bộ"/"chọn nguồn".

## Tương thích và dữ liệu
- Không đổi localStorage/IndexedDB, Auth, SQL, nội dung giáo án hay dependency.
- App/assets/PWA `5.21.1` (`pickleup-shell-v5-21-1-stable`); test nâng cấp xóa cache 5.21.0.
