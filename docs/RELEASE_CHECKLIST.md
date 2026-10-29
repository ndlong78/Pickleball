# PickleUp — RELEASE CHECKLIST & CODEX WORKFLOW (V5.x)

**Căn cứ:** [`../AGENTS.md`](../AGENTS.md), [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md), [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md). Quy trình này áp dụng cho feature, bugfix, performance và thay đổi tài liệu. **Đừng tự tuyên bố Stable từ việc code đã viết hoặc workflow có trạng thái xanh nhưng còn flaky.**

## 1. Trước mỗi nhiệm vụ: evidence thực tế

1. Đọc `main` **HEAD SHA**, `package.json` version, PR mở, commit gần nhất, CI/Pages jobs mới nhất. Không đoán phiên bản theo lịch sử hội thoại.
2. Đọc source, tests, các tệp tài liệu liên quan; xác định **kiểu thay đổi**: code/product/UI, PWA/cache, data/schema, test/CI, tài liệu thuần.
3. Viết scope nhỏ, acceptance criteria, ảnh hưởng tới 8 route, localStorage/backup, offline, devices và khả năng rollback.
4. Tạo nhánh từ HEAD mới nhất `feature/vX.Y-description`, `fix/description` hoặc `docs/description`. Không sửa trực tiếp `main`, không force-push hoặc ghi đè nhánh người khác.
5. Với “hãy tiếp tục” và tác vụ trong phạm vi cho phép, chủ động thực hiện mà không yêu cầu xác nhận mọi bước nhỏ; **cần phê duyệt** khi thay đổi kiến trúc nền, cloud/chi phí, dữ liệu nhạy cảm, xóa dữ liệu hoặc thao tác khó đảo ngược.

**Doc-only exception:** nếu chỉ sửa Markdown như `AGENTS.md` hoặc `docs/*.md` và không thay đổi executable behavior, **không** tăng `package.json` version, `PICKLEUP_BUILD`, `?v=` hoặc tên PWA cache. Kiểm tra chính tả/liên kết/tên module/điều khoản, chạy PR CI hiện hữu; không tạo commit rỗng chỉ để kích hoạt CI.

## 2. Implementation & kiểm thử trước PR

- Tách business logic và UI đúng kiến trúc, validate dữ liệu, có trạng thái loading/empty/error/success khi phù hợp.
- Không thay storage key/schema hoặc xóa dữ liệu cũ khi chưa có migration và test tương thích. Check-in thủ công phải tách lịch và điểm.
- Đừng tự thêm framework/backend, khởi tạo dữ liệu giả thành data thật hoặc bơm tải vào Home.
- Nếu đổi UX, test ít nhất **390 / 820 / 1180 / 1440 px** (và 320 px khi hợp lý); cả route trực tiếp, Back/Forward, reload, safe-area/touch và keyboard focus.
- Kiểm tra cùng bài/cấp độ/điều kiện khi đánh giá tiến bộ; không quảng bá điểm /20 là DUPR.

**Lệnh chuẩn (trong môi trường Node.js 24):**

```bash
npm install --no-audit --no-fund
npm run test:unit
npx playwright install --with-deps chromium webkit
npm run test:responsive
```

CI chính thức: [`.github/workflows/responsive.yml`](../.github/workflows/responsive.yml) dùng `actions/setup-node` Node 24, Node built-in test runner và Playwright Chromium/WebKit. Khi môi trường đã có browsers/deps, chỉ cài phần còn thiếu. Không dùng số test cố định từ bản cũ làm chuẩn: **lấy số liệu thực từ run log và đúng commit SHA**.

## 3. Regression matrix — yêu cầu theo thay đổi

| Nhóm thay đổi | Unit | Browser | Extra evidence |
|---|---|---|---|
| Dữ liệu / backup | Trường hợp hợp lệ, thiếu, hỏng, giới hạn, duplicate; migration trước/sau | Lưu → reload → import/restore | Không mất dữ liệu thật; dữ liệu cũ giữ nguyên |
| Mục tiêu / weekly plan | Tuần bắt đầu Thứ Hai, ngày địa phương, leap day, tháng/năm, 1–5 ngày, gentle | Tạo/sửa mục tiêu; lịch 7 ngày | Không tính ngày tương lai là bỏ tập |
| Attendance V4.8 | `done`/`skipped`/`clear`; phút 5–180; một entry/ngày; max 1095 | Check-in → reload → sửa/xóa; thiết bị nhỏ | Điểm/timer/lịch không tự tăng `done` |
| Plan vs Actual V4.9 | Phân biệt planned/actual/missing; off-plan; 8 tuần; target hiện tại | Vẽ biểu đồ và cập nhật realtime | Không bịa historical goal snapshots |
| Journey V5.0 | Next action; optional assessment; resume đúng lesson level; true plan routing | Journey → Academy/Coach/Court → Back; check-in | Không trộn đồng hồ Học viện với Trên sân |
| Điều hướng / layout | Catalog section uniqueness, loader dependency order | Direct URL, Back, menu cố định, iPhone/iPad/desktop, overflow | Không reset timer/dữ liệu ngoài ý muốn |
| PWA / offline | Cache release-specific; asset version consistency | Install/upgrade từ cache cũ, reload, offline/re-online | Không mất localStorage; trang chưa cache có thông báo đúng |
| Performance | Logic không trở nên nặng không cần thiết | Benchmark cùng điều kiện trước/sau | Báo số đo, đừng suy đoán |
| Chỉ tài liệu | Link và tên chính xác; consistency với source | PR CI hiện hành không sửa ứng dụng | Không đổi version/cache không cần thiết |

