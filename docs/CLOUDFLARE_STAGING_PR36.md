# PR #36 / V5.13.1 — sửa CI và cấu hình Cloudflare staging

Ngày07/11/2026. Main sau #35 là `bd8049f5172c97f18049cc6f62869848d22ef68f`, app5.13.0. [Pages42321570405](https://github.com/ndlong78/Pickleball/actions/runs/42321570405) success cùng merge SHA; #35 chỉ tài liệu nên main UI/backend không có run mới do push path filters. Runtime baseline sạch là #34/mainc849a16 theo [progress](V6_PROGRESS_REVIEW.md).

## Nguyên nhân

HEAD lỗi `d5f8450472a1945038604d0a9c6252f2864d7cdf` bật Auth staging với hostname Supabase thiếu `https://`. [UI42337385415](https://github.com/ndlong78/Pickleball/actions/runs/42337385415):523 pass/5 fail sau retry ở guest Settings Chromium, rescue unconfigured hai engines và Settings offline hai engines. Những ca guest này đang đọc cấu hình staging bật Auth. [Backend42337385410](https://github.com/ndlong78/Pickleball/actions/runs/42337385410) success; đây không là kiểm chứng Managed SMTP/RLS.

## Sửa chữa

- Thêm scheme HTTPS vào URL; giữ project/publishable key và enabled=true của operator. Unit kiểm cấu hình có boolean/string, URL đầy đủ không username/password/query/hash/path, HTTPS hoặc HTTP loopback và key publishable. Lỗi chỉ có thông báo chung, không in giá trị cấu hình.
- `scripts/serve_test.py --guest-auth` cung cấp fixture guest tại HTTP server, cả root và `/Pickleball/`, GET/HEAD/query và request từ service worker. Không ghi file source. Server mặc định vẫn phục vụ cấu hình thực để thử thủ công.
- Playwright khởi chạy host fixture riêng, không reuse server operator. Mock OTP/session vẫn override transport/config riêng, real Auth harness vẫn dùng GoTrue/Mailpit/local. Không skip/nới assertion/retry, không gọi project Managed từ regression.
- Ba HTTP tests dùng config tổng hợp trong thư mục tạm: default host giữ config, guest fixture GET/HEAD/normalized paths không đổi source, assets khác/404 vẫn đúng.
- Fixture giáo án chờ trạng thái account có snapshot, hết busy và nút gửi sẵn sàng thay vì thông báo thành công tạm thời có thể bị render kế tiếp thay thế. Assertion nghiệp vụ còn nguyên; không tăng timeout hoặc retry.
- Đồng bộ app/build/assets/cache5.13.1 để client không giữ URL lỗi từ5.13.0. PWA regression seed cache Auth cũ bằng dữ liệu tổng hợp, kiểm cleanup/Settings mới và giữ local training probe. Không xóa localStorage/IndexedDB, không SQL/RLS/RPC/dependencies hoặc bật bốn flag dữ liệu khác.

## Kiểm chứng và giới hạn

Trước khi executor local mất kết nối:322 JS unit và3 HTTP tests pass. Chromium hệ thống chạy một phần các nhóm Auth/rescue/PWA, lộ hai lỗi local: readiness phụ thuộc thông báo tạm thời và một timeout khi tải lại trang dưới hai workers. Run chưa hoàn tất nên không coi là clean browser run. Đã thay readiness fixture theo trạng thái bền vững; không đổi timeout/retry. Bundled Chromium/WebKit download trả403 Domain forbidden. Môi trường sau đó báo unavailable; bản commit cuối hoàn tất qua GitHub API, bảo toàn parent/source và lease trên branch.

CI đúng HEAD cuối, số pass/fail/flaky và links được ghi trong PR #36 sau khi đọc log. Không gọi local partial run hoặc fixture guest là kiểm chứng Managed; unit config chỉ kiểm định dạng, không chứng minh key khớp project, SMTP hoặc RLS cloud hoạt động.

```bash
python3 -m unittest scripts/test_static_host.py
npm run test:unit
npm run test:responsive
```

Đóng server operator đang dùng port4173 trước Playwright; runner báo port bận thay vì tái sử dụng config/session thật. Khi thử thủ công, dùng `python3 scripts/serve_test.py` không có `--guest-auth`. Không dùng legacy anon JWT, service_role/secret hoặc DB password trong client.

## Cloudflare Pages

Nhánh `deploy/cloudflare-staging` bật Auth riêng; main còn app5.13.0 và năm flags off. Không cần merge nhánh staging vào main để Cloudflare deploy nó; chưa merge cấu hình này vào main trước rollout riêng. Login không tự import hoặc sync; bốn flags dữ liệu vẫn false. Sửa CI không mở signup server hoặc thay dữ liệu Supabase.

Pages project phải kết nối GitHub. Chọn branch trong **Settings → Builds → Branch control → Production branch**, hoặc **Builds & deployments → Configure Production deployments** theo UI. Nhánh cần tồn tại trên GitHub; Direct Upload không có Git branch. [Cloudflare docs](https://developers.cloudflare.com/pages/configuration/branch-build-controls/).

| Setting | Giá trị |
|---|---|
| Production branch | `deploy/cloudflare-staging` |
| Framework | None |
| Root | Root repository |
| Output | `dist` |
| NODE_VERSION | `24` |
| SKIP_DEPENDENCY_INSTALL | `true` |

```bash
mkdir -p dist && cp index.html manifest.webmanifest *.js *.css dist/ && cp -R modules pages icons vendor dist/
```

Build chỉ copy static runtime, không publish scripts/tests/SQL/docs/node_modules. App chạy root `/`, Settings là `https://<project>.pages.dev/?page=settings`. Supabase Site URL/allowlist phải khớp domain thực. [Database/SMTP guide](SUPABASE_STAGING_DEPLOYMENT.md) vẫn áp dụng; config source không tự sinh từ biến môi trường Cloudflare. Kiểm version/cache5.13.1 sau deploy; không xóa storage chứa dữ liệu thật để sửa cache.

Chưa xác minh Cloudflare deployment/domain, Managed publishable gateway/SMTP/signup allowlist, browser expiry/auto-refresh wall-clock, backup/Auth recovery/delete hoặc QA thiết bị thật. Môi trường Codex không có credentials Managed và tác vụ này không gửi OTP đến project của người dùng. Khi đổi origin, local data/queue không tự chuyển; cache rescue hiện chưa có restore. Pilot dữ liệu thật vẫn đóng theo [policy](PILOT_OPERATING_POLICY.md).
