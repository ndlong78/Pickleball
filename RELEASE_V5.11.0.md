# V5.11.0 — checklist Học viện theo tài khoản trên thiết bị

PR5b2b1 giữ checklist và bước tập trung Học viện qua reload trên cùng trình duyệt, cách ly account A/B và kho khách. Hai tab cập nhật từng bước nguyên tử; quota có rollback/retry, dữ liệu hỏng không bị ghi đè. Timer vẫn chỉ RAM và không tự xác nhận buổi tập.

[Hợp đồng, kiểm thử và giới hạn](docs/ACADEMY_DEVICE_STATE_PR5B2B1.md). Nền main sau #31/V5.10.0 đã merge, CI/Pages sạch theo evidence trong hợp đồng. Bản5.11.0 đang ở PR, chưa merge/deploy; exact HEAD CI trong mô tả PR. Đây chưa là full device state, full V6 backup hoặc purge. State mới chỉ local, chưa nằm trong bản xuất hiện tại; có thể mất khi xóa dữ liệu trình duyệt.

Giữ năm flags tắt, URL/key trống, tám route/80 bài/18 keys, schema1 và SQL/RLS/protocol. Review chưa cần cấu hình. Staging SMTP/expiry, backup/recovery/privacy và QA thiết bị/PWA thật còn gate; không mở pilot hoặc tự merge.
