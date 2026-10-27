# Kiến trúc PickleUp V3.4 – 7 trang chức năng

## Mục tiêu
Chuyển giao diện dài trước V3.4 thành **7 trang (client-side routed pages)** có URL riêng trên GitHub Pages mà vẫn giữ dữ liệu, timer và PWA offline. Đây là điều hướng trong một ứng dụng duy nhất, **không** phải bảy bản HTML sao chép.

## Địa chỉ các trang
| Trang | URL chia sẻ | Thành phần chính |
|---|---|---|
| 🏠 Tổng quan | `?page=home` | Intro, sáu tuần mẫu, lối vào nhanh |
| 🎯 HLV cá nhân | `?page=coach` | Tự đánh giá, HLV 1.0–3.0, HLV 3.0–4.0, kiểm tra nâng cao |
| ⏱ Trên sân | `?page=court` | Đồng hồ sáu phần, giáo án trên sân, buổi tập mẫu |
| 📚 Học viện | `?page=academy` | 80 bài 1.0–4.0, roadmap hướng tới 5.0 |
| 📈 Tiến bộ | `?page=progress` | Lịch sử 20 lượt, dashboard, đánh giá cùng điều kiện, kiểm tra chuyển cấp |
| 🏓 Thi đấu | `?page=matches` | Nhật ký trận đơn/đôi, tactical insights |
| ⚙️ Dữ liệu | `?page=settings` | Sao lưu/khôi phục JSON, xóa riêng điểm sáu tuần mẫu |

Mở URL theo dạng `https://ndlong78.github.io/Pickleball/?page=coach` (cần GitHub Pages đã được bật và triển khai thành công). Liên kết tới nội dung dùng hash: `?page=court#pcOnCourt`. Hash cũ như `/#matchJournal` sẽ được chuyển sang trang Thi đấu.

## Mã nguồn theo module
- `modules/page-catalog.js`: mô tả trang, nhóm module thuộc từng trang, tiêu đề và lời giới thiệu.
- `modules/page-router.js`: điều hướng `?page=`, Back/Forward, deep-link theo `#id`, phát `pickleup:route-change`, không tải lại trang.
- `modules/page-layout.css`: ẩn các section ngoài trang đang xem, hiển thị navigation bảy trang; giữ menu cố định bốn chức năng quan trọng nhất.
- `modules/weekly-practice.js`: sáu buổi tập mẫu, đồng hồ mẫu và lịch sử.
- `modules/assessments-and-backup.js`: tự đánh giá đầu vào, sao lưu/khôi phục; dữ liệu cũ tương thích.
- `modules/academy-page.js`: UI giáo trình 80 bài và kết quả Học viện.
- `modules/pwa-client.js`: đăng ký service worker và cài PWA.

Các module chuyên biệt cũ vẫn dùng chung trên tất cả trang:
- HLV: `personalized-core.js`, `personalized-ui.js`, `advanced-coach-core.js`, `advanced-coach-ui.js`.
- Sân: `practice-clock.js`, `practice-runner.js`, `practice-diagrams.js`, `advanced-diagrams.js`.
- Giáo trình: `curriculum.js`, `advanced-curriculum.js`.
- Kết quả: `training-log-core.js`, `training-history-ui.js`, `training-evaluation-core.js`, `training-evaluation-ui.js`, `dashboard.js`.
- Thi đấu: `match-journal.js`, `tactical-insights-core.js`, `tactical-insights-ui.js`.

## Bảo toàn trạng thái
- Tất cả các section chức năng tiếp tục được mount trong một DOM; chỉ trang đang xem hiển thị. Module và timer **không được hủy và tạo lại** khi đổi trang trong ứng dụng.
- Không thay đổi khóa `localStorage` của các phiên bản V1–V3.3.
- Bản sao lưu JSON cũ và bản mới vẫn dùng cùng logic.
- Link điều hướng mới gọi router trước khi cuộn, nên thao tác từ HLV sang sân, sân sang lưu điểm và từ chiến thuật về HLV đều có thể chuyển trang.
- `sw.js` cache thêm bộ router và các module tách ra; offline cần tải bản mới ít nhất một lần khi đang kết nối mạng.

## Hạn chế và tiêu chí nghiệm thu
- Đây là client-side routing với URL `?page=`, không phải một máy chủ đa trang. Khi tải lại, trình duyệt vẫn tải `index.html`; ứng dụng chọn đúng trang qua tham số URL. Cách này phù hợp với GitHub Pages và PWA tĩnh.
- [x] Có 7 trang và mapping module chính.
- [x] Menu cố định 4 mục vẫn hiện trên PC/iPad/iPhone, thanh trang đầy đủ có 7 mục.
- [x] Nút chuyển chức năng cũ đã gọi router khi cần.
- [x] Không tạo dữ liệu mới hoặc xóa dữ liệu khi chuyển trang.
- [x] Test cấu trúc catalog, router và Playwright đã bổ sung trong mã nguồn.
- [ ] Chạy và xác minh kết quả CI Chromium/WebKit, thử trên iOS Safari và Android thật.
- [ ] Kiểm thử offline sâu cho URL đã bookmark, tình huống PWA cũ đang còn cache.
- [ ] Huấn luyện viên kiểm tra các thao tác trên sân và tính hợp lý của việc chia trang.
