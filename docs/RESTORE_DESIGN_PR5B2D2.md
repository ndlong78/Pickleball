# PR5b2d2 — thiết kế khôi phục từ tệp cứu hộ (chỉ tài liệu)

Trạng thái: **lát 2a, 2b và 2c đã có mã (V5.30.0); lát 2d (thử trên Managed staging) còn chờ owner.** Mục 9 ghi cách 2b/2c được cài đặt, kể cả chỗ khác với bản thiết kế ban đầu. Theo [AGENTS.md](../AGENTS.md) mục 3 owner đã giao các quyết định kỹ thuật backup/restore; tài liệu này ghi quyết định và chia lát cắt. Không SQL, RLS, Auth, signup, dependency hay thay đổi IndexedDB 3 trong PR này.

## 1. Vấn đề
[PR5b2d1](RESTORE_PREVIEW_PR5B2D1.md) chỉ so tệp cứu hộ với cache trên máy (`canRestore=false`). Câu hỏi còn lại: **khôi phục cái gì, và bằng cách nào mà không phá cache?**

Mã hiện tại cho thấy cache tài khoản là một hệ ràng buộc chặt, không phải bảng độc lập:
- `records` có `tailOperationId` trỏ vào `outbox`; xóa/ghi đè một bên làm bên kia mồ côi.
- `sync_cursor` gắn `epoch` và `localVersion`; trộn cursor cũ với record mới gây bỏ sót hoặc lặp thay đổi từ server.
- `outbox` có trạng thái `sending` (không biết server đã nhận chưa), `acked` cần `ackRevision` + `ackEpoch`, `resolved` cần `resolutionId` khớp `conflicts`.
- `metadata` chứa generation marker, consent và sender lease; `device_state` gắn `deviceId` của máy khác.

Ghi đè nguyên các store từ tệp có thể làm **mất** thay đổi mới hơn trên máy hoặc **phát lại** thao tác đã được server nhận. Vì vậy "restore = ghi lại bảy stores" bị loại.

## 2. Quyết định chính sách
Server là nguồn sự thật của dữ liệu đã đồng bộ; cache chỉ là bản sao và tự dựng lại bằng pull. Thứ **duy nhất** đáng cứu từ tệp là **ý định chưa gửi** (outbox chưa `acked`/`resolved`) mà máy không còn.

| Store trong tệp | Khôi phục? | Lý do |
|---|---|---|
| `records` | **Không** | Bản sao server; pull lại. Ghi đè làm hỏng `tailOperationId` và CAS base. |
| `sync_cursor` | **Không** | Cursor cũ + epoch mới bỏ sót thay đổi. Máy tự tạo cursor khi pull. |
| `metadata` (generation, consent, lease) | **Không** | Không bao giờ tự kích hoạt consent hoặc lease từ tệp. |
| `device_state` | **Không** | Gắn `deviceId` máy khác; không chuyển giữa thiết bị. |
| `import_receipts` | **Không** | Provenance import đã có phía server; không tạo lại. |
| `conflicts` (đã `resolved`) | **Không** | Chỉ lịch sử; không cấp quyền gì. |
| `outbox` đã `acked`/`resolved` | **Không** | Server đã xử lý; phát lại là rủi ro, không phải cứu dữ liệu. |
| `outbox` chưa xong, **không có** thao tác cùng `operationId` trên máy | **Có, dưới dạng đề xuất** | Đây là dữ liệu người dùng có thể đã mất. |
| `outbox` ở trạng thái `sending` | **Có, nhưng đánh dấu "không chắc"** | Server có thể đã nhận; chỉ server CAS/idempotency mới quyết định. |

Nguyên tắc: **không bao giờ ghi vào `records` hay `acked`**. Thao tác khôi phục không chạy tự động và không bao giờ coi `acked` trong tệp là bằng chứng từ server.

## 3. Cách khôi phục (đề xuất, không tự áp dụng)
Mỗi thao tác chưa gửi được đưa vào **hộp "chờ xem lại"** (quarantine) ở dạng chỉ đọc, hiển thị loại dữ liệu và thời điểm, không hiển thị payload thô trong log/URL. Người dùng chọn từng mục:
1. **Kiểm tra mới với server** (pull mới + so `expectedRevision` của thao tác với bản server hiện tại).
2. Nếu cơ sở còn khớp: tạo lại thao tác như một **thao tác mới** (`operationId` mới, idempotency key mới) qua đường outbox hiện có; server CAS vẫn quyết định.
3. Nếu cơ sở đã đổi: đưa vào luồng **xem xét xung đột** hiện có, người dùng chọn giữ bản nào. Không có last-write-wins âm thầm.
4. Mọi mục có nút **bỏ qua**; bỏ qua không xóa tệp gốc.

