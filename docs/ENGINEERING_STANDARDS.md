# PickleUp — ENGINEERING STANDARDS (V5.x)

**Bắt buộc đọc cùng:** [`../AGENTS.md`](../AGENTS.md), [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md), [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md).

## 1. Kiến trúc đúng của repository

`PickleUp` là **static client-side PWA**: HTML5, CSS3, vanilla JavaScript, browser `localStorage`, JSON import/export; triển khai GitHub Pages. Không có backend/account/database/cloud sync. Không thêm framework, dịch vụ trả phí, upload người dùng hoặc thay đổi nền tảng trước khi có phân tích migration + phê duyệt.

**Baseline PR0 V6:** main `8f99fcb` là V5.1.0, vẫn đúng kiến trúc trên. [Thiết kế V6](ARCHITECTURE_V6_DATABASE.md), [data dictionary đủ18 keys](DATA_DICTIONARY.md), [runbook](MIGRATION_RUNBOOK.md) và [threat model](THREAT_MODEL.md) là đề xuất, không phải tính năng đang chạy hoặc quyền triển khai backend. Chỉ khi được giao PR tiếp theo và chốt quyết định trước PR1 mới thêm Supabase/IndexedDB theo hợp đồng đó; giữ toàn bộ quy tắc sản phẩm, legacy data và QA hiện hữu. `ARCHITECTURE.md` ở root là lịch sử V3.x, không dùng số7 trang ở đó thay catalog8 route hiện hành.

| Thành phần | Trách nhiệm |
|---|---|
| `index.html` | Application shell, home, navigation, mount points, mã build |
| `modules/page-catalog.js` | Danh mục 8 route và section IDs |
| `modules/page-router.js` | `?page=...#section`, history, điều hướng nội bộ |
| `modules/page-loader.js` | Lazy-load JS/CSS/HTML fragment, giữ module sau khi mở |
| `pages/*.html` | Static trusted markup của các route tải theo nhu cầu |
| `modules/*-core.js` | Logic thuần, dễ kiểm thử và không dùng DOM nếu không cần |
| `modules/*-ui.js` | Event, tương tác và render, không thay thế logic core |
| `modules/training-journey-core.js` / `-ui.js` | Luồng Hành trình V5.0 |
| `modules/weekly-goals-core.js`, `weekly-plan-core.js` | Mục tiêu/lịch tập **dự kiến** |
| `modules/weekly-checkins-core.js` | Nhật ký attendance được **xác nhận thủ công** |
| `modules/plan-reality-core.js` | Đối chiếu mục tiêu–hoạt động thực tế |
| `sw.js` / `modules/pwa-client.js` | Cache theo bản phát hành, cập nhật offline |
| `package.json` / `playwright.config.cjs` | Node.js 24, unit tests, Chromium/WebKit |
| `tests/` | Unit và E2E/hồi quy, trong đó có kiểm thử legacy/PWA |

**Không refactor vượt phạm vi.** Khi thêm tính năng: tìm đúng route, đúng core và UI; khai báo thứ tự phụ thuộc module trong page-loader; nếu cần HTML fragment mới thì cập nhật page-catalog, router/loader, navigation và tests cấu trúc. Không tải mọi feature khi Home mới mở. Không làm mất state/đồng hồ đang hoạt động khi điều hướng nếu thiết kế yêu cầu giữ.

## 2. Data contracts & bảo toàn dữ liệu (không thay đổi tùy tiện)

