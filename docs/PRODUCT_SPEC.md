# PickleUp — PRODUCT SPECIFICATION (V5.x)

**Hiện hành — 12/11/2026:** main `6e22b1f` /5.17.0 sau #46 đã merge; UI/Pages/Cloudflare success cùng SHA, logs UI sạch. [PR5b2d1/V5.19.0](RESTORE_PREVIEW_PR5B2D1.md) bổ sung đối chiếu tệp cứu hộ với cache hiện tại và danh sách việc cần kiểm trước khôi phục; đang PR, chưa merge/deploy. Chỉ đọc, chưa restore/replay/ghi đè, giữ IDB3/SQL/Auth/signup và dữ liệu khách. Các mốc thấp hơn là lịch sử.


**Rà soát sau #41 — 11/11/2026:** main `1f6ecd9` /5.15.0 có UI post-merge557 pass/1 flaky, chưa đạt release sạch dù Pages/backend success. Bản vá5.15.1 chặn Auth ngoài staging/local backend, đóng signup frontend, sửa readiness và khóa dependency CI; đang PR, chưa merge/deploy. [Đánh giá và việc còn lại](REVIEW_SAFETY_2026_11.md).

**Trạng thái 10/11/2026:** Main `cc0d944` / V5.14.1 sau #40; UI/backend/Pages/Cloudflare sạch cùng merge SHA theo [tiến độ](V6_PROGRESS_REVIEW.md). Operator xác nhận GitHub tự deploy, lịch tập đề xuất/check-in A→B đúng ngày/trạng thái/phút. [Sổ nghiệm thu](STAGING_AUTH_VERIFICATION.md) giữ phạm vi, không suy thành các nhóm hoạt động/giáo án hoặc expiry/SMTP/physical QA đã đạt. Full V6 restore/purge, backup và pilot còn gate.

**PR6b/V5.15.0 đang triển khai:** [Chế độ thử account-data](STAGING_ACCOUNT_PR6B.md) mở ba flags trên đúng staging, nguồn/consent/read/send riêng. Chỉ dữ liệu mới sau chọn nguồn được xếp hàng, lịch sử khách không tự nhập. Nút vào chế độ thử và phiên bản trong Dữ liệu; importer vẫn tắt. Bản PR chưa merge/deploy, chỉ dữ liệu giả.

## 1. Mục đích, đối tượng, triết lý

PickleUp là web/PWA huấn luyện **pickleball bằng tiếng Việt**, dùng trên PC, iPhone/iPad và Android; hoạt động cục bộ bằng trình duyệt, không cần tài khoản. Người mới và người chơi phong trào có thể tự đánh giá, luyện kỹ thuật, xem gợi ý, ghi kết quả và theo dõi tiến bộ. Thiết kế hướng tới trải nghiệm ngắn gọn, an toàn, rõ ràng, trung thực về bằng chứng. Không tự gắn nhãn DUPR hoặc chứng nhận trình độ.

**Ưu tiên sản phẩm:** đúng kỹ thuật, tính liên tục của buổi tập, mục tiêu vừa sức, hồi phục, khả năng xem lại bằng dữ liệu xác thực; không chạy theo số lượng màn hình hoặc phiên bản. Các tính năng mới phải có ý nghĩa đối với người chơi và kiểm thử được.

## 2. Bản đồ tám trang (route ID là hợp đồng)

| Route | Mục tiêu và chức năng chính | Những điều cần giữ |
|---|---|---|
| `home` — Tổng quan | Chương trình, phần luyện tập và điều hướng nhanh | Home tải gọn; có lối tắt sang Hành trình |
| `journey` — Hành trình | Hành trình sáu bước V5.0, gợi ý hành động tiếp theo, check-in hôm nay | Không tự đánh dấu hoàn thành từ timer/điểm |
| `coach` — HLV cá nhân | Đánh giá sáu kỹ năng, giáo án cá nhân 1.0–4.0 theo module hiện có | Đánh giá nội bộ, không phải chứng nhận |
| `court` — Trên sân | Đồng hồ sáu phần, sơ đồ sân, nhập kết quả giáo án cá nhân | Chỉ áp dụng khi đã có kế hoạch cá nhân tương thích |
| `academy` — Học viện | **104 giáo án hiện có trong khoảng 1.0–5.0** (24 bài 4.0–5.0 từ V5.27.0, chưa có HLV duyệt), chọn bài, lưu điểm, đồng hồ từng bước | Bài Học viện và giáo án cá nhân là hai dạng khác nhau |
| `progress` — Tiến bộ | Lịch sử kiểm tra, mục tiêu tuần, lịch đề xuất, check-in và kế hoạch–thực tế | Phân biệt các nguồn dữ liệu theo nghĩa |
| `matches` — Thi đấu | Nhật ký trận, chiến thuật và phối hợp đánh đôi | Không tự suy ra chất lượng thi đấu từ bài kỹ thuật |
| `settings` — Dữ liệu | Xuất/nhập JSON và cứu hộ dữ liệu khách; công cụ tài khoản/pilot và chẩn đoán hiệu năng chỉ hiện trên staging/localhost (V5.18, `debug=1` mở riêng chẩn đoán) | Tương thích ngược, xác nhận trước ghi đè |

