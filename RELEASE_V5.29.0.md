# V5.29.0 — Bổ sung 16 bài 4.0–5.0 cho các nhóm trọng tâm còn thiếu

## Thay đổi
- Thêm **16 bài đã xuất bản** `PU-105…PU-120`: mỗi nhóm 4.0–4.5 và 4.5–5.0 có hai bài cho từng nhóm trọng tâm `third-drop`, `transition-reset`, `kitchen-pressure`, `doubles-coverage`. Mỗi nhóm cấp độ nay có 20 bài; Học viện 120 bài (84 giáo án nâng cao).
- Mỗi bài đủ 3 gợi ý, 3 bài tập 12/12/15 phút, 60 phút, kiểm tra 20 lần với mốc 14–16 và lời nhắc "không phải chứng nhận trình độ".
- HLV cá nhân nâng cao ở 4.0–5.0: đo trên sáu buổi liên tiếp, hai ô đầu không lặp bài, ô thứ ba có 4 bài khác nhau; không sửa thuật toán.
- Bỏ ghi chú "lặp bài sớm" trên trang HLV; vẫn ghi nhóm 4.0–5.0 chưa có HLV duyệt.

## Tương thích và dữ liệu
- Bài mới chỉ thêm (id lớn hơn, revision 1, assessmentVersion 1); không đổi bài cũ, khóa localStorage, SQL, RLS hay phiên bản giáo án. Không cần migration: miền mã bài/ADV đã mở ở V5.28.0.
- **Nội dung do Claude soạn, chưa có HLV duyệt, chưa thử trên sân**; HLV có thể sửa qua CMS (xem docs/DRAFT_LESSONS_4_0_5_0.md).
- App/assets/PWA `5.29.0` (`pickleup-shell-v5-29-0-stable`); test nâng cấp xóa cache 5.28.0.

## Chưa kiểm chứng
Thiết bị thật; HLV duyệt nội dung và mốc đạt.