| LocalStorage key | Ý nghĩa | Cảnh báo |
|---|---|---|
| `pickleup_weekly_goal_v46` | Số ngày/tuần và cấp độ **hiện tại** | Không tự nhận đây là mục tiêu đã lưu của mọi tuần quá khứ |
| `pickleup_week_plan_v47` | Thời lượng phiên dự kiến và chế độ nhẹ | Không phải dữ liệu attendance |
| `pickleup_week_checkins_v48` | Check-in theo ngày địa phương: `done` / `skipped`, phút thật | Không tự sinh từ điểm, lịch hoặc timer |
| `pickleup_academy_v2` | Kết quả gần nhất của từng giáo án Học viện | Có điểm không đồng nghĩa buổi tập đã hoàn thành |
| `pickleup_academy_history_v44` | Nhiều lượt kiểm tra cùng giáo án | Cần so sánh cùng bài/cấp độ/điều kiện |
| `pickleup_academy_last_lesson_v4` | Bài Học viện gần nhất | Dùng để resume và chọn bài, không phải trạng thái đã học |
| `pickleup_stage_checks_v23` | Bài kiểm tra cấp độ cơ bản (có sáu điểm /20) | Kiểm tra định dạng và ngày |
| `pickleup_plans_v24` | Giáo án cá nhân cơ bản | Chỉ phát sang đồng hồ Trên sân nếu hợp lệ |
| `pickleup_advanced_plans_v31` | Giáo án cá nhân nâng cao | Không coi như bài Học viện |
| `pickleup_selected_plan_v31` | ID + nguồn giáo án cá nhân được chọn | Phải đối chiếu thật sự có plan tương ứng |
| `pickleup_training_log_v26` | Nhật ký luyện tập cũ | Không gộp nhầm với check-in V4.8 |
| `pickleup_match_journal_v3` | Nhật ký thi đấu | Dữ liệu riêng, không phải buổi luyện kỹ thuật |

Đây là **các khóa trọng yếu**, không phải danh sách đầy đủ. Trước sửa, tìm các key thực tế đang dùng trong mã/backup và lưu ý cả tên trường JSON. Không đổi/xóa key hiện hữu nếu chưa có migration đủ kiểm thử; không biến dữ liệu vắng mặt thành thành tích ảo.

**Check-in V4.8 hiện tại:** schema `{schemaVersion:1, entries:{'YYYY-MM-DD':{status,minutes,lessonId,updatedAt}}}`; một entry/ngày; `done` có số phút nguyên **5–180**, `skipped` có `minutes:null`; `clear` là thao tác xóa entry, không phải trạng thái lưu; giới hạn **1095 ngày**; không cho check-in ngày tương lai. Khi tạo dữ liệu mới phải theo validator trong core thay vì đoán schema.

**Backup/restore:** `modules/assessments-and-backup.js` xuất/nhập JSON `schemaVersion:1` với trường tùy chọn các module đời sau, gồm `weeklyGoal`, `weeklyPlan`, `weeklyCheckins`. Giữ khả năng nhập backup cũ, validate toàn bộ phần liên quan trước khi ghi, tránh cập nhật một phần không thể rollback khi có lỗi; xác nhận rõ khi import ghi đè. Khi thêm schema/key: thiết kế migration forward/backward phù hợp, giới hạn kích thước/bản ghi, test thiếu field, JSON hỏng, ngày bất hợp lệ, duplicate, dữ liệu lạ và hành vi giữ bản cũ.

**Privacy:** dữ liệu ở trình duyệt, không tự sync giữa thiết bị. Không log dữ liệu cá nhân không cần thiết, không gửi dữ liệu ra network/công cụ analytics nếu chưa được phép, không commit data/secrets.

## 3. Responsive / accessibility: bắt buộc

**Mobile first** và menu điều hướng vẫn truy cập được trên **PC, iPhone Safari, iPad Safari portrait/landscape, Android Chrome**. Trên môi trường tự động, test ít nhất **390, 820, 1180, 1440 px**; thêm 320 px cho giao diện hẹp khi phù hợp. Trong QA thật, kiểm tra touch, viewport height, address bar, safe-area/notch và bàn phím ảo.

