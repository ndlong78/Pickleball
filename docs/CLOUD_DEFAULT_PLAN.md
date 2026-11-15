# Chuyển dữ liệu người tập lên cloud (kế hoạch V5.31+)

Trạng thái: **kế hoạch, chưa có mã.** Baseline main `bbc35d7` / V5.30.0. Không đổi kiến trúc: vẫn static HTML/CSS/vanilla JS, tám route, Supabase (Auth OTP, RLS, RPC/CAS) và IndexedDB + outbox đã có từ V6.

## 1. Quyết định của owner (15/11/2026)
1. **Chưa đăng nhập thì không lưu được.** Khách vẫn xem nội dung; mọi thao tác lưu yêu cầu đăng nhập.
2. **Dữ liệu cũ trên máy:** sau khi đăng nhập, mời nhập vào tài khoản, có xem trước và xác nhận. Không tự nhập.
3. **Mở đăng ký cho mọi người.** Owner báo đã cấu hình SMTP riêng (chưa được Claude kiểm chứng).

Hệ quả owner cần biết: project Supabase `rfeoeagklmaqmkcdhprb` (trước gọi là staging) trở thành **nơi chứa dữ liệu thật**. Test/CI không bao giờ dùng project này (vẫn Supabase local/mock).

## 2. Hiện trạng trong mã
- Mỗi tính năng có hai đường ghi: khách → `localStorage` (18 khóa V5); tài khoản → IndexedDB + outbox → RPC. Ba runtime chọn nguồn: `PICKLEUP_DATA` (mục tiêu/check-in), `PICKLEUP_ACTIVITY` (điểm Học viện, đánh giá, nhật ký tập/trận), `PICKLEUP_PLANS` (giáo án, lựa chọn).
- Nguồn tài khoản đang bị chặn bởi: URL `?pilot=…` (`staging-pilot.js`), người dùng phải tự bấm bật từng nguồn (consent), gửi thủ công, `allowSignup:false`, `IMPORT_CONFIG.enabled=false`, và Settings ẩn các thẻ tài khoản.
- Auth chỉ bật trên host chính `pickleup-staging.home-309.workers.dev` (và loopback khi test). Bản phụ GitHub Pages không có Auth.

## 3. Điều không đổi và giới hạn
- **Vẫn có bản cache trên thiết bị (IndexedDB)** cho tài khoản đã đăng nhập: PWA phải chạy offline trên sân. "Không dùng localStorage" nghĩa là localStorage không còn là nơi lưu dữ liệu người tập; cloud là nguồn chính.
- **Không xóa 18 khóa localStorage cũ** và không phá backup JSON cũ. Dữ liệu cũ chỉ được đọc để xem/nhập/xuất.
- Server Auth/RLS/CAS vẫn là ranh giới phân quyền; cổng phía client chỉ là rollout.
- Không last-write-wins âm thầm; xung đột vẫn qua màn xem xét.
- **Host không có Auth** (bản phụ GitHub Pages, môi trường test không cấu hình Auth) không thể lưu cloud. Ở đó ứng dụng giữ hành vi thiết bị như cũ và hiển thị rõ đây là bản không có tài khoản. Lý do: không thể bắt đăng nhập ở nơi không có đăng nhập, và bộ test khách hiện hữu vẫn kiểm chứng đường này.

## 4. Lộ trình (mỗi bước một PR, CI xanh mới merge, tắt được bằng cờ)
| Bước | Nội dung | Rủi ro chính | Gate |
|---|---|---|---|
| **A1** | Trên host chính: bật ba nguồn tài khoản không cần `?pilot=`; hiện thẻ tài khoản/đồng bộ trong Settings; bỏ nhãn "dữ liệu giả". Đăng nhập xong **tự chọn nguồn tài khoản** cho cả ba nhóm (không cần bấm từng nguồn). Gửi vẫn thủ công. | Người đang đăng nhập đổi nguồn hiển thị | Test A/B, đổi tài khoản, offline, 4 viewport |
| **A2** | Tự đồng bộ: tự đọc khi đăng nhập/mở lại/có mạng; tự gửi sau khi lưu (có lùi dần, giữ nút thủ công). Xung đột vẫn dừng chờ người dùng. | Gửi lặp, vòng lặp retry, hai tab | Unit với server mô phỏng + Supabase local trên CI |
| **B** | Trên host có Auth: khách **không lưu được**; nút lưu dẫn tới đăng nhập. Dữ liệu cũ trên máy hiển thị chỉ đọc. Trạng thái tạm của buổi tập (đồng hồ, checklist) của khách chỉ ở RAM. | Chặn nhầm đường ghi; người chưa đăng nhập mất tiện ích | Rà toàn bộ ~15 điểm ghi; test từng trang |
| **C** | Sau đăng nhập: lời mời nhập dữ liệu cũ, xem trước, xác nhận từng nhóm (bật bộ nhập đã có). | Nhập trùng, dữ liệu lỗi | Importer đã có checkpoint/idempotency; test dữ liệu cũ/lỗi |
| **D** | Mở đăng ký: `allowSignup:true`; cập nhật văn bản quyền riêng tư, hướng dẫn xóa tài khoản. | Lạm dụng đăng ký, email | Owner bật signup + giới hạn trong Supabase; kiểm SMTP |
| **E** | Dọn: đổi tên hiển thị "staging", cập nhật tài liệu/roadmap; xem lại sao lưu. | — | — |

Thứ tự A1 → A2 → C → B → D: chỉ chặn lưu của khách (B) sau khi đã có đường nhập dữ liệu cũ (C), để không ai bị kẹt dữ liệu.

## 5. Việc owner phải làm (Claude không có quyền)
- [ ] Supabase → Authentication: bật cho phép đăng ký; đặt giới hạn gửi email/OTP; xác nhận SMTP riêng gửi được tới hộp thư ngoài.
- [ ] Xác nhận 9 migrations đã áp dụng (owner đã báo migration 8 và 9).
- [ ] Sao lưu: gói Free không có khôi phục theo thời điểm. Quyết định cách sao lưu định kỳ trước bước D.
- [ ] Thử thật trên thiết bị sau từng bước (đăng nhập, lưu, đồng bộ, offline, đổi tài khoản).
- [ ] Lát 2d (khôi phục) vẫn chưa đạt: lần thử đầu báo "Chưa nhận diện được định dạng"; cần tên tệp hoặc kết quả lệnh kiểm tra.

## 6. Chưa kiểm chứng
Kế hoạch dựa trên đọc mã; chưa bước nào được cài đặt. Hành vi trên project Supabase thật (SMTP, giới hạn, hai thiết bị) chỉ owner thử được.
