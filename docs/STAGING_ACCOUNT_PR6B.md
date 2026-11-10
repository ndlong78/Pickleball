# PR6b / V5.15.0 — thử các nguồn tài khoản trên staging

Baseline main `cc0d94498a19cec64570159b953e43d271389ab0` sau #40, app5.14.1; không PR mở trùng khi bắt đầu. Main UI42834392634, backend42834392650, Pages42834391795 và Cloudflare Production build8bb66828 đều success cùng merge SHA; đã đọc logs UI/backend,0 fail/flaky/retry. Operator đã xác nhận primary staging chạy5.14.1 và A→B khớp lịch tập đề xuất/check-in đúng ngày, trạng thái, số phút. Đây là evidence Managed do operator báo, không phải Codex trực tiếp quan sát.

## Phạm vi

Client/RPC cho hoạt động và giáo án đã có trên main; PR này mở chế độ nghiệm thu bằng dữ liệu giả, giữ ba nguồn/consents độc lập. Không SQL/migration/RLS, schema IndexedDB, Auth adapter hoặc dependencies mới. Không mở pilot dữ liệu thật hay signup server. Importer luôn false;18 khóa guest không tự nhập, mirror hoặc xóa.

| Nguồn chọn trong Dữ liệu | Dữ liệu có thể tạo mới, đọc và gửi |
|---|---|
| Mục tiêu/check-in | `user_preferences`, `practice_checkins`; lịch đề xuất được tính từ thiết lập, không phải giáo án cá nhân |
| Hoạt động | `academy_attempts`, `skill_assessments`, `match_records`, `training_entries`; đánh giá giữ đúng các thang điểm riêng |
| Giáo án/lựa chọn | `personal_plans`, `user_selections`; giáo án cơ bản/nâng cao, lựa chọn cá nhân và bài Học viện gần nhất |
| Giữ local theo account/browser | Checklist/focus Học viện và checkpoint Court; không tự chuyển sang browser B |
| Giữ trong phiên trang | Đồng hồ; không đồng bộ hoặc tự resume trên thiết bị khác |

Nhật ký tập mới cần nguồn hoạt động và giáo án cùng account, epoch phù hợp, plan/selection đã ACK. Chọn bài, lưu điểm hoặc chạy timer không tự tạo attendance. Giáo án khách cũ không thay cho giáo án account. Backup V5 vẫn chỉ guest; cache exports V6 chưa là backup toàn tài khoản hoặc tệp có thể restore.

## Gate và vòng đời

`modules/data/staging-pilot.js` chạy sau Auth config và trước các flags, lazy trên các trang account; Home vẫn không nạp account modules. Gate dùng origin HTTPS chính xác `https://pickleup-staging.home-309.workers.dev`, path `/`, `/index.html`, `/Pickleball/`, `/Pickleball/index.html`, project URL đúng `https://rfeoeagklmaqmkcdhprb.supabase.co` (có thể có `/` cuối), Auth enabled và publishable key đúng prefix. Không dùng credentials trong query.

- URL thường, malformed/duplicate/unknown pilot, thiếu helper/Auth/key, sai project/host/port/path, GitHub Pages/custom domain và preview host: các nguồn off.
- `pilot=preferences-checkins` giữ tương thích chế độ PR6a: chỉ mục tiêu/check-in.
- `pilot=account-data` mở ba flags để người thử tự chọn nguồn. Login/reload/route/focus không tự đồng ý, nhập guest hoặc gửi RPC. Consent cũ chỉ khôi phục cache local; server được đọc sau thao tác chọn nguồn/đọc rõ ràng.
- Cờ frontend không thay Auth/RLS/CAS. Các RPC, namespace, epoch, immutable requests và review đang có giữ nguyên.

Settings có nút **Mở thử hoạt động và giáo án tài khoản**, chỉ xuất hiện trên staging đúng cấu hình. Nút chuyển tài liệu sang URL canonical, không để router bỏ query mới; hiển thị build để đối chiếu mà không cần Console. Mỗi panel/notice ghi chỉ dùng dữ liệu giả và dữ liệu cũ vẫn local. Hoạt động/giáo án cập nhật thông báo sync theo queue hiện tại, không giữ success cũ khi lưu thêm.

