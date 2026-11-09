# PickleUp — Cloudflare Workers staging

Cập nhật nghiệm thu 09/11/2026. Đích được owner chọn: **https://pickleup-staging.home-309.workers.dev/**, đuôi `.dev`. Đây là **Workers Static Assets**, khác giao diện Cloudflare Pages. Không đổi DNS/custom domain `pickleup.no.id.vn` trong PR này.

Main nguồn `0fb6fc85060cd025482394e0f53f527e1f3f6bbc` sau owner merge [#37](https://github.com/ndlong78/Pickleball/pull/37), app/cache5.13.1. Auth bật với URL/key công khai; import/sync/activity/plan vẫn false. Operator đã xác nhận email OTP/login/kiểm dữ liệu riêng; [sổ nghiệm thu](STAGING_AUTH_VERIFICATION.md) phân biệt kết quả báo lại với phần chưa kiểm. Chưa đối chiếu deployment SHA, full migrations/RLS, SMTP/sender/quota hoặc signup server settings. Không tự mở signup hoặc bật bốn flags dữ liệu.

## 1. Phần repository chuẩn bị

- `npm run build:cloudflare` tạo mới `dist/` từ static runtime: shell/manifest/SW, root JS/CSS, modules/pages/icons/vendor và license Supabase. Không copy docs/tests/scripts/SQL/node_modules, dotfiles hoặc JSON dữ liệu. Từ chối symlink trong cây runtime; không đọc biến môi trường chứa credentials. `dist` là output sinh lại, không phải nơi lưu dữ liệu riêng.
- Giữ nguyên bytes runtime, gồm cấu hình public hiện có; không rebuild SDK hoặc thay Auth/data flags. Không thêm Worker API/backend, database binding hoặc proxy Auth. Frontend gọi Supabase HTTPS qua adapters hiện hữu. App/cache vẫn5.13.1 vì runtime không đổi.
- `wrangler.jsonc` nhắm Worker `pickleup-staging`, assets `./dist`, không account ID, token, secret, route custom domain hoặc DB bindings. Phần `home-309` thuộc account Cloudflare; file cấu hình không tự tạo/chuyển account subdomain.
- `_redirects` chỉ đóng gói vào static output: `/Pickleball` và `/Pickleball/*` chuyển302 về root tương ứng, giữ query. Router dùng `/?page=settings`; GitHub Pages tiếp tục dùng `/Pickleball/?page=settings`. SW/manifest/assets tương đối hoạt động ở root Workers; không deploy app ở một thư mục con mới.
- Wrangler pin4.158.0 là dev dependency, không vào frontend bundle. CI chỉ dry-run và chạy runtime local, không có deploy action hoặc Cloudflare credentials.

## 2. Owner cấu hình Worker sau merge

#37 đã merge và CI main nguồn sạch; nhánh deploy chính là main, không chọn nhánh PR tài liệu làm nhánh tự động deploy chính. Trong Cloudflare Dashboard → **Workers & Pages → pickleup-staging → Settings → Build**, kết nối repository `ndlong78/Pickleball` nếu chưa kết nối, rồi đặt:

| Thiết lập Workers Builds | Giá trị |
|---|---|
| Git branch / nhánh deploy chính | `main` sau merge PR cấu hình này |
| Root directory | Root repository (`/`) |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx wrangler deploy --config wrangler.jsonc` |
| Build variable `NODE_VERSION` | `24` |
| Build variable `WRANGLER_SEND_METRICS` | `false` (tùy chọn) |

Để Cloudflare cài dependencies, gồm devDependencies; bỏ `SKIP_DEPENDENCY_INSTALL=true` nếu đã đặt từ hướng dẫn Pages. Không dùng output directory của Pages thay deploy command Workers. Không đặt `dist` làm Root directory. Wrangler lấy version đã pin từ package.json. Đối chiếu Worker name và account đúng `home-309` trước deploy; không dùng một Worker production khác.

Cloudflare Builds quản lý deployment credential phía nền tảng; không đưa API token vào source, frontend variables hoặc chat. Bản build này **không** tự lấy Supabase URL/key từ Cloudflare environment: nó copy `modules/auth-config.js` đã review trên main. Nếu sau này đổi project/config, sửa qua PR và bump cache/version khi runtime thay đổi. Không thêm service_role/secret/DB password để sửa lỗi frontend.

Trong **Settings → Domains & Routes**, xác nhận có `pickleup-staging.home-309.workers.dev` và workers.dev đang enabled. Nếu account subdomain khác, dừng đối chiếu account; không đổi account subdomain hoặc custom domain production để ép khớp hướng dẫn. Không cần tạo domain `pickleup.no.id.vn` cho staging này. Preview PR nếu bật chỉ tạo preview, không promote lên địa chỉ staging chính.

[Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Static Assets](https://developers.cloudflare.com/workers/static-assets/get-started/), [redirect rules](https://developers.cloudflare.com/workers/static-assets/redirects/).

## 3. Supabase Authentication → URL Configuration

Trên **project staging hiện hữu đã đối chiếu**, đặt:

| Trường | Giá trị |
|---|---|
| Site URL | `https://pickleup-staging.home-309.workers.dev/` |
| Redirect URLs | `https://pickleup-staging.home-309.workers.dev/` |

Luồng hiện nhập mã OTP trong Settings, không cần thêm callback route OAuth/magic link hoặc wildcard mọi preview domain. Giữ các URL khác chỉ khi còn phục vụ một luồng được chủ động cho phép. `modules/auth-config.js.url` phải **tiếp tục là Project URL Supabase**, không thay bằng workers.dev.

SMTP/sender, template `{{ .Token }}`, giới hạn OTP, sáu migrations và kiểm tra quyền theo [hướng dẫn Supabase staging](SUPABASE_STAGING_DEPLOYMENT.md). Built-in email chỉ có phạm vi người nhận hạn chế; không coi nó là SMTP pilot. Chưa có SMTP staging thì chỉ ghi nhận giới hạn, không thêm tester vào organization hoặc mở đăng ký công khai để vượt giới hạn email.

## 4. Kiểm chứng

Máy local Node24/Python3:

```bash
npm ci
npm run test:unit
python3 -m unittest scripts/test_static_host.py
npm run check:cloudflare
npm run test:cloudflare
npx playwright install --with-deps chromium webkit
npm run test:responsive
```

`check:cloudflare` dùng `wrangler deploy --dry-run`, không upload/deploy. `test:cloudflare` chạy Wrangler/workerd local, kiểm byte parity, root/query router, redirects `/Pickleball/` và 404 cho file repo riêng; không gọi Supabase. Playwright hiện hữu chạy trên `dist` qua HTTP guest fixture; OTP/session mock và Auth local GoTrue/Mailpit trong backend CI là hai loại evidence riêng. Python host có alias prefix phục vụ compatibility GitHub Pages; smoke Workers kiểm riêng redirect thật của runtime Cloudflare. Không gọi một trong các kiểm thử local/CI này là edge deployment, Managed SMTP hoặc thiết bị thật.

Sau deploy, owner mở URL chính và `/?page=settings`, kiểm build5.13.1, guest/navigation/reload, SW update/offline, rồi trên staging dữ liệu giả kiểm OTP → email thật → session → quyền dữ liệu riêng; logout, A→B/multi-tab/refresh/expiry. Domain flags đang tắt nên kiểm dữ liệu qua các bước staging được cấp phạm vi, không tự bật sync/import hoặc gọi direct table write. Không đính kèm OTP/token/session/email cá nhân, HAR hoặc trace có credentials vào issue/artifact. Có thể báo trạng thái build/HTTP và thông báo lỗi đã che thông tin riêng.

Đổi từ GitHub Pages/custom domain sang workers.dev tạo origin khác: guest localStorage, account IndexedDB/cache/queue và session không tự chuyển. Giữ backup V5/raw rescue/cache export ngoài browser trước khi đổi nơi dùng; export cache V6 hiện chỉ preview, chưa restore. Không xóa dữ liệu cũ hoặc tự import khi đăng nhập.

## 5. Trạng thái và giới hạn của PR

Main nguồn UI/backend/Pages sạch được ghi ở [sổ nghiệm thu](STAGING_AUTH_VERIFICATION.md). Ngày 09/11 owner báo đã nhận email OTP, đăng nhập và kiểm dữ liệu riêng trên staging. Chưa đối chiếu commit/build/browser thực tế, SMTP provider/sender/rate hoặc trạng thái đầy đủ các migrations. Codex chưa quan sát trực tiếp website/Managed; môi trường không có kết nối quản trị Cloudflare/Supabase/SMTP và network policy chưa cho phép domain staging. Không suy website lỗi từ giới hạn executor.

Session restore/logout nhiều tab/A→B/expiry trên staging, full RLS A/B/anonymous, backup/Auth recovery/deletion và QA thiết bị vẫn cần bằng chứng riêng. Ba bước Auth cơ bản không mở pilot dữ liệu thật; giữ [policy](PILOT_OPERATING_POLICY.md). Cấu hình/build của #37 không tự thay DB hoặc cấp quyền signup.
