# Thiết kế: phiên bản giáo án và CMS nội dung Học viện

Trạng thái: **Giai đoạn A và video YouTube đã triển khai ở V5.21.0** (xem mục 10). Lưu phiên bản đề theo lượt điểm (C1), mở rộng ID (C3) và CMS trên Supabase (C4) vẫn là đề xuất.

## 1. Vì sao cần làm trước khi thêm video hoặc bài mới

Giáo án Học viện đang là mã nguồn (`curriculum.js`, `advanced-curriculum.js`, 80 bài `PU-001…PU-080`). Muốn HLV sửa nội dung, thêm bài 4.0–5.0 hoặc gắn video thì cần tách nội dung khỏi code. Nhưng nếu sửa nội dung mà không có phiên bản thì **lịch sử điểm của người dùng bị sai nghĩa**: điểm /20 chỉ so được khi cùng bài, cùng đề kiểm tra và điều kiện tương đương (hợp đồng V4.5 trong `AGENTS.md`).

### Hiện trạng đã kiểm trên `main`

| Vị trí | Đã có | Lỗ hổng |
|---|---|---|
| Tài khoản V6 `academy_attempts` | `content_version` (1–40 ký tự) và `lesson_snapshot {title, assessment}`; `comparisonKey` trong `modules/data/activity-core.js` gồm cả hai, nên đề đổi thì lượt cũ tự tách khỏi lượt mới | `content_version` là **một hằng chung** `academy-80-v1` (`modules/data/academy-source-core.js`). Sửa một bài phải đổi hằng này, làm mọi bài khác cũng "đổi phiên bản" |
| Khách `pickleup_academy_history_v44` | `{id, skill, level, score, date}` | **Không có phiên bản.** Sửa đề kiểm tra của một bài sẽ trộn điểm đề cũ với đề mới trong `academy-insights-core.js` và `weekly-goals-core.js` |
| Khách `pickleup_academy_v2` | Điểm gần nhất theo `id` | Như trên |
| ID bài | Regex `^PU-0(0[1-9]\|[1-7][0-9]\|80)$` ở **10 nơi**: DB domain `pickleup_private.lesson_id` và 9 module client (danh sách ở mục 6) | **Không thêm được PU-081** nếu chưa đổi đồng bộ cả DB lẫn client |

## 2. Nguyên tắc bắt buộc

1. **ID bài là bất biến và không tái sử dụng.** Không đánh số lại, không đổi nghĩa `PU-012`. Bài bỏ đi thì chuyển `retired`, không xóa.
2. **Phiên bản theo từng bài**, không theo cả thư viện.
3. **Tách hai loại phiên bản:**
   - `assessmentVersion` (số nguyên, bắt đầu 1): tăng khi thay đổi làm điểm không còn so được. Đây là khóa so sánh tiến bộ.
   - `revision` (số nguyên): tăng ở mọi lần xuất bản, kể cả sửa chính tả, cues, media. Chỉ dùng để hiển thị và cache.
4. **Không ghi đè lịch sử.** Mỗi lượt điểm mới lưu phiên bản đề tại thời điểm làm bài; dữ liệu cũ không bị viết lại.
5. **Dữ liệu thiếu phiên bản là "chưa rõ", không phải "v1".** Không âm thầm gán lượt cũ vào phiên bản mới.
6. **Guest vẫn hoạt động offline**, không cần tài khoản hay mạng để xem bài đã tải.

## 3. Khi nào tăng `assessmentVersion`

| Thay đổi | `assessmentVersion` | `revision` |
|---|---|---|
| Đề kiểm tra: `assessment.instruction`, số lượt, cách đếm, `target`, `testMinutes` | **+1** | +1 |
| Số bài drill, thời lượng drill, kỹ năng hoặc cấp độ của bài | **+1** | +1 |
| Vùng mục tiêu (`zone`) dùng để chấm | **+1** | +1 |
| Sửa chính tả, diễn đạt lại không đổi nghĩa, cues, lỗi thường gặp, luật nhắc | — | +1 |
| Thêm/đổi video, ảnh, sơ đồ minh họa | — | +1 |

Validator nội dung (mục 5) phải **tự phát hiện** khi các trường in đậm đổi mà `assessmentVersion` không tăng, và chặn xuất bản.

## 4. Mô hình dữ liệu nội dung (một bài)

```json
{
  "id": "PU-012",
  "status": "published",
  "revision": 4,
  "assessmentVersion": 2,
  "publishedAt": "2026-12-01T00:00:00Z",
  "level": "2.0–2.5",
  "skill": "dink",
  "title": "…", "goal": "…", "zone": "…", "setup": "…",
  "cues": ["…", "…", "…"],
  "mistakes": ["…"],
  "drills": [{"minutes": 12, "name": "…", "instruction": "…", "check": "…"}],
  "assessment": {"instruction": "…", "target": 14, "minutes": 6},
  "rule": "dink",
  "media": [{"kind": "video", "angle": "back|side|top", "src": "…", "poster": "…", "captions": "…", "bytes": 0, "durationSec": 0}],
  "supersedes": null
}
```

