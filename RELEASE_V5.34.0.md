# V5.34.0 — Chưa đăng nhập thì không lưu được (kế hoạch cloud, bước B)

## Thay đổi
- Trên host chính, người **chưa đăng nhập** không lưu được dữ liệu mới. Các nút lưu báo: "Cần đăng nhập để lưu. Mở trang Dữ liệu → Tài khoản để đăng nhập. Dữ liệu cũ trên máy này vẫn xem được."
- Áp dụng cho: mục tiêu tuần, lịch tập, check-in, điểm Học viện, tự đánh giá, kiểm tra chuyển cấp và nâng cao, nhật ký trận, tạo/hoàn thành giáo án, lượt tập Trên sân, điểm tuần ở Home (lưu và xóa) và khôi phục sao lưu V5 (thông báo trỏ sang mục Nhập dữ liệu cũ sau khi đăng nhập).
- Trạng thái tạm khi chưa đăng nhập (checklist, bước tập trung, bài đang xem, đồng hồ) chỉ giữ trong trang đang mở.
- Đã đăng nhập: không đổi — dữ liệu lưu vào tài khoản và tự đồng bộ.

## Không đổi
- Dữ liệu cũ trên máy vẫn hiển thị, **không bị xóa hay ghi đè**; vẫn xuất được bản cứu hộ và nhập vào tài khoản sau khi đăng nhập.
- Bản phụ GitHub Pages, các host khác và URL vận hành `?pilot=`/`?maintenance=` giữ hành vi lưu trên máy.
- Đăng ký mới vẫn đóng (bước D). Không đổi IndexedDB 3, SQL, RLS, Auth, dependency.

## Kiểm chứng và giới hạn
Owner xác nhận ngày 19/11/2026: đăng nhập OTP, tự đồng bộ giữa hai trình duyệt, lưu khi mất mạng và nhập dữ liệu cũ chạy được trên project thật (bản 5.33.0). Bản này: unit 504; Playwright Chromium cục bộ (mock Auth/RPC); WebKit chỉ có CI; chưa QA thiết bị thật cho chế độ chưa đăng nhập. App/assets/PWA `5.34.0` (`pickleup-shell-v5-34-0-stable`); test nâng cấp xóa cache 5.33.0. Kế hoạch: [docs/CLOUD_DEFAULT_PLAN.md](docs/CLOUD_DEFAULT_PLAN.md).
