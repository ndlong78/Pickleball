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
