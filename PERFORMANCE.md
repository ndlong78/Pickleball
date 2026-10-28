# PickleUp V3.5 – Tối ưu tốc độ từng trang

## Mục tiêu và phạm vi

V3.4 đã có 7 trang điều hướng trong một `index.html`, nhưng vẫn tải khoảng 29 tệp JavaScript ở mọi lượt mở. V3.5 thực hiện **lazy-loading theo trang**, giữ các thành phần DOM và dữ liệu cũ để không mất trạng thái đồng hồ khi chuyển trang.

**Trạng thái:** Đã triển khai mã nguồn (beta), chưa có số đo Lighthouse thực tế hoặc kết quả nghiệm thu thiết bị iOS.

## Cơ chế mới

- Phần khởi động cố định chỉ có 5 tệp: `page-catalog.js`, `page-loader.js`, `page-router.js`, `mobile-ui.js`, `pwa-client.js`.
- Bộ tải tại `modules/page-loader.js` dựa trên `PAGE_FILES`: mỗi trang chỉ yêu cầu những module cần thiết, tái sử dụng các module đã tải khi đổi trang.
- Preload các script của **trang được yêu cầu** để tải mạng song song, nhưng thực thi lần lượt theo thứ tự phụ thuộc.
- Các file giao diện gắn sự kiện `DOMContentLoaded` được điều chỉnh để vẫn khởi tạo đúng khi tải sau thời điểm DOM đã sẵn sàng.
- CSS `tactical-insights.css` chỉ tải tại trang **Thi đấu**; `training-evaluation.css` chỉ tải tại **Trên sân/Tiến bộ**.
- Font Be Vietnam Pro được tải không chặn stylesheet chính; font hệ thống là phương án dự phòng khi offline.
- `sw.js` chuyển từ precache gần như toàn bộ app (~40 tài nguyên) sang **14 tài nguyên lõi**. Module trang được cache khi người dùng mở trang đó. Những lần quay lại có thể đọc cache nhanh hơn.
- Trang **Dữ liệu → Tốc độ tải từng trang** hiển thị thời gian và số module đã tải **trong phiên trang hiện tại**, tính bằng `performance.now()`; không chuyển thông tin ra ngoài.

## Ma trận module theo trang

| Trang | Module nghiệp vụ khi truy cập trực tiếp | Ghi chú |
|---|---|---|
| Tổng quan | 1 | Chỉ `weekly-practice.js` |
| HLV cá nhân | 10 | Curriculum, kỹ năng, lập kế hoạch cơ bản/nâng cao |
| Trên sân | 11 | Đồng hồ, sơ đồ, lần tập, các lõi liên quan |
| Học viện | 6 | 80 giáo án, sơ đồ, đánh giá cơ bản |
| Tiến bộ | 11 | Dashboard, lịch sử, so sánh theo điều kiện |
| Thi đấu | 7 | Nhật ký trận, thống kê chiến thuật |
| Dữ liệu | 8 | Sao lưu/khôi phục và kiểm tra schema |

**Lưu ý:** Số module trong mỗi nhóm *không phải* số request mới khi chuyển trang, vì module đã tải được tái sử dụng. Module ngoài trang vẫn còn trong DOM nhưng được ẩn. HTML ban đầu chưa được chia nhỏ thành các tệp riêng theo trang (đó là bước tối ưu kế tiếp).

## Offline và nâng cấp PWA

**Đánh đổi có chủ đích:** Sau khi cập nhật service worker V3.5, chỉ trang khởi động được precache. Những trang chưa từng mở khi đang online **có thể chưa sử dụng được offline**. Để đảm bảo một trang dùng offline, hãy mở trang đó một lần khi có mạng. Không cần xóa `localStorage` hoặc gỡ PWA để nâng cấp. Nếu có kế hoạch tập trên sân không có mạng, hãy mở **Trên sân** trước khi đi.

## Kiểm thử

- Unit: `npm run test:unit`, bổ sung `tests/page-loader.test.js` để kiểm tra trang Tổng quan chỉ nạp module nhỏ, không tải trùng các module chung, CSS theo trang.
- Responsive: `npm run test:responsive`, bổ sung `tests/page-performance.spec.cjs` và điều chỉnh các flow hiện hữu để chuyển qua router.
- GitHub Actions: `.github/workflows/responsive.yml` kích hoạt khi thay đổi index, module hoặc bộ kiểm thử.

### Các mục còn cần kiểm tra thực tế

