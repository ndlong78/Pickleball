# PR6a / V5.14.0 — thử mục tiêu và check-in trên staging

Ngày 10/11/2026. Baseline `6f782d2eb83b8cd0288cf398b7d3981b5151b3ef` sau #38, app5.13.1, không PR mở trùng khi bắt đầu. [Pages42551232733](https://github.com/ndlong78/Pickleball/actions/runs/42551232733) success cùng merge SHA. #38 chỉ tài liệu nên không có main UI/backend mới do push filters; baseline runtime và PR #38 evidence tại [sổ nghiệm thu](STAGING_AUTH_VERIFICATION.md). CI exact HEAD của PR mới ghi trong mô tả PR sau khi đọc logs, không dùng baseline thay gate.

## Phạm vi

Chỉ mở thử hai domain `user_preferences` và `practice_checkins` qua URL tường minh, trên đúng Workers origin và project staging hiện có. Mặc định sync vẫn tắt; importer/activity/plan flags luôn false. Đây là luồng nghiệm thu với dữ liệu giả, chưa mở pilot dữ liệu thật hoặc public signup. Không SQL/migration/RLS, Auth adapter, RPC, IndexedDB schema hoặc18 khóa legacy thay đổi.

`sync-config.js` chỉ enabled khi đủ các điều kiện:

- HTTPS origin chính xác `https://pickleup-staging.home-309.workers.dev`, không port lạ/lookalike/custom domain/Pages.
- Path `/`, `/index.html`, `/Pickleball/` hoặc `/Pickleball/index.html`.
- Chỉ có một query `pilot=preferences-checkins`, đúng giá trị.
- Auth enabled và Project URL chính xác `https://rfeoeagklmaqmkcdhprb.supabase.co`, có thể có dấu `/` cuối.

Thiếu URL opt-in, Auth/project/location không hợp lệ thì false. Scope `staging-preferences-checkins` chỉ dùng hiển thị banner/notice rõ phạm vi thử. Gate frontend không là phân quyền: Auth/RLS/ownership/CAS trên server vẫn là boundary thật. Không dùng query cho credentials hoặc owner ID.

Login chưa tự chọn nguồn hoặc RPC. Người thử bấm dùng nguồn tài khoản để đọc lần đầu; consent cũ chỉ khôi phục cache local của đúng account. Đọc lại, lưu, gửi/retry và review conflict giữ đúng hợp đồng [PR4c](SYNC_UI_PR4C.md); lưu không tự gửi, HTTP200 không thay domain ACK. Chọn mục tiêu/check-in không bật nguồn hoạt động hoặc giáo án, không tự import hay mirror dữ liệu khách.

## Owner thử sau merge và deploy staging

Chờ CI đúng HEAD sạch, owner merge/deploy riêng và xác nhận build5.14.0. Dùng account A/B hiện hữu, dữ liệu tổng hợp và browser profile riêng. Mở:

```text
https://pickleup-staging.home-309.workers.dev/?page=settings&pilot=preferences-checkins
```

1. Đăng nhập A bằng OTP nhập mã. Trong mục mục tiêu/check-in, đọc banner chỉ dùng dữ liệu giả rồi bấm **Dùng mục tiêu và check-in của tài khoản**.
2. Xác nhận timezone cho ghi nhận mới, ví dụ `Asia/Ho_Chi_Minh`. Đặt mục tiêu thử2 ngày/tuần và lưu. UI phải báo chờ gửi; guest cũ giữ nguyên.
3. Về Dữ liệu, bấm **Đồng bộ thay đổi**, chỉ coi đã đồng bộ sau server ACK. Account mới không có dữ liệu là hợp lệ. Không dùng SQL Editor để ghi business rows.
4. Profile khác đăng nhập cùng A, mở cùng URL và chủ động chọn/đọc nguồn: mục tiêu đã ACK phải giống. Với B phải là nguồn của B; đổi A→B cùng profile không hiện/gửi queue của A.
5. Thử offline save → reload → online → manual send; thử hai profile A sửa cùng revision, nhận conflict rồi review chọn bản. Không bỏ qua conflict hoặc tạo request ID mới để né unknown commit.

Router giữ query qua Journey/Progress/Settings. Trên Workers, `/Pickleball/` redirect về root giữ query; GitHub Pages dù có query vẫn không mở mode này. PWA mở bằng start URL thường không tự thêm opt-in; mở link thử trong đúng browser/PWA context muốn kiểm. Dữ liệu/session giữa các origin hoặc storage container không tự chuyển.

Thoát bằng cách mở lại URL thường và tải lại:

```text
https://pickleup-staging.home-309.workers.dev/?page=settings
```

Sync không khởi tạo trên tài liệu mới không có query. Queue/cache giữ nguyên theo account, không gửi hoặc xóa. Trở lại URL thử chỉ load consent/cache local đã có, gửi vẫn thủ công. Không clear storage để thoát hoặc rollback; xuất cache nếu cần giữ pending. Full V6 restore/purge và backup vận hành còn gate.

## Version, PWA và kiểm thử

**Sửa trạng thái5.14.1:** sau một lượt sync đã ACK, lưu thêm hoặc nhận thay đổi từ tab khác phải cập nhật thông báo thành còn chờ gửi/review. Thông báo thành công không được giữ nguyên bên cạnh queue mới. Sửa này chỉ UI, không tự gửi hoặc sửa outbox/RPC/flags; owner merge/deploy riêng. [Release notes](../RELEASE_V5.14.1.md). Khi nghiệm thu bản sửa, đối chiếu build5.14.1; quy trình opt-in và thoát ở trên giữ nguyên.

App/build/assets/cache đồng bộ5.14.0 để browser không giữ `sync-config.js` cũ luôn false. PWA upgrade xóa cache release5.13.1 và các bản cũ, giữ local training probe. Không đổi worker caching Auth/REST, không cache token hoặc payload API.

Unit kiểm default-off, explicit opt-in, hostname/protocol/port/path/query/project binding, fail-closed và router giữ query. Browser dùng flag thật trên origin staging **ảo**, asset lấy từ loopback, Auth/RPC mock và native IDB:390/820/1180/1440, chưa RPC trước opt-in, save chỉ queue, manual send, query qua route/reload, thoát/re-enter giữ queue và guest. Không gọi domain thật hoặc Managed trong regression. Regression hiện hữu còn kiểm offline/retry/conflict/A→B và PWA; backend GoTrue/Mailpit/REST/RLS thật local vẫn chạy riêng.

Chưa kiểm Managed writes/A/B/conflict/expiry/SMTP đầy đủ hoặc physical QA cho mode mới. Nghiệm thu đăng nhập và metadata do owner báo không thay các ca này. [Policy](PILOT_OPERATING_POLICY.md) giữ pilot dữ liệu thật đóng tới khi backup/Auth recovery/restore/privacy/delete và các gate còn lại đạt.
