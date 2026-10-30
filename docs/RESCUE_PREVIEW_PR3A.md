# PR3a — cứu hộ legacy và preview chỉ đọc

Nền main bbaa9dd (PR14 merge). Main backend/responsive/Pages thành công đúng merge SHA. PR3 chia nhỏ để bảo toàn dữ liệu trước khi viết importer: PR3a là rescue+inventory preview; PR3b mới làm domain mapping/validation/quarantine/overlap, preview account consent và RPC import transactional. Không gọi PR3a là importer hoàn chỉnh.

## Hành vi hiện có

V5.3.0 thêm mục trong Dữ liệu: xem dữ liệu thiết bị → kiểm kê → tải raw rescue. Module chỉ lazy-load ở settings, không tải ở Home. Tám route và backup/restoreV1 cũ giữ hợp đồng; không tự import, không viết localStorage/IDB, không gọi Auth/RPC, không bật flag Auth/sync. Không đổi nguồn dữ liệu các domain.

Danh mục18 khóa theo DATA_DICTIONARY, gồm timer/checklist/focus và bài Học viện gần nhất (raw string không JSON). Export giữ raw nguyên văn, present/absent riêng (null khác chuỗi rỗng), không parse/normalize hoặc trim lịch sử quá giới hạn V5. Known keys luôn có mặt trong artifact, kể cả absent. Unknown pickleup_* phải được xem tên/count và chọn từng checkbox, mặc định không kèm. Chỉ đọc localStorage, không dump cả origin, không export kho V6 hoặc session.

Tên khóa chứa auth/session/token/secret/password/credential/supabase/otp bị loại trước khi đọc giá trị. Trường credential phổ biến trong raw và prefix sb_secret_ làm toàn lần export bị từ chối, không sửa/xóa raw. Đây là kiểm soát bảo vệ kho session, không phải công cụ tự phân loại bí mật trong ghi chú tự do. Tệp vẫn chứa dữ liệu riêng tư, UI nhắc giữ ngoài browser tại nơi an toàn. Không log raw, nội dung file, token hoặc OTP.

`raw-rescue-v1`, schemaVersion1, adapterVersion1: entries gồm key/present/raw; fingerprint SHA256 canonical entries sorted code-point theo key. fingerprint không phụ thuộc exportedAt hoặc metadata khác; preview kiểm checksum, trùng key, đủ18 keys và marker đúng. Không phải chữ ký xác thực chống người có thể sửa cả payload+hash. BackupV1 và export Home được nhận diện riêng; semantic hash gồm source format và toàn payload trừ exportedAt, object keys sort, array giữ thứ tự/duplicates; có fileHash riêng của bytes file đọc. Không tự dedupe theo hash hay chuyển điểm thành attendance.

Capture đọc hai lần quanh bước hash, download đọc lại và so fingerprint với snapshot đã preview. Nếu thấy đổi thì dừng, yêu cầu tạm dừng thao tác/đóng tab khác và xem lại. localStorage không snapshot atomic: không hứa phát hiện mọi ABA race hoặc writer không tuân thủ giữa hai lần đọc. Không tự lấy snapshot sau lỗi để giả dữ liệu đã ổn định.

Preview hiển thị đọc được/không có/rỗng/JSON lỗi/chưa biết/chỉ thiết bị, dung lượng và số phần tử cấp đầu. **Không** gọi JSON parse được là domain valid, không gọi số field/checklist/score là buổi tập. Chưa có phân loại valid/invalid record-level, orphan/overlap/server conflicts; không có nút xác nhận nhập giả khi RPC chưa tồn tại. File chọn chỉ được đọc vào memory, UI dùng textContent; không lưu/import/upload hoặc hiện raw values.

Giới hạn file32MiB, JSON depth30, tối đa128 top-level fields; raw18+128 unknown keys, key≤160 ký tự. Capture chừa4KiB metadata để artifact dưới giới hạn file. Giới hạn là reject có thông báo, không cắt/xóa nguồn. Khóa unknown quá dài/bảo mật không được kèm; khóa legacy18 vẫn luôn giữ. Không đổi giới hạn backup importerV1 cũ1MB. PR3b sẽ dùng batching/quarantine và domain validators trước mọi thao tác ghi.

## Kiểm chứng và giới hạn

Unit kiểm đủ18, raw hỏng/rỗng/absent/device string, credential exclusion/opt-in unknown, source mutation/permission denied, checksum/tamper, fingerprint semantic/order/duplicates và history501 không trim. Browser Chromium/WebKit kiểm downloads, preview file chỉ đọc/XSS-as-text, snapshot đổi và viewport390/820/1180/1440, offline reload settings đã cache dưới /Pickleball/.

Local Chromium1187 với runner1.64 là compatibility probe, tách khỏi CI engine chuẩn. CI giữ unit/regression/backend Auth thật hiện hữu. Exact HEAD, pass/fail/flaky và URLs ghi trong PR. Chưa QA thiết bị thật, dung lượng sát32MiB trên điện thoại, every-browser ABA snapshot, account import/consent, atomic server importer, SMTP staging hoặc full sync. PR3a không cần secret/project mới.