- [ ] Xác minh toàn bộ GitHub Actions chạy thành công trên Chromium và WebKit.
- [ ] Đo Core Web Vitals (LCP, CLS, INP) và số request thực tế trên iPhone/iPad/PC, cả 4G và Wi-Fi.
- [ ] So sánh warm cache và cold cache với V3.4 bằng cùng thiết bị, cùng mạng.
- [ ] Thử offline mỗi trang sau lần mở có mạng, cả khi đóng/mở lại PWA.
- [ ] Thử chuyển nhanh giữa trang khi script đang tải, thông báo lỗi mạng và refresh.
- [ ] Xem xét tách HTML theo trang hoặc render module theo nhu cầu ở V3.6 để giảm thêm công parse/layout ban đầu.

**Không coi thời gian hiển thị ở mục Dữ liệu là điểm số tốc độ tổng thể:** số này chỉ đo thời gian hoàn tất tải module cho trang, không phải thời gian vẽ hình hay độ trễ phản hồi thao tác.

## V3.6 beta – Web Vitals và điều hướng đo trên thiết bị

- Bổ sung `modules/web-vitals.js` vào boot. Tổng 6 script lõi, so với 29 script tải sẵn trước V3.5.
- Dùng `PerformanceObserver` với các API được hỗ trợ để thu thập FCP (First Contentful Paint), LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), độ trễ tương tác *ước tính* (không phải chỉ số INP chính thức) và số long task.
- FCP/LCP gắn với lần tải tài liệu ban đầu; đo chuyển trang SPA riêng bằng thời gian từ khi mở route đến khung hình sau khi các module đã sẵn sàng. Không gọi giá trị chuyển trang là LCP.
- Mục **Dữ liệu → Tốc độ tải từng trang** hiển thị Web Vitals, thời gian chuyển route, số module và tóm tắt tài nguyên cùng nguồn. Dữ liệu chỉ lưu trong bộ nhớ phiên, không truyền lên máy chủ.
- `index.html` dùng `PICKLEUP_BUILD=3.6.0`; JS/CSS lõi và mọi asset tải theo trang nhận hậu tố `?v=3.6.0`. Điều này tránh tái sử dụng URL cache của phiên bản cũ sau khi cập nhật PWA.
- Service worker có cache mới `pickleup-shell-v3-6-vitals-versioned` và precache lõi theo URL phiên bản; module theo trang chỉ được cache khi truy cập.
- Không thay đổi các key dữ liệu PickleUp V1–V3.5 và giữ menu 4 mục cố định.

### Đánh giá hiệu năng đúng cách

1. Trên cùng thiết bị, mở website ở mạng ổn định và làm mới bản mới; mở trang **Dữ liệu** để xem số liệu quan sát.
2. Đo riêng **cold load** (chưa có cache) và **warm load** (đã có cache), không so trực tiếp giữa các thiết bị khác nhau.
3. Với mỗi trang, xem thời gian tải module và thời gian chuyển route. LCP chỉ được thu cho trang tải ban đầu, không phải từng route SPA.
4. Dùng Lighthouse hoặc Chrome DevTools để đánh giá trực tiếp LCP/CLS/INP trên iPhone, iPad, PC khi có điều kiện; không suy diễn điểm từ dữ liệu mô phỏng.

### Chưa nghiệm thu

- [ ] Chạy thành công toàn bộ suite Node/Chromium/WebKit trên GitHub Actions.
- [ ] Kiểm tra số liệu PerformanceObserver trên Safari iOS, đặc biệt metric không hỗ trợ phải hiển thị dấu gạch ngang.
- [ ] Đo thời gian cold/warm load trước–sau V3.6; chưa có bằng chứng để công bố % nhanh hơn.
- [ ] Kiểm tra cập nhật PWA từ V3.5 sang V3.6, dùng offline sau khi đã tải module khi online.
- [ ] Khi có số liệu, cân nhắc tách phần DOM/HTML chuyên biệt theo trang hoặc nhóm CSS lớn, tránh tối ưu quá mức khi chưa đo.

### Điều chỉnh thêm ở V3.6

- `advanced.css` không còn được tải trên trang Tổng quan; stylesheet chỉ yêu cầu khi mở HLV cá nhân, Học viện, Tiến bộ hoặc Thi đấu. Nó được tái sử dụng giữa những trang chuyên môn.
- Vẫn giữ CSS cơ bản và menu cố định để trang đầu không mất cấu trúc khi offline.
- V3.6 có sáu boot script (thêm công cụ đo Web Vitals); không được diễn giải là giảm số script so với V3.5. Lợi ích là đo đúng hơn và không tải stylesheet nâng cao trên trang Tổng quan.


## V3.7 beta – Tách DOM/HTML theo trang

Thay đổi chính: **12 khối giao diện nặng được chuyển từ `index.html` sang sáu file HTML** tại `pages/coach.html`, `court.html`, `academy.html`, `progress.html`, `matches.html` và `settings.html`.