**Trang bài Học viện (V5.20):** nội dung trước điều khiển; tầng 1 hiện sơ đồ, 3 điểm cần nhớ và một hành động "Bắt đầu tập" (chỉ mở chế độ tập trung, không lưu/xác nhận); tầng 2 thu gọn gồm luật theo kỹ năng (tự mở cho 1.0–2.5), lỗi thường gặp, chuẩn bị và lộ trình 60 phút.

`modules/page-catalog.js` là nguồn đúng cuối cùng cho danh mục route/section. Từ V5.18, menu chính và dock dùng 4 tab (`home`, `academy`, `court`, `progress`) cộng menu **Thêm** (`journey`, `coach`, `matches`, `settings`); không bỏ route nào. Cả menu điều hướng chính, menu cố định và link sâu `?page=...#section` phải hoạt động, kể cả khi đổi trang rồi quay lại. `journey` là trang mới **thêm vào**, không thay thế các trang chuyên môn.

**Phân biệt:** lộ trình roadmap tới 5.0 là định hướng nội dung; đừng viết rằng thư viện đã có bài đến 5.0 khi thực tế chưa có.

## 3. Hợp đồng nghiệp vụ “Hành trình” V5.0

Hành trình gồm **sáu bước liên kết**:

1. **Đánh giá:** mở `coach#selfAssessment`. Nếu có bài đánh giá sáu kỹ năng hợp lệ thì hiển thị mốc đã có; nếu thiếu, đề nghị đánh giá nhưng vẫn cho phép học/tập. Không gán cấp độ thi đấu.
2. **Mục tiêu & lịch tập:** đọc mục tiêu tuần (1–5 ngày, cấp độ hợp lệ), độ dài 20/30/45/60 phút và chế độ nhẹ; hiển thị ngày tập/ngày nghỉ. Lịch là **đề xuất**, không phải attendance. Không tự ghi lại kế hoạch quá khứ khi cấu hình hiện tại thay đổi.
   Điều khiển mục tiêu tuần chỉ được bật sau khi đọc mục tiêu đã lưu và gắn xử lý lưu; lựa chọn mới phải giữ nguyên sau reload, kể cả khi module tải chậm.
3. **Bài học:** ưu tiên bài người dùng đã chọn trong Học viện **cùng cấp độ hiện tại**, tiếp đến bài theo lịch tương lai và thuật toán gợi ý; không mở sai cấp độ. Bảo toàn lựa chọn bài gần đây khi quay lại.
4. **Thực hành:** từ Học viện dùng đồng hồ **theo từng bước Học viện**; nếu muốn dùng đồng hồ **Trên sân**, phải có giáo án cá nhân tương thích đã tạo/chọn, nếu không dẫn đến HLV để tạo. Có hướng dẫn khởi động–kỹ thuật–kiểm tra–thả lỏng, chú ý ngắt nghỉ.
5. **Check-in thủ công:** người dùng chủ động chọn `done` (nhập phút thực tế từ 5 đến 180), `skipped` hoặc xóa bản ghi của **ngày địa phương hiện tại**. Dữ liệu ghi vào khóa V4.8 hiện có. Mở lesson, chạy timer, lưu điểm /20 **không** tự tạo `done`. Một ngày có một trạng thái hiện hành; sửa trạng thái thì thống kê phải cập nhật.
6. **Tiến bộ và bước tiếp theo:** so sánh kế hoạch và thực tế có chú giải đúng, xem xu hướng, chỉ gợi ý điều chỉnh cường độ khi dữ liệu đáng tin; không tự thay đổi lịch và không yêu cầu tập bù.

Ưu tiên next action hiện hành: chưa lưu mục tiêu → gợi ý đặt mục tiêu; chưa có đánh giá → gợi ý đánh giá tùy chọn; chưa có giáo án → gợi ý chọn bài; hôm nay đã xác nhận tập → xem lại/hồi phục; còn lại → tiếp tục tập. Việc “có điểm đánh giá” không phải bước bắt buộc để tiếp tục tập.