- `status`: `draft` → `review` → `published` → `retired`. Client chỉ thấy `published`; bài `retired` vẫn đọc được để hiển thị lịch sử nhưng không gợi ý tập.
- `rule`: khóa vào `RULES` của `modules/academy-lesson-core.js` (V5.20).
- `media` là tùy chọn; giới hạn kích thước và góc quay đặt trong validator.

### Lượt điểm lưu gì

- **Tài khoản:** giữ `content_version` hiện có nhưng đổi **giá trị** thành `"<id>@a<assessmentVersion>"`, ví dụ `PU-012@a2` (vẫn ≤ 40 ký tự, không cần đổi schema). Giữ `lesson_snapshot` như hiện tại. Lượt đã có `academy-80-v1` được hiểu là `@a1` vì 80 bài chưa từng đổi đề kể từ khi có hằng này; điều này phải được kiểm bằng một test so nội dung đề hiện tại với snapshot.
- **Khách:** thêm trường **tùy chọn** `av` (assessmentVersion) vào phần tử mới của `pickleup_academy_history_v44` và `pickleup_academy_v2`. Không đổi tên khóa, không migrate dữ liệu cũ. Phần tử thiếu `av` = "chưa rõ phiên bản".
- **So sánh tiến bộ:** chỉ so các lượt có **cùng `id` và cùng `av`** (hoặc cùng `content_version` ở tài khoản). Lượt "chưa rõ" chỉ được so với nhau khi đề hiện tại vẫn là `assessmentVersion` 1; khi bài lên a2 thì lượt "chưa rõ" hiển thị riêng với nhãn "đề cũ".

## 5. Kiến trúc CMS theo giai đoạn

### Giai đoạn A: nội dung thành dữ liệu, chưa có backend (đề xuất làm trước)
- Chuyển 80 bài sang `content/academy/lessons.json` (một file, có `schemaVersion`).
- `scripts/validate-content.cjs`: kiểm schema, ID bất biến, cues đủ 3, tổng 60 phút, `assessmentVersion` tăng khi trường chấm điểm đổi (so với bản trên `main`), giới hạn kích thước.
- Build sinh lại `curriculum.js` và `advanced-curriculum.js` từ JSON để giữ nguyên API `PICKLEUP_CURRICULUM` (không đụng UI). Unit test khẳng định bản sinh ra giống hệt bản hiện tại.
- HLV sửa nội dung bằng PR vào JSON, có CI validator. Chưa cần tài khoản admin.

### Giai đoạn B: CMS trên Supabase (sau khi pilot V6 ổn định)
- Bảng `content_lessons(id, revision, assessment_version, status, body jsonb, published_at, author_id)` với khóa `(id, revision)`, append-only.
- RLS: ai cũng `select` bản `published`; chỉ vai trò `content_editor` được insert `draft`/`review`; chỉ `content_publisher` được publish. Không dùng `service_role` ở client.
- Client vẫn đóng gói một bản nội dung tĩnh để chạy offline; bản từ server chỉ thay thế khi `revision` mới hơn và qua cùng validator.
- Mở rộng domain `lesson_id` (mục 6) trước khi cho tạo bài mới.

### Giai đoạn C: video và tải offline
- Media lưu ở Storage/CDN, không nằm trong repo hay cache PWA mặc định.
- Ba góc quay `back`, `side`, `top`; video ngắn 15–40 giây, không tiếng, có poster và phụ đề.
- Tải offline là lựa chọn của người dùng, có báo dung lượng; không tự tải trên dữ liệu di động.

## 6. Mở rộng không gian ID bài

Thêm bài `PU-081+` cần **một PR riêng, đồng bộ**:
1. Migration additive đổi domain `pickleup_private.lesson_id` sang `^PU-[0-9]{3,4}$` (không đổi dữ liệu cũ, không nới RLS).
2. Đổi cùng regex ở 9 module client đang khóa cứng định dạng (kiểm trên `main@48b4fec`): `modules/academy-trends-core.js`, `modules/weekly-checkins-core.js`, `modules/backup-v1-core.js`, `modules/data/activity-core.js`, `modules/data/import-core.js`, `modules/data/domain-core.js`, `modules/data/plan-core.js`, `modules/data/plan-runtime.js`, `modules/data/local-repository.js`. Nên gom về một hằng dùng chung thay vì sửa 9 chỗ riêng; thêm test quét repo để không còn regex cũ.
3. Test: backup/import cũ vẫn hợp lệ; ID ngoài định dạng vẫn bị từ chối; client cũ gặp `PU-081` từ server thì bỏ qua an toàn thay vì lỗi.

## 7. PWA, offline và tương thích ngược

- Nội dung giáo án đi cùng bản app (`?v=` và cache SW như hiện tại). Giai đoạn B thêm cache riêng theo `revision`, không xóa cache app.
- Không xóa hoặc đổi tên khóa localStorage; trường `av` là tùy chọn.
- Backup V1 và rescue giữ đọc được dữ liệu không có `av`.
- Bản app cũ đọc dữ liệu có `av` phải bỏ qua trường lạ (kiểm bằng test với validator của bản trước).