- `index.html` giảm từ khoảng **47,3 nghìn xuống 27,3 nghìn ký tự mã nguồn** (giảm khoảng **42%**), so trên nguồn ngay trước và sau khi tách. Đây là độ dài HTML nguồn, **không phải thời gian tải, điểm Lighthouse hay phần trăm tốc độ tăng**.
- Trang **Tổng quan** hiển thị trực tiếp từ `index.html` và không cần tải mảnh HTML của trang khác.
- `modules/page-loader.js` thêm `ensureMarkup(page)`: tải fragment tương ứng trước khi thực thi JS UI, kiểm tra ID theo `page-catalog.js` và gắn vào `#mount-<page>`. Một fragment chỉ được tải/khởi tạo một lần trong mỗi lần mở ứng dụng.
- Trang HLV, sân, học viện, tiến bộ, thi đấu và dữ liệu chỉ nạp HTML khi được truy cập; Back/Forward và liên kết sâu `#section` chờ fragment sẵn sàng.
- Các section nhỏ dùng chung (sáu tuần mẫu, đánh giá cơ bản, điểm mẫu, sao lưu và lộ trình) vẫn ở HTML gốc để tránh phá vỡ các module legacy dùng chung DOM.
- DOM của các trang đã mở **được giữ lại** khi chuyển sang trang khác; không xóa trường nhập, không reset timer. Menu bốn mục vẫn cố định trên PC/iPad/iPhone.
- File HTML fragment có URL `?v=3.7.0`, được service worker lưu sau lần sử dụng online. Trang chưa truy cập khi đang có mạng có thể chưa hoạt động offline.
- Trang Dữ liệu hiển thị kích thước HTML mới được lấy và thời gian tải module. Kết quả đo là dữ liệu của thiết bị, không gửi lên máy chủ.

**Kiểm thử được thêm:** `tests/page-fragments.test.js` kiểm tra ID duy nhất và đúng nguồn; `tests/page-loader.test.js` kiểm tra thứ tự hydrate → chạy JS và tái sử dụng file; `tests/page-fragments.spec.cjs` mô phỏng iPhone, iPad dọc/ngang, PC với luồng deep link/Back/giữ trạng thái. CI cần chạy để xác nhận trên Chromium/WebKit.

**Bước kế tiếp:** chạy Lighthouse trên thiết bị thực, đo trước/sau với cold/warm cache rồi quyết định có nên tách tiếp CSS/điều khiển dữ liệu dùng chung. Không so sánh số liệu chỉ từ mô phỏng với người dùng thật.

## V3.8 Beta – Benchmark theo thiết bị & hiệu suất dựng giao diện

- Bộ `tests/v38-benchmark.spec.cjs` đo thời gian tải module và chuyển trang cho bốn profile: iPhone 390×844, iPad 820×1180, iPad ngang 1180×820 và PC 1440×900. Chạy trong Chromium/WebKit **giả lập kích thước**, không phải đo máy Apple thật. Dữ liệu ghi vào `test-results/v38-browser-benchmark.json` khi chạy CI và được upload thành artifact.
- Học viện `modules/academy-page.js` cache tập `<option>` cho cấp độ đã xem và bỏ qua việc dựng lại nội dung bài nếu không đổi ID. Tránh thay HTML không cần thiết khi lọc/chọn lại cùng bài.
- `dashboard.js` gom các phần tử kỹ năng và cột biểu đồ qua `DocumentFragment` rồi cập nhật DOM theo lô.
- PWA dùng cache `pickleup-shell-v3-8-upgrade`, URL tài nguyên `?v=3.8.0`, giữ dữ liệu `localStorage`. Kiểm thử `tests/v38-pwa-upgrade.spec.cjs` mô phỏng dọn cache v3.6/v3.7 khi kích hoạt worker và thử mở Học viện offline sau khi cache.
- **Chưa có phép đo tốc độ trên iPhone/iPad thật** và chưa có báo cáo CI được xác nhận đạt. Không công bố mức tăng tốc % chỉ từ thay đổi mã nguồn.

## V3.9 – Độ tin cậy phép đo và ổn định cache

Bản V3.8 có CI lỗi tại `tests/web-vitals.test.js` (54/55 unit test đạt). Đây là lỗi chờ trạng thái hoàn thành phép đo route không đủ ổn định khi chạy trên GitHub Actions, không phải số đo tốc độ thiết bị. V3.9 đổi sang chờ điều kiện có deadline.

Asset trong PWA tiếp tục dùng URL có version `3.9.0`. Service worker dùng cache-first cố định cho URL asset: khi đã cache không revalidate rồi ghi đè âm thầm cùng URL; khi nâng phiên bản, cache shell mới dùng đường dẫn mới. Trang đã được mở online sẽ dùng offline từ cache; dữ liệu localStorage không bị xóa.

Số liệu benchmark chỉ được báo cáo sau khi Chromium/WebKit/CI hoàn tất, không suy diễn tỷ lệ tăng tốc từ số file hoặc dung lượng nguồn.