**Không sửa test để che lỗi:** có thể sửa fixture/assertion sai với đặc tả và chỉ rõ lý do, nhưng không giảm độ phủ, bỏ browser, `skip` lỗi hoặc thay `expect` bằng điều kiện vô nghĩa chỉ để có màu xanh.

## 4. PR / CI / flaky rules

1. Mở Pull Request với mục tiêu, phạm vi, files, cảnh báo migration, test coverage, rủi ro và cách kiểm chứng.
2. CI PR phải **completed + conclusion=success** của đúng **`head_sha`** đang định merge; không chỉ dựa trên workflow cũ hoặc bản build trước.
3. Với test **failed**: đọc job logs/trace/screenshot, tái hiện khi có thể, sửa nguyên nhân gốc và chạy lại. **Không merge CI đỏ.**
4. Với **flaky** (một lần fail nhưng retry đạt): workflow có thể báo xanh, song **không phải clean run**. Ghi rõ test, engine, bước fail, xác định nguồn nondeterminism (thời gian, storage, async hydration, race, browser-specific); sửa hoặc có issue/risk record minh bạch. Không bỏ cảnh báo khỏi báo cáo chỉ vì job success.
5. Ví dụ bài kiểm thử V4.6 trên WebKit từng cho `#wgDays` = 3 sau reload thay vì 2 và đạt sau retry trong đợt V5.0. Đó là **vấn đề cần tiếp tục điều tra**, không là bằng chứng rằng không có lỗi.
6. Chỉ merge khi các gate bắt buộc của PR đạt, trạng thái mergeable rõ và không có blocker chưa xử lý. **Không dùng retry che lỗi nghiêm trọng về dữ liệu.**

## 5. Versioning & release gates

Áp dụng Semantic Versioning **theo tinh thần tương thích**: PATCH cho sửa lỗi/chi tiết tương thích, MINOR cho tính năng tương thích; MAJOR cho thay đổi hợp đồng lớn hoặc mốc sản phẩm được quyết định có chủ đích. **Không coi MAJOR là lý do cho phép phá vỡ dữ liệu**, cũng không tự ép một mốc UX tương thích thành migration phá vỡ.

**Khi release ứng dụng**, đồng bộ:
- `package.json` `version`, `window.PICKLEUP_BUILD` trong `index.html`;
- tất cả asset `?v=` trong shell/service worker;
- `sw.js` release cache name;
- tests cache/version/upgrade và testMatch nếu có suite mới;
- `README.md`, `ROADMAP.md` và release notes đúng nội dung triển khai.

**Release gate:**
1. PR CI đúng SHA xanh và kiểm thử/đánh giá không còn blocker.
2. Merge có bảo vệ expected SHA, không ghi đè thay đổi khác.
3. Kiểm tra `main` HEAD SHA == merge SHA; kiểm tra code/version đúng.
4. **Code push**: kiểm tra CI `main` và GitHub Pages **cùng merge SHA**; nếu fail điều tra/phục hồi. 
5. **Docs-only push**: `responsive.yml` có **push path filters** không bao gồm `AGENTS.md` và `docs/**` ở trạng thái V5.0.0; do đó **không có main CI mới là điều bình thường**. PR CI vẫn chạy vì workflow lắng nghe `pull_request`. Đừng tuyên bố đã có main CI cho merge SHA nếu nó không chạy; chỉ kiểm tra run thực sự được tạo, trạng thái Pages nếu được kích hoạt, và nêu ngoại lệ tài liệu.
6. QA trên thiết bị **thật** (iPhone Safari / iPad Safari / Android Chrome, nếu có yêu cầu) và PWA đã cài phải được ghi tách biệt khỏi Playwright. Không nói “đã kiểm thử iPhone thật” khi chỉ là viewport mô phỏng.

Tất cả release notes phải nói rõ: **đã viết → unit pass → browser pass (và số flaky) → PR merge → deploy Pages → CI sau merge nếu workflow kích hoạt → field QA**. Không ghi kết quả không có bằng chứng.

## 6. Báo cáo sau nhiệm vụ (tiếng Việt)

Nêu rõ phạm vi và lý do, tệp thay đổi, branch/PR/commit URLs, đúng test counts pass/fail/flaky (nếu chưa chạy thì nói chưa chạy), trạng thái CI/Pages theo SHA, rủi ro và việc chưa kiểm chứng, một bước tiếp theo hợp lý. Không cần xin xác nhận cho mỗi chỉnh sửa nhỏ trong phạm vi; không hứa công việc chạy nền ngoài automation.

**Mục tiêu cuối cùng:** hệ thống có thể cải tiến liên tục mà vẫn giữ lịch sử thực, mô hình huấn luyện đáng tin, UX nhất quán, khả năng offline và hành vi CI minh bạch.