- Không để mất menu do chuyển trang/cuộn; vị trí menu cố định phải không che nút chính, đồng hồ, form hoặc nội dung.
- Không có horizontal overflow ngoài vùng cuộn có chủ đích; biểu đồ và bảng dài phải responsive.
- Target thao tác dễ chạm, khoảng cách an toàn, focus visible, label đúng input, role/aria-live cần thiết, thứ tự Tab hợp lý.
- Khi tương tác có bất đồng bộ, có **loading, empty, error, success** và nút retry/hướng khắc phục phù hợp; không im lặng mất dữ liệu nếu localStorage bị khóa/đầy.
- Route deep link, Back/Forward, reload, chuyển từ tab khác và các trạng thái đồng hồ phải nhất quán; không reset timer không chủ ý.

Playwright viewport/engine mô phỏng **không** thay thế QA vật lý trên Safari/Android. Báo cáo chính xác những thiết bị chưa được thử.

## 4. Performance / PWA / offline

- Đo trước/sau khi claim cải thiện; dùng existing page metrics/benchmark, so sánh cùng viewport và điều kiện. Không công bố số ms hoặc % nhanh hơn nếu chưa đo.
- Bảo vệ lazy-loading: Home không tự nạp coach/court/academy/progress/backup; cache nội dung đã mở nếu điều kiện cho phép.
- Tránh dependency nặng, render toàn trang không cần, xử lý đồng bộ kéo dài main thread, tải ảnh/tài nguyên dư thừa.
- Cache và service worker theo release: `package.json`, `window.PICKLEUP_BUILD`, URL `?v=`, tên cache `sw.js`, kiểm thử version phải đồng bộ **khi phát hành ứng dụng**. Chỉ sửa tài liệu → **không bump** build/cache.
- Service Worker giữ **offline shell** và cache **trang/module đã ghé thăm theo nhu cầu**; không hứa toàn bộ trang đều offline trước khi được truy cập/cached. Kiểm thử install → active → revisit offline → cập nhật từ cache cũ → online trở lại. Không xóa localStorage hoặc gây vòng reload.
- Thay đổi logic timer phải thử pause/resume, background tab, reload, page route, hết thời lượng, đồng hồ thiết bị và tính nhất quán khi mở lại. Timer không tự tạo attendance.

## 5. App security & input validation

- Mọi nguồn ngoài: JSON backup, localStorage, query/hash, input form, nội dung người dùng… đều không tin cậy đến khi validate. Không dùng `eval`, `new Function` hoặc thực thi JSON.
- Render text người dùng bằng `textContent`/safe DOM; chỉ dùng `innerHTML` cho markup **tĩnh đáng tin cậy** hoặc sau escaping/sanitization phù hợp. Không biến dữ liệu người dùng thành script, CSS hoặc link không kiểm tra.
- Không commit mật khẩu, token, credential; không in secrets trong CI logs; không tạo công cụ phát tán file dữ liệu.
- Áp dụng giới hạn số bản ghi và độ dài trường; parse lỗi có thông báo/fallback an toàn thay vì mất lịch sử.
- Tránh thêm package chỉ vì một tác vụ nhỏ có thể thực hiện với JS hiện có. Bảo vệ CI dependency supply chain theo công cụ repo đang dùng.

## 6. Nhiệm vụ mới: thay đổi nhỏ, có kiểm thử và không phá hợp đồng

Trước sửa: đọc route, module core/UI, storage keys, tests và các tài liệu này. Sau sửa: thêm unit cho logic (ngày địa phương, year boundary, corrupt dữ liệu, tính tuần, lesson comparability), Playwright cho route/điều khiển/viewport, backup migration khi liên quan và PWA offline nếu ảnh hưởng. Không ẩn lỗi bằng thay expectation cho dễ qua. Với thay đổi hành vi, cập nhật `PRODUCT_SPEC.md` và acceptance criteria. Với thay đổi kiến trúc, cập nhật tài liệu này trong cùng PR.

Mọi tối ưu hoặc refactor đều cần kiểm tra regression ở tám trang hiện có và báo rõ đo lường/ảnh hưởng. Luôn ưu tiên an toàn và hồi phục thay vì thúc đẩy người dùng tập quá sức.
