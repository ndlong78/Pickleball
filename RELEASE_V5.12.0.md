# V5.12.0 — điểm dừng Court theo tài khoản trên trình duyệt

Court có nút tạm dừng/lưu vị trí và khôi phục điểm dừng sau reload. Người dùng xem preview và xác nhận; timer không tự chạy lại hoặc tạo buổi tập. CAS/consent/own ACK plan/epoch fences, hai tab, quota retry và A→B guards bảo toàn điểm dừng và kho khách.

[Hợp đồng và giới hạn](docs/COURT_CHECKPOINT_PR5B2B2.md). Nền main sau #32/V5.11.0 đã merge/deploy và CI sạch. V5.12.0 đang ở PR, chưa merge/deploy; exact HEAD CI ở mô tả PR. Checkpoint chỉ local, chưa nằm trong export hiện tại; RAM sau lần lưu gần nhất chưa được giữ qua reload. Academy timer vẫn RAM; full backup/purge và pilot gates còn lại.

Năm flags vẫn tắt, URL/key trống; giữ8 route/80 bài/18 keys/schema1/SQL/RLS/protocol. Review chưa cần cấu hình. Không tự merge, mở signup hoặc dùng production. Staging SMTP/expiry và QA thiết bị thật chưa được kiểm chứng.