Không dùng lại `operationId` cũ: tránh nhầm với yêu cầu đã gửi và để idempotency của server không che mất lỗi.

## 4. Lát cắt triển khai (mỗi lát một PR, có phạm vi riêng)
| Lát | Nội dung | Ghi dữ liệu thật? | Gate |
|---|---|---|---|
| **2a** | `restore-plan-core.js` (thuần): từ tệp + cache + (tùy chọn) pull mới, tính danh sách đề xuất và lý do loại; không đụng IDB | Không | Unit đủ bảy stores, thao tác `sending`, trùng `operationId`, owner khác, size/credential |
| **2b** | Hộp chờ xem lại trong RAM + UI xem xét chỉ đọc ở Settings | Không | 4 viewport, offline, A→B, clear khi logout |
| **2c** | Tạo lại thao tác qua outbox hiện có, sau xác nhận từng mục + kiểm tra mới với server | Có (outbox của chính account) | Native IDB + GoTrue/Mailpit thật trên CI; rollback nếu một mục lỗi; hai tab |
| **2d** | Thử Managed staging do owner chạy (A/B, mất mạng giữa chừng) | Có (staging) | Owner thực hiện; không production |

Lát 2a–2b không thay đổi dữ liệu; chỉ 2c ghi, và chỉ vào outbox của đúng account.

## 5. Điều không làm
- Không đổi IndexedDB 3, không thêm store; hộp chờ chỉ ở RAM cho tới khi có quyết định khác.
- Không khôi phục sang account khác, không phục hồi Auth/session, không tự bật consent.
- Không tự gửi sau khi khôi phục; gửi vẫn là hành động thủ công hiện có.
- Không xóa tệp cứu hộ; không gọi đây là backup toàn bộ (full backup/Auth recovery/retention vẫn là hạng mục riêng).

## 6. Rủi ro còn lại và cần owner
- **Staging thật:** CI chỉ có GoTrue/Mailpit local; hành vi trên Managed (expiry, hai thiết bị) cần owner thử ở lát 2d.
- **Giá trị thực:** nếu pilot tài khoản chưa mở cho người dùng, lát 2c có thể trì hoãn mà không mất gì; 2a–2b vẫn an toàn vì chỉ đọc.
- Chính sách ở mục 2 là quyết định kỹ thuật đã được giao; nếu owner muốn khôi phục rộng hơn (ví dụ `records`), cần phạm vi và rủi ro mới, không suy từ tài liệu này.

## 7. Kiểm chứng thiết kế
Thiết kế dựa trên đọc mã `local-repository.js` (ràng buộc `tailOperationId`, trạng thái outbox, epoch/cursor) và `account-rescue-core.js`/`restore-preview-core.js`; **chưa chạy thử hành vi nào mới.** Không phải kết quả test.

## 8. Lát 2a — hợp đồng đã cài đặt
`plan(fileSnapshot,deviceSnapshot,{expectedOwner})` (thuần, không IDB/mạng/ghi): dùng lại `account-rescue-core.validateSnapshot` (owner, credential, trùng khóa, kích thước) cho cả hai ảnh chụp, chỉ đọc `outbox` của tệp.
- **Đề xuất** thao tác có trạng thái `pending|deferred|sending|blocked|conflict`, `protocol 1`, `kind` thuộc tập đã biết, `action` là `put|delete`, `operationId` UUID và **chưa có** trên máy (mọi trạng thái).
- **Loại với mã cố định:** `settled` (acked/resolved), `already_on_device`, `invalid_operation`, `unknown_kind`, `unsupported_protocol`, `dependency_missing`, `dependency_excluded`, `dependency_cycle`. Phụ thuộc đã settled hoặc đã có trên máy thì không chặn; phụ thuộc chưa xong phải tự được đề xuất.
- **Cảnh báo:** `uncertain_send` (đang `sending`), `device_has_unsent_change` (máy có thao tác chưa xong cùng bản ghi), `device_has_open_conflict`.
- Mỗi mục chỉ có `operationId, kind, id, action, state, dependsOn, warnings`; **không payload**. `summary` chỉ có số đếm và mã cố định, không id/chuỗi tùy ý. Luôn `canRestore=false`, `cloudVerified=false`. Các store khác trong tệp bị bỏ qua hoàn toàn.
- Thứ tự đầu ra xác định, thao tác phụ thuộc luôn đứng sau thao tác nó phụ thuộc. Chưa phải xác nhận từ server.
- Kiểm thử: `tests/restore-plan-core.test.js` (12 ca). Chưa nạp vào Settings/page-loader/PWA nên không đổi phiên bản app.

