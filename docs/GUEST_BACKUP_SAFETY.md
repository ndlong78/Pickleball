# Backup V1 và cứu hộ dữ liệu khách — bản vá sau audit #41

Phạm vi là dữ liệu khách/localStorage, không nhập vào account, không chạm Auth/IndexedDB/RPC. Không thay backup toàn cloud hoặc restore/purge V6. Các nhận xét C1–C3/R1 được đối chiếu từ mã; bản audit cũ chi tiết không được cung cấp, nên không suy rằng mọi phát hiện trước đó đã đóng.

## Xuất và kiểm tra V1

`backup-v1-core.js` kiểm toàn bộ14 trường V1 trước khi tải tệp hoặc tạo patch. JSON lỗi/weekly data bị hỏng không bị thay bằng mặc định; UI không báo thành công và hướng sang raw rescue. Khóa vắng mặt thật sự mới dùng defaults khi xuất. Kiểm giới hạn1,000,000 byte, schema/scale/validator domain, ngày lịch hợp lệ và dấu hiệu credentials. Không đọc `pickleup_auth_v6` hoặc các khóa ngoài danh mục.

Khi nhập backup cũ, phần vắng mặt giữ nguyên. `assessment:null` và `selectedPlan:null` có nghĩa xóa rõ ràng; không bỏ qua null rồi giữ lựa chọn cũ. Validate xong toàn bộ mới hỏi xác nhận và ghi. Lỗi parser/storage chỉ ra thông báo cố định, không đưa nội dung dữ liệu hay exception riêng tư vào UI/log. Double-read phát hiện những thay đổi nguồn quan sát được khi xuất, không hứa snapshot nguyên tử với script bất kỳ cùng origin.

## Khôi phục có nhật ký bền vững

`legacy-storage.js` là primitive nhỏ nạp trước loader, không phải UI backup hay toàn bộ feature. Home chỉ đọc một khóa journal khi không có lần nhập dở; vẫn lazy các feature. Shell thêm một asset startup cho bảo toàn dữ liệu, không có tuyên bố nhanh hơn.

1. Lấy Web Lock `pickleup-guest-restore-v1` không chờ. Không có Web Locks hoặc lock đang được tab khác giữ thì từ chối trước khi ghi guest.
2. Lưu `pickleup_restore_journal_v1` gồm raw preimage và giá trị đích của đúng những khóa V1 được thay. Nếu journal không lưu được vì quota, chưa sửa guest key nào. Journal private plaintext, tối đa8 MiB; chỉ14 khóa được phép, không Auth/unknown keys.
3. Kiểm giá trị cũ trước mỗi lần ghi; kiểm tất cả đích trước khi xóa journal để commit. Chỉ báo thành công khi đủ điều kiện này. Lỗi ghi thực hiện rollback từ preimages, không silent partial success.
4. Đổi phase rollback bền vững trước khi xóa các giá trị trung gian để giải phóng quota; giữ journal đến khi bản cũ được xác minh đầy đủ. Nếu rollback vẫn thất bại, giữ journal, chặn tương tác ghi và cho tải cứu hộ riêng tư; không xóa dữ liệu hoặc tự bỏ journal.
5. Mở/reload sau crash: loader đợi recovery dưới Web Lock trước mọi feature đọc guest. Prefix applying và rollback đều phục hồi về bản cũ. Journal lỗi hoặc giá trị mới không khớp before/after thì dừng, giữ nguyên intent chưa biết thay vì ghi đè.

Tab cùng bản ứng dụng nhận storage event sẽ tạm dừng tương tác/reader, yêu cầu tải lại sau lần nhập khác. **Phải đóng các tab PickleUp cũ trước khi nhập.** localStorage không có transaction nhiều khóa thực sự; Web Locks không thể bắt script cũ, extension hay script không hợp tác cùng origin tuân thủ. Không hứa serializable với mọi script khác hoặc chống OS eviction/manual clear. CAS/double-read chỉ phát hiện thay đổi quan sát được. Đây là journal recovery của guest V1, không là thiết kế reset/restore server.

## Cứu hộ khi bị chặn

Panel độc lập `legacyStorageRecovery` có thể xuất18 raw legacy keys cùng journal đang giữ preimages. Định dạng `interrupted-guest-restore-rescue-v1` chỉ để bảo toàn file ngoài trình duyệt; không tự nhập lại hoặc đồng bộ. Không đọc Auth/cache account; từ chối nếu có dấu hiệu credentials hoặc vượt giới hạn. Không xóa các bản cũ để tạo được export.

Raw rescue18 keys thông thường không còn phụ thuộc discovery. Nếu enumeration lỗi hoặc vượt4096 keys, UI cảnh báo chỉ đọc đúng18 key đã biết, vẫn cho tải chúng. Unknown keys chỉ được kèm sau discovery thành công và user chọn rõ; credential/size/double-read/fingerprint checks vẫn giữ. Không nói đã sao lưu toàn origin khi discovery không đầy đủ.

## Kiểm chứng và triển khai

Unit kiểm journal quota trước ghi, throw trước/sau mutation, prefix applying/rollback sau crash, rollback failure rồi retry, observed conflict và allowlist/credentials; backup cũ/optional/null/date/corrupt data; rescue khi discovery lỗi. Browser native Web Locks/localStorage kiểm quota, boot recovery trước Home, blocked recovery/emergency download, null/omitted fields và hai tab. Phân biệt dữ liệu giả local/CI với dữ liệu thật; không chụp/trace/ghi OTP/token.

Không cần cấu hình Supabase cho phần này. Owner review/merge riêng sau CI exact HEAD sạch; GitHub tự build Cloudflare. Version5.15.1/assets/cache và upgrade từ5.15.0 cùng các regressions cũ được kiểm riêng. Kết quả cuối ghi tại PR; chưa là QA trên iPhone/iPad/Android thật.