**Tiêu chí chấp nhận:** truy cập trực tiếp URL Hành trình, quay về giữ dữ liệu; đọc đúng mức độ hoàn thành và thời gian; mở bài Học viện đúng ID; lưu/sửa/xóa check-in; không tự ghi nhận attendance từ điểm, timer hoặc các bước checklist; hoạt động trên các viewport được yêu cầu và không gây horizontal overflow.

## 4. Sáu kỹ năng cốt lõi

| Key | Kỹ năng | Ví dụ luyện tập phù hợp |
|---|---|---|
| `serve` | Giao bóng | Hợp lệ, độ sâu, ổn định mục tiêu |
| `return` | Trả giao bóng | Trả sâu, kiểm soát hướng, tiến lên phù hợp |
| `dink` | Dinking | Bóng thấp, nhẹ và đều ở kitchen |
| `volley` | Volley | Kiểm soát vợt, block, phản xạ và chọn vị trí |
| `position` | Di chuyển / vị trí | Split step, di chuyển ngang, cân bằng và phối hợp |
| `strategy` | Chiến thuật | Chọn bóng an toàn, đánh đôi và xây dựng pha bóng |

Mỗi kỹ năng cần có mô tả thao tác, mục tiêu, lỗi thường gặp và chỉ báo theo bài. Thang /20 là kiểm tra **nội bộ** với điều kiện cùng bài/cùng độ khó; **không phải DUPR**. Không cộng các bài không tương đương để kết luận tiến bộ hay tự thăng hạng.

## 5. Giáo án 60 phút và phiên rút gọn

| Phần | Phút |
|---|---:|
| Khởi động (vận động khớp, bước chân nhẹ) | 10 |
| Bài kỹ thuật 1 | 12 |
| Bài kỹ thuật 2 | 12 |
| Bài kỹ thuật 3 | 15 |
| Kiểm tra kỹ năng | 6 |
| Thả lỏng / phục hồi | 5 |
| **Tổng** | **60** |

Phiên **20/30/45 phút** là **rút gọn**, không được quảng bá là hoàn thành nguyên vẹn 60 phút. Nêu rõ phút từng khối, số lần khi có dữ liệu, cường độ và nghỉ. Với người mới, lớn tuổi hoặc đang đau mỏi, khuyến khích giảm tải, ngày hồi phục, tránh đổi hướng mạnh/nhảy quá sức; bệnh nền/chấn thương đáng kể cần tham khảo bác sĩ trước thay đổi tải tập.

## 6. Phân biệt dữ liệu để không báo cáo sai

- **Kế hoạch** (`weekly-plan-core`): ngày dự kiến/khối thời gian dự kiến; không bao hàm đã tập.
- **Lượt kiểm tra** (`academy_v2`, `academy_history_v44`, nhật ký các bài): là kết quả bài tập; một ngày có điểm không đảm bảo đã hoàn thành cả buổi.
- **Ghi nhận ngày có hoạt động theo điểm** (chức năng V4.6): một ngày có ghi điểm; không phải check-in buổi tập xác minh.
- **Attendance thật** (`weekly-checkins-core`): chỉ trạng thái được người dùng xác nhận; ngày không ghi nhận là “chưa có dữ liệu”, **không** phải “bỏ qua”.
- **Plan vs Actual V4.9**: so sánh tuần hiện tại với mục tiêu hiện tại; loại ngày dự kiến **chưa đến** khỏi mẫu số “đến hôm nay”; ngày tập ngoài lịch vẫn là hoạt động thực tế.
- **Lịch sử V4.9**: trước V5.0 chưa có snapshot mục tiêu từng tuần. So sánh dữ liệu tuần cũ với mục tiêu **hiện tại** chỉ có ý nghĩa tham khảo, không gọi là tỷ lệ tuân thủ kế hoạch lịch sử.
- Khuyến nghị từ ít nhất **3 trong 4 tuần đã kết thúc có bản ghi thủ công** (theo logic hiện có) là gợi ý bảo thủ; không được tự động tăng/giảm số ngày, đẩy người dùng tập bù hoặc tạo số liệu giả.

## 7. Nguyên tắc cá nhân hóa, tự động hóa và hồi phục

Ưu tiên bằng chứng: (1) kết quả cùng bài và điều kiện tương đương; (2) kỹ năng cần cải thiện; (3) mức đạt tham khảo riêng của bài; (4) hoạt động thực tế gần đây; (5) thời gian/mục tiêu; (6) khả năng hồi phục và số ngày nghỉ. Giải thích được vì sao một bài được chọn; quy tắc cố định không được quảng bá là AI/ML khi không dùng mô hình học máy. Không tự suy đoán điểm DUPR, trình độ thi đấu hoặc sức khỏe.