## 9. Lát 2b và 2c — đã cài đặt (V5.30.0) và điều chỉnh so với thiết kế
**2b — kế hoạch chỉ đọc.** Settings → Cứu hộ cache V6 có nút "Xem thao tác chưa gửi có thể cứu", chỉ bật sau khi chọn tệp hợp lệ. `controller.planRestore()` đọc snapshot cache hiện tại, gọi `restore-plan-core.plan()` và chỉ hiển thị loại dữ liệu, hành động, cảnh báo và mã loại cố định. `operationId`, id bản ghi và payload ở lại trong RAM của controller, không vào DOM/log/URL.

**2c — đưa lại một mục vào hàng chờ.** Mỗi mục có nút riêng; một lần bấm = một thao tác. Đi qua `PICKLEUP_DATA.restoreIntent` → `domain-controller.restoreIntent`:
1. yêu cầu nguồn tài khoản đang bật và đã bootstrap (cờ pilot tắt thì dừng với `pilot_disabled`);
2. **pull dữ liệu mới từ máy chủ** (không có mạng thì dừng, chưa ghi gì);
3. `restore-plan-core.assess()` so với bản ghi vừa pull, chỉ cho phép khi thao tác độc lập, máy không có thay đổi chưa gửi/cần xem xét của bản ghi đó, **`expectedRevision` trong tệp vẫn bằng revision máy chủ hiện tại**, và payload qua đúng validator của `domain-core`;
4. ghi bằng `scope.write` với `operationId` **mới** và `expectedLocalRevision` hiện tại (một giao dịch IndexedDB). Không tự gửi; người dùng vẫn đồng bộ thủ công, và CAS của máy chủ vẫn quyết định.

**Khác với thiết kế ban đầu (mục 3):**
- Chỉ **`user_preferences` và `practice_checkins`** được đưa lại; các loại khác (điểm Học viện, đánh giá, nhật ký, giáo án, lựa chọn, hồ sơ) được liệt kê nhưng không có nút. Lý do: ghi trực tiếp qua `scope.write` bỏ qua validator và chính sách đồng ý của từng domain; chỉ hai loại này có validator và đường ghi một bản ghi đã được kiểm chứng.
- Không tạo luồng xung đột mới: nếu máy chủ đã đổi sau thao tác (`record_changed`) hoặc máy có thay đổi mới hơn (`device_unsent`), **không ghi gì** thay vì đẩy vào xem xét xung đột, để không ghi đè ý định mới hơn bằng dữ liệu cũ.
- Không cần rollback nhiều mục vì mỗi mục độc lập và một giao dịch ghi duy nhất.
- Thao tác `sending` vẫn được đề xuất nhưng chỉ ghi được nếu bản ghi máy chủ chưa đổi (tức máy chủ chưa nhận).
Mã trạng thái cố định hiển thị cho người dùng: `queued`, `blocked:<unsupported_kind|dependency|device_unsent|needs_review|record_changed|invalid_record|invalid_payload|nothing_to_restore>`, `failed:<offline|pilot_disabled|source_unavailable|bootstrap_required|busy|account_changed|network_error|unknown>`.

**Kiểm thử:** `restore-plan-core.test.js` (17), `domain-controller.test.js` (+3, controller thật với server mô phỏng), `account-rescue-controller.test.js` (+5), `restore-queue.spec.cjs` (6 ca Playwright, bốn viewport 390/820/1180/1440, mock Auth/RPC). **Chưa chạy trên Managed staging thật**; lát 2d do owner thực hiện (hai thiết bị, mất mạng giữa chừng, hết hạn phiên).
