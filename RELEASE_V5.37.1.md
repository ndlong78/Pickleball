# PickleUp V5.37.1 — Phân tích video nhanh hơn, phân tích được nhiều clip liên tiếp

Owner thử V5.37.0 trên điện thoại ngày 28/11/2026 và báo "chạy rất chậm khi phân tích video".

## Nguyên nhân
- **Tua từng khung:** V5.37.0 đặt `video.currentTime` cho mỗi khung cần lấy (5 khung/giây). Mỗi lần tua, trình duyệt phải giải mã lại từ keyframe gần nhất. Video điện thoại (HEVC, 1080p/4K, 60 fps) làm việc này rất chậm. Trong container, clip 1080p60 VP9 mất trung bình 116 ms mỗi lần tua, chưa tính nhận diện; trên điện thoại thường chậm hơn.
- **Khởi động nguội GPU:** lần nhận diện đầu tiên mất khoảng 4 s (biên dịch shader). Thời gian này dồn vào khung đầu của clip.
- **Lỗi clip thứ hai:** chế độ VIDEO của MediaPipe cần timestamp tăng dần trong suốt vòng đời engine. Clip thứ hai bắt đầu lại từ 0 nên lỗi `Packet timestamp mismatch … expected 2800001 but received 1000`. Đã tái hiện với engine thật.

## Sửa
- Lấy khung bằng **phát video + `requestVideoFrameCallback`**: tạm dừng khi nhận diện rồi phát tiếp với tốc độ 2×. Không còn tua, giải mã tuần tự bằng phần cứng, không mất khung dù nhận diện chậm. Trình duyệt không hỗ trợ hoặc chặn phát thì tự quay về cách tua cũ.
- Khởi động GPU một lần ngay khi tải bộ phân tích.
- Timestamp tăng dần qua mọi clip trong phiên.
- Chẩn đoán thêm "Cách lấy khung" và tách "Nhận diện TB" với "Chờ khung TB", để biết điện thoại chậm ở khâu nào.

## Chọn video có sẵn trên máy
Owner yêu cầu "cho phép upload từ thiết bị". Ở V5.37.0, ô chọn video có `capture="environment"`; trên iPhone và Android, thuộc tính này mở thẳng camera, nên không chọn được video có sẵn. Nay có hai nút riêng:
- **Chọn video từ máy (thư viện ảnh, tệp)**: không có `capture`;
- **Quay video mới bằng camera**: giữ `capture`.

"Upload" ở đây là đưa video vào trình duyệt để phân tích. Video **vẫn không gửi lên máy chủ** [PROD-11], và trang ghi rõ điều đó.

## Kiểm chứng
Engine MediaPipe thật, Chromium headless trong container (GPU giả lập bằng phần mềm, nên số tuyệt đối **không** đại diện điện thoại):

| | V5.37.0 | V5.37.1 |
|---|---|---|
| Clip 3 s 640×360 | 9,1 s, 15 khung | 6,3 s, 15 khung |
| Clip thứ hai 1080p60 8 s, cùng phiên | lỗi timestamp | 18,0 s, 40/40 khung |

- Unit 533 pass; test trình duyệt video trên Chromium pass. WebKit chạy trên CI.
- **Chưa đo trên iPhone/Android thật.** Cần owner thử lại và gửi khối "Chẩn đoán hiệu năng".

## Phiên bản
App, assets và PWA `5.37.1` (`pickleup-shell-v5-37-1-stable`). Test nâng cấp xóa cache 5.37.0.
