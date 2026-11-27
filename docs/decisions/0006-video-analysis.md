# ADR-0006 — Phân tích video động tác: route thứ 9, xử lý trên thiết bị

**Trạng thái:** active.
**Ngày:** 27/11/2026. Owner chốt trong phiên làm việc: "vị trí mới hoàn toàn, lưu số đo lên tài khoản, bộ clip có nhãn chưa có HLV kiểm chứng".

## Bối cảnh
`ROADMAP.md` ghi "phân tích video có quyền riêng tư" là ý tưởng dài hạn. Nghiên cứu ngày 27/11 so sánh MediaPipe Pose Landmarker (web), TF.js MoveNet, ONNX + RTMPose/YOLO-pose và AI thị giác trên cloud. Ràng buộc gồm: PWA tĩnh vanilla JS, ngân sách tự động 0 USD, chạy được trên sân, video là dữ liệu cá nhân nhạy cảm.

## Quyết định
1. **Route thứ 9 `video` ("Phân tích động tác")** thay hợp đồng 8 route. Các route cũ giữ nguyên ID, thứ tự và hành vi.
2. **Xử lý trên thiết bị** bằng MediaPipe Pose Landmarker 1.2.3 (Apache-2.0), model `pose_landmarker_lite`. Video **không** rời máy và **không** được lưu: không upload, không lưu IndexedDB/localStorage, không có bucket.
3. **Nạp mã:** JS của MediaPipe (`vision_bundle`, `vision_wasm_internal.js`) được tự host trong `vendor/mediapipe/`. Không nạp JS bên thứ ba vào origin, vì origin này giữ phiên đăng nhập. WASM (14.7 MB) và model (5.8 MB) chỉ tải khi người dùng bấm đồng ý, tải từ URL ghim phiên bản (jsDelivr npm, Google storage). Bytes phải khớp SHA-256 ghim sẵn, sai thì dừng.
4. **Lưu số đo lên tài khoản:** chỉ lưu số đo đã tính và kết quả nhận xét, không lưu video. Làm ở PR riêng, theo đúng hợp đồng dữ liệu hiện hành: migration + RLS + RPC, append event có UUID/idempotency, pgTAP và REST A/B/anonymous, consent riêng [DATA-08], [DATA-09]. PR đầu tiên chỉ hiển thị kết quả, chưa lưu.
5. **Chưa có HLV người kiểm chứng:** mọi nhận xét gắn nhãn **"gợi ý tham khảo, ngưỡng ban đầu, chưa được HLV kiểm chứng"**, giống trạng thái bài 4.0–5.0 [PROD-08]. Bộ clip do owner tự gắn nhãn chỉ dùng để đo độ ổn định, không gọi là kiểm chứng chuyên môn.
6. **Tách biệt số liệu:** kết quả phân tích ≠ điểm kiểm tra /20 ≠ DUPR ≠ attendance. Không tự check-in, không tự nâng cấp trình độ, không trộn vào tiến bộ Học viện.

## Lộ trình
- **V5.37.0 (P0+P1):** route `video`, phân tích "tư thế chuẩn bị" (gối, hạ trọng tâm, tay cầm vợt trước người, độ rộng chân) từ một clip ≤ 15 s, chẩn đoán hiệu năng để QA trên thiết bị thật. Chưa lưu.
- **Kế tiếp:** đo trên iPhone/Android thật → lưu số đo lên tài khoản (PR backend riêng) → `dink`, `volley`, `serve`.
- Mỗi bước mới cần CI xanh và số đo thiết bị thật trước khi mở rộng.

## Giới hạn đã biết
- Pose không thấy vợt hay bóng, nên không nhận xét được về mặt vợt, độ xoáy, quỹ đạo, hay luật "đầu vợt dưới cổ tay".
- Hiệu năng trên iPhone Safari chưa đo. WASM 1.2.3 cần WebAssembly SIMD (Safari 16.4+).
- Tải lần đầu khoảng 20 MB; trình duyệt tự cache theo HTTP, service worker không cache các file này.

## Quy tắc bị thay
- AGENTS.md V3 [PROD-01]: "PWA tiếng Việt có **8 route**: `home`, `journey`, `coach`, `court`, `academy`, `progress`, `matches`, `settings`." → [PROD-01] (9 route) và [PROD-11].