**Ý tưởng tương lai, chưa mặc định là tính năng hiện có:** đánh giá định kỳ tốt hơn, điều chỉnh tải cá nhân có xác nhận, hướng dẫn chiến thuật đánh đôi theo tình huống, tăng hỗ trợ thiết bị/offline, đồ thị có hành động và accessibility. Mọi thay đổi phải có acceptance criteria và đo lường.

## 8. Tính trung thực và trạng thái phát hành

Luôn phân biệt: *đề xuất*, *đã lưu điểm*, *đã xác nhận buổi tập*, *đã deploy*, *CI xanh*, *đã kiểm thử ngoài sân/thiết bị thật*. Các trạng thái này không thay thế nhau. Nội dung mới phải đúng điều kiện hoạt động thực tế; không bịa dữ liệu lịch sử hoặc kết quả luyện tập.


## V5.1 — Sau buổi tập

Hành trình hiển thị tóm tắt sau xác nhận thủ công hôm nay: số phút thực tế, giáo án gắn với bản ghi và số ngày/phút trong tuần so với mục tiêu hiện tại. Bản ghi không có lessonId được ghi rõ chưa có giáo án, không suy đoán từ lựa chọn mới. Đạt mục tiêu tuần, chế độ nhẹ hoặc buổi từ 60 phút ưu tiên hồi phục; có điểm cùng bài hôm nay thì xem kết quả; còn lại chuẩn bị lịch kế tiếp. Tóm tắt giữ qua reload, cập nhật khi sửa và ẩn khi bỏ qua/xóa. Không thêm storage key/schema, không tự xác nhận từ đồng hồ/điểm.

Kiểm thử tự động không thay thế QA trên iPhone/iPad/Android thật. V5.1 đã merge/deploy theo baseline ở đầu tài liệu; QA thiết bị thật chưa được xác minh trong PR0.

PR4c / V5.5.0 tích hợp nguồn tài khoản opt-in và UI sync/conflict cho mục tiêu/check-in ở Journey/Progress; flags vẫn tắt, chưa rollout. Backup V5 chỉ dữ liệu khách; cache V6 hai domain có export riêng chưa round-trip. [Hợp đồng PR4c](SYNC_UI_PR4C.md).

PR5a2b / V5.6.0 thêm source hoạt động opt-in, UI lưu/xóa lượt Academy và review; cùng nguồn điểm/history trên Academy/Journey/Progress, không mirror V5. Xu hướng chỉ cùng bài/nội dung/điều kiện biết rõ; unknown/future không thành ngày tập. Coach chưa nạp account points vào giáo án khách. Bốn flags vẫn false, source UI ba nhóm sự kiện khác chưa chuyển. [Hợp đồng và giới hạn](ACADEMY_ACCOUNT_PR5A2B.md).

PR5a2c / V5.7.0 nối ba loại đánh giá và matches vào kho hoạt động hiện hữu. Self0–2 không là stage/advanced0–20; metric sets riêng, không tự đổi level/DUPR/attendance. Journey nhận mốc account tùy chọn, báo cáo trận theo source; history raw phân trang giữ unknown/future ngoài thống kê. Draft/status cũ clear theo source token, quota giữ input, không mirror hoặc tự copy sang plans khách. [Hợp đồng/cấu hình/giới hạn](ASSESSMENT_MATCH_PR5A2C.md). Flags vẫn tắt; giáo án/training còn device-only.

PR5b1c/V5.8.0: người dùng chọn riêng nguồn giáo án, tạo basic/advanced snapshot từ điểm nhập thủ công, chọn và đồng bộ trước Court. Result CAS không tạo attendance/training. Nút read/send/retry/review/delete/restore rõ, guest giữ nguyên. Account timer không resume sau reload; nhật ký/bài Học viện gần nhất vẫn trên thiết bị. [Hợp đồng và giới hạn](PLAN_UI_PR5B1C.md).

PR5a2d/V5.9.0: Court ghi drill hoặc lượt kiểm tra riêng vào activity source khi own plan đã ACK và cùng nguồn. Điểm plan/timer không tự sinh training/attendance. History/evaluation/Journey/planner/tactical dùng cùng nguồn, account không trim1000; so sánh tách plan/bài/level/kind/conditions, orphan/null/future không bị dựng dữ liệu. [Hợp đồng và giới hạn](TRAINING_ACCOUNT_PR5A2D.md).