Thoát bằng URL thường rồi reload: các nguồn tắt, queue/cache vẫn giữ riêng theo account, không gửi hoặc clear storage. Trở lại trial khôi phục cache/consent, cần bấm đọc để nhận thay đổi mới từ browser khác. Không dùng số `acked` ở B để suy số dữ liệu đã nhận: đó là lịch sử command do chính browser B gửi; snapshot/cursor và giá trị UI mới là đối chiếu.

## Owner nghiệm thu sau merge

Chỉ triển khai **GitHub → main → Cloudflare Builds**, theo lựa chọn của owner; không dùng ZIP/upload thủ công. Preview PR không thay primary staging và không bật sync. Sau CI đúng HEAD sạch, owner merge riêng, xác nhận build5.15.0 trong trang Dữ liệu rồi mở nút thử hoặc:

```text
https://pickleup-staging.home-309.workers.dev/?page=settings&pilot=account-data
```

1. Dùng dữ liệu giả và account A hiện hữu. Chọn checkbox nguồn hoạt động rồi **Dùng kho hoạt động tài khoản**. Kho mới trống là hợp lệ; lịch sử khách không được tự chép vào.
2. Học viện: chọn một bài, nhập điều kiện và điểm thử, lưu; về Dữ liệu → **Đồng bộ hoạt động**, chờ ACK/hàng chờ0. Browser profile B đăng nhập cùng account, mở cùng chế độ, chọn nguồn/đọc, kiểm đúng bài/điểm/điều kiện. Làm tương tự với tự đánh giá và một trận thử.
3. Chọn riêng nguồn giáo án. Coach: nhập điểm thử để tạo/chọn giáo án mới, **Đồng bộ giáo án** trước Court. B đọc nguồn giáo án và kiểm nội dung/lựa chọn. Các fields mục tiêu/check-in vẫn cần nguồn riêng.
4. Nếu thử nhật ký: trên Court của own ACK plan, lưu một lượt drill/assessment riêng rồi **Đồng bộ hoạt động**; B đọc nguồn hoạt động và đối chiếu bài/plan/điểm/điều kiện. Không coi đây là check-in.
5. Đọc lại B sau thay đổi A, offline-save/reload/manual send, commit-loss replay, review conflict/delete và đổi account A→C. Không gửi queue của A qua C hoặc giữ form riêng của A trên C. Không xuất OTP/token/HAR/cache riêng tư vào issue hoặc artifact.

Giữ exact-head CI + main CI/Pages/Cloudflare checks sau merge. Mã và URL không tự chứng minh Managed writes/A-B/conflict/expiry/SMTP hoặc QA thiết bị thật. Operator cần báo kết quả cho từng nhóm.

## Kiểm thử và giới hạn

Unit phủ shared gate, ba flags độc lập, importer off, key/project/origin/path/query binding và fail-closed; giữ case PR6a. Browser config thật chạy trên staging origin ảo, bytes lấy loopback, Auth/RPC mock và native IDB; không gọi Managed. Bốn viewport390/820/1180/1440 kiểm entry, consent, pending/manual send, route/reload/exit và giữ guest; browser độc lập đọc Academy/đánh giá/matches/plans/training, own ACK dependency và late A→B. Regression toàn bộ Chromium/WebKit, PWA upgrade từ5.14.1 và backend GoTrue/Mailpit/REST/RLS thật local chạy riêng.

Auth browser integration thêm profile mới không có IDB/guest cache: chỉ tái sử dụng phiên đã xác thực trong RAM để kiểm độc lập đường đọc cả ba nguồn. Không ghi storageState/credentials ra tệp/log; không gọi đây là lần OTP login độc lập thứ hai. So sánh counts/cursor với toàn bộ RPC stream và goal UI, không gửi business writes khi đọc.

Safe restore/purge, importer repair, backup mã hóa/Auth recovery/deletion, SMTP/quota và field QA vẫn là gate [policy](PILOT_OPERATING_POLICY.md). Không tuyên bố full V6 hoàn tất hoặc mở pilot dữ liệu thật từ PR này. CI exact HEAD và giới hạn còn lại ghi trong mô tả PR sau khi đọc logs.
