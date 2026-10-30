# PR3d — kiểm chứng UI Auth và import với backend local thật

Nền `fc3198aba5642c74367553d773759d7b3a8a8573` sau merge #17, app5.4.0. [Responsive sau merge](https://github.com/ndlong78/Pickleball/actions/runs/41075211364):144 unit +282 browser pass, không retry/flaky; [backend](https://github.com/ndlong78/Pickleball/actions/runs/41075211296) và [Pages](https://github.com/ndlong78/Pickleball/actions/runs/41075209476) success cùng SHA. Không có PR mở trùng khi bắt đầu.

PR này khép khoảng trống browser UI + GoTrue thật của PR3c trước khi thêm sync preferences/checkins (PR4). Không chuyển nguồn dữ liệu, thêm sync engine/repair API, bật flags hoặc đổi production. Không thay executable app/assets/storage schema nên giữ version/PWA5.4.0. Auth/import configs được thay **chỉ trong HTTP test host**, không sửa file cấu hình shipped.

## Chạy và trust boundary

Sau `supabase start` và `supabase db reset --local` trên project ephemeral `pickleup-v6`, cài Node24 và browsers chuẩn rồi chạy:

```bash
npm ci --no-audit --no-fund
npx playwright install --with-deps chromium webkit
npm run test:auth:browser
```

Script chỉ chấp nhận API `http://127.0.0.1:54321` từ `supabase status`, không nhận URL project/credentials cloud. Mailpit dùng loopback54324. Test host bind127.0.0.1:4173 dưới `/Pickleball/`; API gateway test bind127.0.0.1:4174 và chỉ forward danh sách endpoint Auth/import RPC. CORS chỉ cho đúng app origin; không proxy tùy ý hoặc redirect upstream.

CLI2.54.11 local dùng anon JWT, còn adapter shipped chỉ nhận `sb_publishable_`. Gateway sinh public alias trong memory, thay apikey/anonymous Authorization bằng anon key local ở boundary. JWT người dùng đã xác thực được giữ nguyên; GoTrue/REST/SQL response không fabricate. Đây là **fixture ánh xạ API key local**, không phải kiểm chứng gateway/publishable key của Supabase Managed hoặc cấu hình cloud. Frontend không được nới validator để nhận anon JWT/secret. Backend key không được gửi trong static config.

UI, adapter, bundled SDK, mapper/controller, native IndexedDB và Service Worker đều là code thật. Không page.route/mock Auth/RPC, không fake-indexeddb trong scenario browser. Fault fixture chỉ giữ phản hồi pull thật hoặc ngắt kết nối sau khi upstream batch đã commit thành công; receipts/idempotency vẫn do PostgreSQL thật xử lý.

## Hai scenario — Chromium và WebKit

Mỗi engine tạo hai tài khoản `.invalid` bằng UI OTP; local email quota20/h chỉ phục vụ tổng sáu recipient giả của các suite, không là cấu hình SMTP production.

1. Guest → yêu cầu OTP signup → đọc email Mailpit trong memory → thử mã sai → xác thực bằng mã đúng. Account mới có canonical private data rỗng; chưa begin import sau login.
2. Chọn tệp synthetic có một legacy snapshot, hai Academy attempts trùng nội dung nhưng là hai lượt, một check-in nguồn được xác nhận trước đây (lesson null,30 phút). Preview/consent/timezone rõ; chưa consent thì nút import disabled.
3. Server commit batch nhưng fixture ngắt phản hồi. UI báo lỗi mạng/khả năng nhập một phần; reload khôi phục phiên SDK và checkpoint IDB, chọn lại đúng tệp, xác nhận lại và replay **cùng operation ID/body**. Finish + canonical reconcile rồi checkpoint complete,4 applied; không nhân đôi attempts/check-in.
4. Tab mới khôi phục phiên thật mà không tự upload. Giữ một phản hồi pull A thật đang chờ; logout tab khác → login B bằng OTP UI → release phản hồi A. Preview/file A được xóa, request A bị abort/ignore; B chỉ đọc dữ liệu của B.
5. B nhập cùng tệp; UUID events khác A, counts của mỗi account độc lập. Check-in có provenance legacy, không bịa attendance từ snapshot/attempts. Các localStorage keys luyện tập giữ nguyên.
6. SW thực sự ready dưới prefix Pages; CacheStorage không chứa Auth/API origin hoặc token/code query. Logout B phản ánh ở cả ba tab; reload vẫn guest và không còn private preview.

Runner dùng Playwright API trực tiếp, không runner report/trace/screenshot/video/storageState/HAR. Chỉ in engine, kết quả và phase enum cố định nếu fail; không in error message/stack, email/OTP/session/payload. Không bật DEBUG. Keys/codes/tokens chỉ memory; không gửi vào artifact. Timeout tổng240s, cleanup đóng browser/server và backend workflow stop local containers always. Không tự retry scenario để che flaky.

## Evidence và giới hạn

`tests/auth-browser-host.test.js` kiểm boundary loopback, static path, CORS/key allowlist, anonymous alias mapping/user JWT passthrough và fault sau upstream; upstream của các unit này là fixture, **không phải Auth thật**. Giữ toàn bộ unit/full Chromium/WebKit regression và backend pgTAP/REST/Auth suites hiện hữu. Backend CI thêm bước install engines và real-browser scenario sau Auth integration. Số pass/fail/flaky và đúng HEAD ghi tại PR.

Môi trường executor không tải được browser chuẩn vì proxy trả403 ở CDN; không gọi Chromium cũ là kiểm chứng chuẩn. Supabase image đầy đủ từng vượt disk VFS của executor; full local stack/browser scenarios chạy trên GitHub Actions VM ephemeral. Tách rõ kết quả CI này với việc chạy trực tiếp trong executor.

Chưa kiểm chứng staging SMTP/deliverability/quota, Managed publishable gateway/HTTPS/redirect policy, JWT hết hạn theo thời gian thực/SDK auto-refresh trong browser, thiết bị thật, eviction/quota/load hoặc repair/amend import manifest. Backend suite vẫn kiểm real refresh/logout; unit kiểm expiry/rate limits/account-switch không thay các gate staging. Không rollout trước policy backup/restore/privacy và staging readiness. PR4 sync cùng conflict UI là bước tiếp theo độc lập; importer repair vẫn cần thiết trước pilot nhận dữ liệu thật.
