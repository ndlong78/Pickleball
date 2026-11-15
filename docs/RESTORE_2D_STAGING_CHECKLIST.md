# Lát 2d — checklist thử khôi phục trên Managed staging

Dành cho owner thực hiện. Bối cảnh và thiết kế: [RESTORE_DESIGN_PR5B2D2.md](RESTORE_DESIGN_PR5B2D2.md) (mục 9). Build thử: **V5.30.0**. **Chỉ dùng dữ liệu giả**; không ghi dữ liệu bằng SQL Editor; không dùng production.

Trạng thái: **chưa chạy.** Tick và điền bảng kết quả ở cuối; đừng ghi kết quả trước khi thật sự thử.

## 0. Chuẩn bị
- [ ] Hai hồ sơ trình duyệt riêng (Hồ sơ 1, Hồ sơ 2; có thể dùng cửa sổ ẩn danh), cùng một tài khoản thử đã có (đăng ký đang tắt).
- [ ] Mở URL dưới đây ở cả hai hồ sơ; banner "Thử nghiệm trên staging" ghi **5.30.0**. Nếu là bản cũ: đóng hết tab/PWA rồi mở lại hoặc tải lại cứng; **không xóa localStorage**.
```text
https://pickleup-staging.home-309.workers.dev/?page=settings&pilot=preferences-checkins
```
- [ ] URL chỉ có `page` và `pilot=preferences-checkins`; query khác thì chức năng không bật.
- [ ] DevTools → Network mở ở cả hai hồ sơ; lọc `rpc` hoặc `apply_sync_operation`.

## 1. Tạo "thao tác bị mất" (Hồ sơ 1)
- [ ] Đăng nhập OTP → **Dùng mục tiêu và check-in của tài khoản** → nhập múi giờ (ví dụ `Asia/Ho_Chi_Minh`) → **Xác nhận múi giờ**.
- [ ] Tiến bộ: **Mục tiêu mỗi tuần = 4 ngày** → **Lưu mục tiêu** → báo "chờ đồng bộ".
- [ ] Hành trình: 45 phút → **Xác nhận đã tập** → báo "chờ đồng bộ".
- [ ] **Không bấm Đồng bộ ở Hồ sơ 1.**
- [ ] Dữ liệu → Cứu hộ cache V6: **Đọc cache tài khoản** → **Tải bản cứu hộ cache V6** → lưu riêng tư thành `file1.json` (chứa 2 thao tác chưa gửi).

## 2. Đường chính (Hồ sơ 2)
- [ ] Đăng nhập cùng tài khoản, mở URL ở mục 0, bấm **Dùng mục tiêu và check-in của tài khoản** (bắt buộc; thiếu bước này sẽ báo chưa bật nguồn).
- [ ] Cứu hộ cache V6: chọn `file1.json` → thông báo kiểm tra checksum, chỉ xem trước.
- [ ] **Xem thao tác chưa gửi có thể cứu** → "2 thao tác chưa gửi…", hai dòng (Mục tiêu và lịch tập, Check-in buổi tập) mỗi dòng một nút; không có id/nội dung trên màn hình.
- [ ] **Ca mất mạng:** bật DevTools → Network → Offline, bấm nút ở dòng Check-in → "Cần mạng để tải dữ liệu mới từ máy chủ; chưa ghi gì."; Tiến bộ không đổi. Bật mạng lại.
- [ ] Bấm **Đưa vào hàng chờ trên máy** ở dòng Mục tiêu → "Đã đưa vào hàng chờ trên máy (chưa gửi)…"; Network có lệnh đọc (`prepare_sync`, pull) nhưng **không** có `apply_sync_operation`.
- [ ] Tiến bộ: mục tiêu 4 ngày, trạng thái chờ đồng bộ.
- [ ] Bấm nút ở dòng Check-in → cùng thông báo thành công; Hành trình thấy check-in 45 phút chờ đồng bộ.
- [ ] Dữ liệu → **Đồng bộ thay đổi** → "Đã đồng bộ"; `apply_sync_operation` chỉ xuất hiện từ lúc này.
- [ ] Hồ sơ thứ ba (hoặc sau tải lại) → **Đọc dữ liệu tài khoản** → thấy mục tiêu 4 ngày và check-in 45 phút.

## 3. Các ca phải bị chặn (không ghi gì)
Mỗi ca: thông báo cố định đúng như bảng, Tiến bộ không đổi, Network không có `apply_sync_operation`.

- [ ] **Máy chủ đã đổi.** Sau mục 2, ở Hồ sơ 2 chọn lại `file1.json`, xem lại danh sách, bấm nút từng dòng → "Dữ liệu trên máy chủ đã đổi sau thao tác này; không ghi đè."
- [ ] **Máy có thay đổi mới hơn.** Hồ sơ 2: đặt mục tiêu 2 ngày, **Lưu mục tiêu** (chưa đồng bộ); chọn lại `file1.json`, xem → dòng mục tiêu có cảnh báo "Máy có thay đổi chưa gửi cho cùng mục…" và **không có nút**.
- [ ] **Tệp bị sửa.** Đổi một ký tự trong tệp rồi chọn → báo checksum không khớp, không có danh sách.
- [ ] **Tệp tài khoản khác.** → "Tệp hoặc dữ liệu không thuộc tài khoản đang đăng nhập."
- [ ] **Bản chính.** Mở `https://pickleup-staging.home-309.workers.dev/?page=settings` (không `pilot`) → không thấy công cụ cứu hộ/đồng bộ.

## 4. An toàn và dọn
- Hồ sơ 1 vẫn giữ 2 thao tác chưa gửi: **đừng đồng bộ sau mục 2** (nếu cố ý, sẽ sinh xung đột và đi qua luồng xem xét xung đột hiện có).
- Hành vi lạ: bấm **Dùng lại dữ liệu thiết bị** ở Hồ sơ 2 để về nguồn thiết bị. Dữ liệu khách không bị khôi phục động tới.
- Nút thiếu/khóa: thường do chưa đăng nhập, chưa chọn tệp hợp lệ, hoặc chưa bấm "Dùng mục tiêu và check-in của tài khoản".

## 5. Kết quả (điền sau khi thử)
- Build ở banner: ____  Trình duyệt/hệ điều hành: ____  Ngày: ____

| Ca | Đạt? | Thông báo thực tế (nguyên văn) | Ghi chú |
|---|---|---|---|
| Đường chính (mục 2) | | | |
| Mất mạng | | | |
| Máy chủ đã đổi | | | |
| Thay đổi mới hơn trên máy | | | |
| Tệp bị sửa | | | |
| Tệp tài khoản khác | | | |
| Bản chính không có công cụ | | | |

Khi báo lỗi: gửi thông báo nguyên văn, tên lệnh trong Network (không gửi nội dung phản hồi), số build; không gửi email, tệp hay dữ liệu thật.
