# MediaPipe Tasks Vision 1.2.3 (self-hosted JS)

Dùng cho route `video` ([ADR-0006](../../docs/decisions/0006-video-analysis.md)). Nguồn: gói npm `@mediapipe/tasks-vision@1.2.3` (phát hành 11/11/2026), giấy phép **Apache-2.0**, © Google LLC (https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE). Các file giữ nguyên từng byte so với tarball npm, không sửa đổi.

| File ở đây | File gốc trong gói | Bytes | SHA-256 (base64) |
|---|---|---|---|
| `vision_bundle.js` | `vision_bundle.mjs` | 155990 | `+wwCwpb0TODMMkuha9ZG2Hc+tKeEfbQBnMTQQw23qbU=` |
| `vision_wasm_internal.js` | `wasm/vision_wasm_internal.js` | 336624 | `KqX9P909ggjNdYffC7GftpJcTqFqdt0CWu3B9k1qYwk=` |

`vision_bundle.js` còn dòng `sourceMappingURL` trỏ tới file map không được đóng gói. Dòng này chỉ gây một request 404 khi mở DevTools, và được giữ lại để file trùng byte với bản gốc.

Không tự host (tải khi người dùng bấm đồng ý, chỉ dùng khi khớp SHA-256 ghim trong `modules/video-analysis-ui.js`):

| Tệp | URL | Bytes | SHA-256 (base64) |
|---|---|---|---|
| WASM | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm/vision_wasm_internal.wasm | 14665716 | `IlvAbA9Rqc8x/qDp4LAkPp4B+17zMswaf6Zlbb39qr8=` |
| Model | https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task | 5777746 | `WZKeHR7pUodzXd2DOxnPSsRtKbx6/du/Z1PEWWkNV0o=` |

Nâng phiên bản: tải tarball npm mới, thay cả hai file JS, cập nhật mọi mã băm ở đây và trong `modules/video-analysis-ui.js` cùng một commit. `tests/video-analysis-vendor.test.js` kiểm tra các giá trị này khớp nhau.
