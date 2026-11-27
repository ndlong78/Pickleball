# PickleUp V5.37.0 — Phân tích động tác (thử nghiệm)

Theo [ADR-0006](docs/decisions/0006-video-analysis.md), owner quyết định ngày 27/11/2026: route mới hoàn toàn, sau này lưu số đo lên tài khoản, bộ clip có nhãn chưa có HLV kiểm chứng.

## Có gì mới
- **Route thứ 9 `video` — "Phân tích động tác"** (menu **Thêm**, `?page=video`). Tám route cũ giữ nguyên ID, thứ tự và hành vi. Home không tải module này.
- **Phân tích tư thế chuẩn bị** từ một clip 3–10 giây (tối đa 15 s): góc gối, góc hông, độ rộng chân so với vai, độ cao tay cầm vợt. Lấy 5 khung hình/giây, dùng trung vị các khung đủ rõ, đưa tối đa **hai gợi ý**, kèm khung xương tại khung hình tiêu biểu.
- **Từ chối thay vì đoán**: nếu không thấy đủ vai/hông/gối/cổ chân, người đứng quá xa, có phần cơ thể ra ngoài khung, hoặc quá ít khung rõ, ứng dụng báo "Chưa đủ dữ liệu" kèm lý do.
- Chỉ đo chỉ số phù hợp với góc quay: khi không có toạ độ 3D, góc khớp chỉ đo khi quay nghiêng, độ rộng chân chỉ đo khi quay chính diện.
- **Chẩn đoán hiệu năng** (thu gọn): xử lý bằng GPU hay CPU, thời gian tải, ms/khung hình, tổng thời gian, trình duyệt. Có nút sao chép để gửi lại khi QA thiết bị thật.

## Quyền riêng tư và an toàn
- Video xử lý trong trình duyệt, **không tải lên, không lưu**: không ghi Web Storage, IndexedDB hay Cache Storage. Chỉ giữ Blob URL trong RAM, giải phóng khi chọn video khác hoặc rời trang.
- JS của MediaPipe 1.2.3 (Apache-2.0) **tự host** trong `vendor/mediapipe/`, trùng từng byte với tarball npm. Không nạp JS bên thứ ba vào origin đang giữ phiên đăng nhập.
- WASM 14.7 MB (jsDelivr npm) và model `pose_landmarker_lite` 5.8 MB (Google storage) chỉ tải khi người dùng bấm. Phải khớp **SHA-256 ghim sẵn**, nếu không sẽ dừng và báo lỗi. Một tệp lỗi thì tệp còn lại bị hủy tải.
- Nhận xét ghi rõ: gợi ý tham khảo, ngưỡng ban đầu, **chưa được HLV kiểm chứng**. Không phải điểm /20, DUPR hay xác nhận buổi tập; không tự check-in, không tự nâng trình độ.

## Chưa làm
- Lưu số đo lên tài khoản: PR backend riêng (migration + RLS + RPC, event append có UUID, pgTAP/REST A/B/anonymous, consent riêng).
- Các kỹ năng `dink`, `volley`, `serve`; phát hiện vợt và bóng.
- Chạy offline: bộ phân tích dựa vào HTTP cache của trình duyệt, service worker không cache file 20 MB.

## Kiểm chứng
- Unit: `tests/video-analysis-core.test.js` dùng khung xương tổng hợp có góc khớp biết trước (từng ngưỡng, góc quay 2D/3D, từ chối dữ liệu kém, chống nhiễu). `tests/video-analysis-vendor.test.js` kiểm tra mã băm vendor/README/UI khớp nhau, không ghi storage, không upload, có cảnh báo trên trang.
- Browser: `tests/video-analysis.spec.cjs` chạy ở 4 viewport, gồm các ca:
  - mở từ menu, không overflow, nút ≥ 44 px;
  - không có request ra ngoài trước khi bấm, không đổi localStorage;
  - Home không tải module;
  - **bytes giả bị từ chối bởi SHA-256**, bundle không được import;
  - từ chối tệp không phải video.
- Thử tại local (không commit) với **engine MediaPipe thật**, Chromium headless:
  - khởi động được bằng GPU;
  - trên clip 3 s không có người, trả "Chưa đủ dữ liệu – Không nhận ra người", localStorage vẫn trống.
  - Bài thử này phát hiện và đã sửa lỗi `import()` phân giải đường dẫn theo thư mục `modules/`.
  - 553 ms/khung đo được ở đây là GPU giả lập bằng phần mềm, **không** đại diện điện thoại.
- **Chưa QA trên iPhone/Android thật**, chưa thử với người thật trong video. Đây là bước kế tiếp.

## Phiên bản
App, assets và PWA `5.37.0` (`pickleup-shell-v5-37-0-stable`). Test nâng cấp xóa cache 5.36.0.
