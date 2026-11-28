# ADR-0007 — Kho số đo phân tích video: bảng và RPC riêng, ngoài log đồng bộ

**Trạng thái:** active.
**Ngày:** 28/11/2026. Thực hiện quyết định "lưu số đo lên tài khoản" của owner ([ADR-0006](0006-video-analysis.md)) trong phạm vi ủy quyền [FLOW-07].

## Bối cảnh
Các dữ liệu hoạt động hiện có (`academy_attempts`, `skill_assessments`, `training_entries`, `match_records`) đi qua log `pickleup_private.sync_changes` và `pull_changes`. Client đang chạy coi mọi `entity_kind` ngoài danh sách đã biết là phản hồi lỗi và **dừng toàn bộ lần pull** (`modules/data/pull-controller.js`, kiểm `!KINDS.has(change.entity_kind)`). Nếu thêm một loại mới vào log, thì khi tài khoản có bản ghi đầu tiên, mọi PWA cũ chưa cập nhật của tài khoản đó sẽ ngừng đồng bộ cả mục tiêu, check-in và giáo án.

## Quyết định
- Bảng riêng `public.video_analyses`, **không** phải entity kind của `sync_changes`; `entity_spec('video_analyses')` là `null`, nên writer cũ `apply_operation` và các writer có fence không ghi được vào bảng này.
- Chỉ lưu tóm tắt đã tính trên máy: phiên bản phân tích, kỹ năng, trạng thái, góc nhìn, bốn số đo, tối đa hai mã nhận xét theo allowlist, số khung, định danh engine (ASCII), thời điểm. **Không có cột nào chứa video, khung hình hay landmark.** Mọi cột có CHECK miền giá trị; kết quả "insufficient" không được mang số đo.
- Ba RPC `security definer`, do role hẹp `pickleup_api` sở hữu, `search_path=''`, chỉ `authenticated` được gọi:
  - `record_video_analysis(client_event_id, payload)`: append; idempotent theo `client_event_id` + SHA-256 của payload (cùng ID khác nội dung → `operation_id_reused`); khóa advisory theo tài khoản để replay và quota không race; **tối đa 2000 bản ghi mỗi tài khoản** (đăng ký đang mở); thời điểm không quá 1 ngày trong tương lai; lỗi không lộ tên ràng buộc.
  - `list_video_analyses(limit 1–200, before)`: của chính mình, mới nhất trước, không trả `user_id`/`request_hash`.
  - `delete_video_analysis(id)`: **xóa hẳn** dòng của chính mình. Không cần tombstone vì không đồng bộ qua log; bản backup mã hóa còn giữ tối đa 35 ngày.
- RLS bật và ép buộc; client chỉ có quyền SELECT dòng của mình; INSERT/UPDATE/DELETE trực tiếp bị từ chối. FK `on delete cascade`, nên tự xóa tài khoản xóa luôn các số đo.

## Hệ quả
- Client cũ không bị ảnh hưởng. Không đổi `pull_changes`, `sync_changes`, `entity_spec`, writer hay RLS hiện có.
- Không có outbox/IndexedDB cho số đo video ở bước này: lưu cần mạng; nếu mất mạng, kết quả vẫn hiện trên trang và người dùng bấm lưu lại khi có mạng (PR client). Khác với các dữ liệu tập luyện có cache offline [DATA-07], được ghi nhận ở đây.
- Owner cần chạy `supabase/manual/staging_upgrade_20261128000100.sql` trên project thật trước khi bản client dùng RPC này được phát hành ([ACCOUNT_OPERATIONS §4](../ACCOUNT_OPERATIONS.md)). Bản client phải xử lý được trường hợp RPC chưa có (báo "máy chủ chưa sẵn sàng", không mất kết quả đang hiển thị).
- Sao lưu và diễn tập khôi phục tự bao gồm bảng mới (dump schema `public`, đếm mọi bảng `public`).

## Kiểm chứng
- pgTAP `supabase/tests/010_video_analyses.test.sql`: quyền, RLS, A/B/anon, replay, dùng lại ID, allowlist khóa, miền giá trị, quota theo tài khoản, cascade khi xóa tài khoản.
- REST `scripts/test_video.py`: A/B/anonymous qua PostgREST, ghi trực tiếp bị chặn, lỗi không lộ chi tiết, 4 lần ghi đồng thời ở ngưỡng quota chỉ 2 thành công.
- Gói SQL Editor có preflight (PG17, đúng 10 migration, chưa cài, role hẹp hợp lệ) và fixture kiểm tra sau cài; CI chạy cả hai.