## 8. Thứ tự PR đề xuất và tiêu chí nghiệm thu

| PR | Phạm vi | Nghiệm thu |
|---|---|---|
| **C1** | Thêm `assessmentVersion`/`revision` = 1 vào 80 bài; `content_version` tài khoản thành `<id>@a1` (đọc được cả `academy-80-v1`); trường `av` tùy chọn cho lượt khách mới; so sánh theo `(id, av)` | Unit: lượt cũ không `av` vẫn hiển thị và so được khi đề là a1; đổi đề giả lập lên a2 thì lượt cũ tách nhãn "đề cũ"; backup V1/rescue/import cũ pass; không đổi khóa localStorage |
| **C2** | Giai đoạn A: `content/academy/lessons.json` + validator + build sinh `curriculum.js` | Bản sinh giống hệt 80 bài hiện tại; CI chặn khi trường chấm điểm đổi mà không tăng `assessmentVersion` |
| **C3** | Mở rộng ID bài (mục 6) | Migration additive + pgTAP/REST; test client cũ/mới như mục 6 |
| **C4** | Giai đoạn B: bảng `content_lessons`, RLS, vai trò editor/publisher | pgTAP: anonymous chỉ đọc `published`; editor không publish được; client offline vẫn chạy khi server lỗi |
| **C5** | Giai đoạn C: media | Không tăng dung lượng cache mặc định; tải offline có xác nhận; trang bài vẫn đủ dùng khi không có video |

## 9. Quyết định cần owner chốt

1. Xác nhận 80 bài hiện tại chưa từng đổi đề kể từ khi có `academy-80-v1`, để coi lượt cũ là `@a1`. Nếu không chắc, coi là "chưa rõ" và hiển thị riêng.
2. Định dạng ID mới: giữ `PU-` + 3–4 chữ số, hay thêm tiền tố theo cấp độ.
3. Giai đoạn A (nội dung qua PR GitHub) có đủ cho HLV trong 2–3 tháng tới không, hay cần giao diện CMS sớm hơn.
4. Nơi lưu video (Supabase Storage, Cloudflare R2/Stream) và ngân sách băng thông.
5. Ai giữ vai trò `content_publisher`.

## 10. Đã triển khai ở V5.21.0 và quyết định đã chốt

Owner yêu cầu làm CMS ngay, ưu tiên miễn phí và thuận tiện. Các quyết định ở mục 9 được chốt như sau:

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Lượt điểm cũ coi là `assessmentVersion` 1 | Code giáo án không đổi kể từ commit đầu tiên còn trong lịch sử (28/10), trước khi có `academy-80-v1`. CMS khóa trường chấm điểm nên không phát sinh đề mới cho tới C1 |
| 2 | Giữ định dạng `PU-` + số | Không đổi ID cũ; mở rộng ở C3 |
| 3 | Sửa nội dung qua trang `cms/` + PR GitHub | Miễn phí, không server, không secret, có review và CI |
| 4 | Video trên **YouTube, chế độ Không công khai** | Miễn phí, không giới hạn, tải lên từ điện thoại, tự chọn chất lượng theo mạng. Phương án offline sau này: Cloudflare R2 (miễn phí 10 GB) |
| 5 | Owner giữ quyền merge (xuất bản) | Đúng quy trình hiện tại; không thêm vai trò mới |

### Điều chỉnh so với mục 5 (Giai đoạn A)
Không dùng `content/academy/lessons.json` + bước build, vì HLV sửa trên GitHub web không chạy được Node, còn commit tự động từ GitHub Action không kích hoạt lại CI. Thay vào đó **`curriculum.js` là nguồn duy nhất**: JSON nằm giữa `/*CONTENT-BEGIN*/` và `/*CONTENT-END*/`, đầu và adapter cố định; `advanced-curriculum.js` chỉ là adapter. CMS xuất nguyên tệp, CI chạy `scripts/check-content.cjs --previous <bản base>`.

- Dữ liệu 80 bài sau chuyển đổi **giống hệt** bản sinh từ bộ sinh cũ (so JSON từng bài, đúng thứ tự khóa).
- Dung lượng tải: gzip 9,6 KB → 13,8 KB (+4,2 KB).
- `MAX_ASSESSMENT_VERSION = 1` trong `modules/content-core.js` chặn đổi đề cho tới C1; validator còn chặn xóa bài, lùi phiên bản, sửa nội dung mà không tăng `revision`, khóa lạ, video sai định dạng và tổng buổi khác 60 phút.
- Video: chỉ lưu ID 11 ký tự, góc quay `back/side/top/front`, giây bắt đầu/kết thúc. Trang Học viện chỉ nhúng `youtube-nocookie.com` **sau khi người tập bấm xem**; không tải ảnh hay script YouTube trước đó.
- Service worker bỏ qua mọi yêu cầu dưới `/cms/` hoặc có tham số `cms`, để trang CMS không thay shell offline của app. Bản nháp CMS lưu ở khóa `pickleupcms_draft_v1`, không dùng tiền tố `pickleup_` của dữ liệu người tập.

Hướng dẫn cho HLV: [CMS_GUIDE.md](CMS_GUIDE.md).