PR5b2a/V5.10.0: lựa chọn bài Học viện theo nguồn giáo án/selection, điểm theo nguồn hoạt động riêng. Academy/Journey/Progress links dùng cùng choice, pending có nhãn, quota giữ preview, conflict review cả hai field. Checklist/focus/timer khi có nguồn account chỉ RAM phiên trang, guest giữ persistence. Chọn bài/checkbox/timer không tạo attendance hoặc attempt. [Hợp đồng/giới hạn](ACADEMY_SELECTION_PR5B2A.md).

[PR5b2b1/V5.11.0](ACADEMY_DEVICE_STATE_PR5B2B1.md) persist checklist và bước tập trung Học viện trong device_state account/browser, cùng schema1. Typed atomic patches kiểm cả hai consent revisions, namespace/late-response guards và thông báo quota/corrupt; không RPC/outbox/guest mirror. Timer vẫn RAM, state mới chưa nằm trong export hiện tại; full device state/backup/purge còn gate.

[PR5b2b2/V5.12.0](COURT_CHECKPOINT_PR5B2B2.md) thêm điểm dừng Court local theo account/browser/plan: explicit pause/save/preview/restore paused, không tự resume hoặc tạo RPC/attendance. Typed device_state + identity metadata trên schema1; CAS checkpoint và consent/own ACK plan/selection/epoch fence trong transaction. Hai tab cần đọc/review trước ghi đè, quota giữ frozen retry, late responses/dialog guards không cập nhật account khác. Guest giữ timer key cũ. Checkpoint chưa nằm trong export hiện tại; full backup/purge và pilot gates còn lại.


## Cập nhật PR5b2c1 / V5.13.0 — cứu hộ cache chỉ đọc

[PR5b2c1/V5.13.0](ACCOUNT_RESCUE_PR5B2C1.md) thêm cứu hộ toàn bộ cache account trên máy và kiểm tra tệp chỉ đọc; chưa restore/purge hoặc backup toàn cloud. Năm flags false, URL/key trống; [tiến độ/gates](V6_PROGRESS_REVIEW.md). Snapshot readonly một transaction trên records/outbox/conflicts/sync_cursor/import_receipts/device_state/metadata, đúng namespace đăng nhập. Giữ cả checkpoint Court/checklist/focus và metadata identity trước đây chưa được các exports cũ bao phủ. Không đọc guest/legacy_snapshots/Auth, không SQL/RPC hoặc tự replay. Credential/owner/size/JSON validation fail toàn bộ; SHA256 không là quyền restore. A→B/logout bỏ phản hồi và link cũ. Tệp plaintext riêng tư cần lưu ngoài browser. Chưa thay gate restore/purge/backup vận hành; policy target chưa là SLA.

**Backup guest sau audit #41:** validate toàn bộ V1, phần vắng mặt giữ nguyên/null xóa rõ ràng, journal trước ghi và recovery trước feature reads; quota/conflict chưa an toàn thì giữ dữ liệu và dừng. Raw rescue18 key không phụ thuộc quét khóa lạ. Không backup/restore cloud hoặc Auth; xem [hợp đồng và giới hạn](GUEST_BACKUP_SAFETY.md).

## PR5b2c2b / V5.17.0 — UI dọn cache staging

Dữ liệu có mục dọn cache staging riêng, cần online và đóng các cửa sổ PickleUp khác. Chỉ cache đã xử lý xong, tệp phải được tải/giữ ngoài browser và xác nhận; tệp chưa nhập lại được. Thao tác ghi rõ đăng xuất trước khi xóa. Checklist/focus/checkpoint chỉ trên máy có thể mất khỏi browser; cloud/guest/tài khoản khác giữ nguyên. Không force discard pending hoặc account deletion. [Hợp đồng và giới hạn](CACHE_PURGE_UI_PR5B2C2B.md).

## PR5b2d1 / V5.19.0 — đối chiếu trước khôi phục

Trong Dữ liệu → Cứu hộ cache V6, chọn tệp đúng tài khoản, kiểm checksum rồi bấm so tệp với cache trên máy. Hiển thị số dòng giống, chỉ tệp, chỉ máy, khác cùng khóa và chưa so được khóa. Chỉ là ảnh chụp tại lúc đọc, không số buổi tập hoặc bảo đảm phục hồi. Tệp có ACK vẫn cần xác minh server; không có nút ghi/restore/replay. Guest và backup V5 giữ nguyên. [Phạm vi, evidence và giới hạn](RESTORE_PREVIEW_PR5B2D1.md).
