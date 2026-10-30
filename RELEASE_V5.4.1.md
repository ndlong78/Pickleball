# V5.4.1 — đăng xuất HTTP204 và kiểm chứng Auth/import thật (PR3d)

GoTrue logout trả204 không có body. Guarded fetch trước đây dựng lại Response với ArrayBuffer rỗng, gây TypeError và ngăn SDK hoàn tất xóa session/broadcast logout sang tab khác, dù server đã chấp nhận revoke. Bản vá giữ null body cho204/205/304 và giữ nguyên kiểm tra generation để loại phản hồi tài khoản cũ. Mock SDK browser regression nay trả204 đúng GoTrue; unit kiểm null-body, error JSON và stale generation.

Thêm CI UI OTP→GoTrue/Mailpit local thật→import/reload/replay/canonical reconcile trên Chromium/WebKit, account A/B và logout nhiều tab, native IDB/SW dưới `/Pickleball/`. Fixture loopback ánh xạ public alias sang anon JWT local, không thay Auth/RPC result; chưa là evidence Managed gateway hay SMTP staging. Không trace/screenshot/video/storageState hoặc credentials trong report.

Version/build/assets/cache đồng bộ5.4.1, cache mới `pickleup-shell-v5-4-1-stable`; regression nâng từ cache5.4 giữ local training data. Không đổi schema/RLS/storage keys hoặc bật flags; tám route vẫn dùng legacy. Không thêm sync engine/repair importer. PR chưa merge/deploy, exact HEAD CI và các lần fail trước ở PR #18; chưa staging SMTP, thiết bị thật, quota/eviction/load hoặc browser JWT expiry/auto-refresh theo thời gian thực. Xem [hợp đồng PR3d](docs/AUTH_IMPORT_BROWSER_PR3D.md).
