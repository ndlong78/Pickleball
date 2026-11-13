# V5.17.0 — sửa flaky kiểm thử reload cache sau #45

Main `5767079f9bf6ba8be557d9ff2a3757965f6c4da7`, app5.17.0, PR45 merged12/11/2026. Không PR mở trùng lúc bắt đầu. Bản này chỉ tests/workflow/docs, không thêm restore hoặc thay frontend/IDB/RLS/SQL/Auth/feature flags/18 keys guest. Giữ build/PWA5.17.0 vì runtime không đổi.

## Bằng chứng lỗi và nguyên nhân

[UI43149008204](https://github.com/ndlong78/Pickleball/actions/runs/43149008204), job130953498980:394 unit pass; browser603 pass/1 flaky. Ca WebKit820 `export, explicit confirm, logout and own clean-cache purge` thất bại lần đầu `ReferenceError: Can't find variable: PickleUpLocalRepository` tại `snapshot()` sau `page.reload()`; retry1 qua. `failOnFlakyTests` làm workflow failure đúng thiết kế. Không rerun main để che lỗi; hai lượt WebKit5+5 trước suite pass, các lượt10+20 sau suite bị skip do failure.

Page Settings render markup trước khi lazy scripts thực thi. Capture ban đầu có disabled và link có hidden ngay trong HTML, nên chờ hai trạng thái này không bảo đảm repository/controller/Auth đã khởi tạo. Test tiếp tục đọc IDB quá sớm. Trace/screenshot/video của fixture đã tắt; log và vị trí call đủ xác định. Đây là lỗi readiness của test; chưa có bằng chứng lỗi transaction hoặc mất dữ liệu sản phẩm.

[Backend43149008055](https://github.com/ndlong78/Pickleball/actions/runs/43149008055), job130953498551:300 pgTAP/48 REST, GoTrue-Mailpit browser Chromium/WebKit (cả product purge UI) pass. [Pages43149007276](https://github.com/ndlong78/Pickleball/actions/runs/43149007276) và Cloudflare Production build7463cd20 success cùng SHA. Không dùng các check xanh này thay UI main đang đỏ.

## Tái hiện và sửa

Tại viewport820, fixture mới giữ thao tác append script `local-repository.js` sau reload. Bytes vẫn do server/SW thật cung cấp, không mock repository/IDB hoặc kết quả purge. Hook chỉ trì hoãn thực thi rồi trả lại appendChild gốc; không dùng sleep. Trong lúc giữ, disabled/hidden cũ vẫn qua và repository chưa tồn tại. Chạy đường kiểm tra cũ trên Chromium/retries0 tái hiện đúng ReferenceError (1 failed), không phụ thuộc may rủi của WebKit.

Sau khi nhả script, test ở cả bốn viewport await `PICKLEUP_PAGE_LOADER.ensure('settings')`, rồi đợi Auth hiển thị guest và controller purge có trạng thái yêu cầu đăng nhập. Mới đọc native IDB. So toàn snapshot A sau reload với sau commit; B và bytes guest cũng phải giữ nguyên. Không bỏ assertion, tăng timeout/retry, skip test hoặc tắt failOnFlakyTests.

CI thêm10 lượt WebKit820/retries0 trước suite đầy đủ, ngoài40 lượt supplemental đang có. Runtime JS/HTML/CSS/SW/package/dependencies không đổi; không có migration hoặc deploy config mới. Local394 unit/9 Chromium UI và10 lượt Chromium820 lặp/retries0 pass sau sửa; local WebKit thiếu GTK4/Graphene/Harfbuzz ICU/Manette/Hyphen/GLES, nên kiểm WebKit trên CI thật. Kết quả repeat local và CI đúng HEAD được ghi trong PR trước ready, không lấy baseline thay kết quả mới.

## Cấu hình và phần chưa kiểm

Không cần chạy SQL, bật flag, đổi signup hoặc upload thủ công. Owner vẫn merge qua GitHub; sau merge kiểm lại main UI/backend/Pages/Cloudflare cùng SHA. Không tự merge. Dữ liệu staging vẫn thử; Supabase migration7/signup-off do owner đã xác nhận, không chạy lại6→7.

Giữ gate Managed UI purge, hoạt động/giáo án/A→B/conflict/expiry/custom SMTP và QA thiết bị thật; test fixture không thay Auth integration hoặc Managed. Sau khi main sạch, tiếp tục restore compatibility và importer repair, không tự replay pending hoặc coi tệp rescue là backup toàn tài khoản.

## Đã kiểm main sau #46

Merge `6e22b1f89d373cec6fb1342287c31b3987e53741`, [UI43240835088](https://github.com/ndlong78/Pickleball/actions/runs/43240835088):394 unit/604 browser +50 lượt bổ sung/3 HTTP/1 Workers,0 fail/flaky/retry. [Pages43240834380](https://github.com/ndlong78/Pickleball/actions/runs/43240834380) và Cloudflare Production buildce39f4a1 success cùng merge SHA. Backend không tạo run push mới do path filters; PR46 HEAD8c180b9 backend43235807953 đã sạch. Bản sửa flaky đã có clean run main, tiếp tục PR5b2d1 đối chiếu trước restore; không suy thành Managed/physical QA.
