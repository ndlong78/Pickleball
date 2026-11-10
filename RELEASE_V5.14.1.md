# V5.14.1 — trạng thái đồng bộ theo hàng chờ hiện tại

Sau một lượt gửi thành công, lưu thêm mục tiêu/check-in hoặc lưu ở tab khác từng giữ thông báo “Đã đồng bộ” bên cạnh hàng chờ mới. UI giờ cập nhật kết quả theo snapshot hiện tại: còn pending thì nhắc gửi tiếp, có conflict/blocked thì yêu cầu review. Khi gửi hiển thị đang xử lý; đổi nguồn/tài khoản bỏ kết quả cũ.

Không tự gửi hoặc thay đổi queue, Auth/RPC/RLS, schema hay dữ liệu khách. Giữ URL opt-in staging và gửi thủ công. Package/build/assets/cache đồng bộ5.14.1; kiểm upgrade từ5.14.0 giữ dữ liệu local. Hai regression mock Auth/RPC + native IndexedDB phủ ba thay đổi mới cùng tab và cập nhật qua tab khác; real Auth local trong CI là evidence riêng.

Workers preview: thêm block top-level `previews:{}` theo yêu cầu Wrangler4.158.0, sau khi log Cloudflare PR xác nhận thiếu block làm preview thất bại. [Runbook](docs/CLOUDFLARE_WORKERS_STAGING.md) phân biệt Production/Previews Base và lệnh build đầy đủ có `_redirects`. Không đổi deployment chính hoặc mở sync trên preview.

PR chưa merge/deploy; CI exact HEAD ghi trong mô tả PR sau đọc logs. Operator đã cung cấp ảnh build5.14.0/flag=true và UI nguồn tài khoản trên staging, nhưng ảnh hàng chờ chưa thay kiểm chứng Managed writes/đọc lại ở browser khác, A/B/conflict/expiry hoặc physical QA. Chưa mở pilot dữ liệu thật.
