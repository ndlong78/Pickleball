# Hướng dẫn sửa giáo án và thêm video (CMS)

Dành cho HLV và người quản lý nội dung. Không cần cài đặt hay tài khoản trả phí; chỉ cần tài khoản GitHub có quyền mở pull request vào repo.

## 1. Quay và tải video lên YouTube (miễn phí)
1. Quay video ngắn **15–40 giây**, quay ngang, không cần tiếng. Mỗi bài nên có 1–3 góc: **sau lưng** (thấy đường bóng), **bên hông** (thấy mặt vợt và cổ tay), **trên cao** (thấy vị trí trong Kitchen).
2. Mở app YouTube → nút **+** → **Tải video lên**.
3. Ở mục chế độ hiển thị chọn **Không công khai (Unlisted)**: chỉ người có link mới xem được, video không hiện trên kênh hay kết quả tìm kiếm.
4. Ở mục đối tượng người xem, chọn "Không, nội dung này không dành cho trẻ em" nếu đúng như vậy.
5. Sau khi tải xong, bấm **Chia sẻ → Sao chép đường liên kết** (dạng `https://youtu.be/xxxxxxxxxxx`).

## 2. Sửa bài trong CMS
1. Mở `https://pickleup-staging.home-309.workers.dev/cms/` trên máy tính (điện thoại vẫn dùng được nhưng màn hình nhỏ).
2. Chọn bài ở danh sách bên trái (tìm theo mã `PU-012` hoặc tên).
3. Sửa tên, mục tiêu, chuẩn bị, **3 điểm cần nhớ**, lỗi thường gặp, nội dung drill.
4. Phần **Video**: bấm **+ Thêm video**, dán link YouTube, chọn góc quay, có thể đặt giây bắt đầu/kết thúc.
5. Ô đỏ ở mục Trạng thái liệt kê lỗi cần sửa. Nút xuất chỉ bật khi không còn lỗi.
6. **Đổi đề kiểm tra** (vùng mục tiêu, hướng dẫn kiểm tra, mục tiêu /20): sửa được từ V5.23.0, nhưng mỗi lần sửa là một **phiên bản đề mới**. Điểm cũ của người tập ở bài đó vẫn được giữ, nhưng không còn so với điểm mới và xu hướng bắt đầu lại. CMS hiện cảnh báo vàng và yêu cầu đánh dấu ô **"Tôi hiểu…"** ở mục Xuất bản thì mới xuất được. Sửa chính tả trong các ô này cũng tính là đổi đề, nên chỉ sửa khi thật sự cần.
7. Trường có dấu 🔒 (số lượt kiểm tra 20, số phút drill, kỹ năng, cấp độ) vẫn khóa.

Bản nháp tự lưu trên trình duyệt đang dùng. Đổi máy hoặc xóa dữ liệu trình duyệt sẽ mất bản nháp chưa xuất.

## 3. Xuất bản
1. Bấm **Tải curriculum.js**.
2. Mở trang tải tệp của repo: `https://github.com/ndlong78/Pickleball/upload/main`, kéo tệp `curriculum.js` vừa tải vào (thay tệp cũ cùng tên).
3. Chọn **Create a new branch for this commit and start a pull request**, đặt tên ngắn (ví dụ `content/pu-012-video`), bấm **Propose changes**, rồi **Create pull request**.
4. Chờ CI chạy xanh. Nếu đỏ, mở log bước *Validate Academy content* để xem lỗi, sửa lại trong CMS và tải tệp mới lên cùng nhánh.
5. Owner xem thay đổi và merge vào `main`. Cloudflare Workers tự build từ GitHub và cập nhật `https://pickleup-staging.home-309.workers.dev` sau vài phút.

## 4. Lưu ý
- Không sửa tay cấu trúc `curriculum.js` trên GitHub: chỉ xuất từ CMS. CI sẽ từ chối tệp sai định dạng.
- Không xóa bài: chuyển trạng thái **Ngừng dùng (retired)** để lịch sử điểm vẫn hiển thị đúng tên bài.
- Video cần mạng để xem. YouTube có thể tự chèn quảng cáo vào video nhúng.
- Muốn thêm bài mới (PU-081 trở đi) hoặc đổi số phút drill, kỹ năng, cấp độ cần PR kỹ thuật riêng; xem [CONTENT_VERSIONING_CMS.md](CONTENT_VERSIONING_CMS.md).
