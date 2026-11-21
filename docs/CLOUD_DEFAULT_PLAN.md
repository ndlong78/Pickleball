# Chuyển dữ liệu người tập lên cloud (kế hoạch V5.31+)

Trạng thái: **A1 (V5.31.0, mục 7), A2 (V5.32.0, mục 8), C (V5.33.0, mục 9) và B (V5.34.0, mục 10) và D (V5.35.0, mục 11) đã có mã**; toàn bộ lộ trình đã cài đặt. Owner xác nhận ngày 19/11/2026 rằng đăng nhập OTP, tự đồng bộ giữa hai trình duyệt, lưu khi mất mạng và nhập dữ liệu cũ đã chạy được trên project thật. Baseline kế hoạch: main `bbc35d7` / V5.30.0. Không đổi kiến trúc: vẫn static HTML/CSS/vanilla JS, tám route, Supabase (Auth OTP, RLS, RPC/CAS) và IndexedDB + outbox đã có từ V6.

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
- [x] Supabase → Authentication: bật cho phép đăng ký (owner báo 19/11/2026); SMTP riêng đã cấu hình (owner báo 15/11).
- [x] Owner xác nhận đăng ký mới chạy được (21/11/2026).
- [ ] Đặt Rate Limits theo [ACCOUNT_OPERATIONS §1](ACCOUNT_OPERATIONS.md); **không** bật CAPTCHA khi ứng dụng chưa gửi `captchaToken`.
- [ ] Cài SQL `supabase/manual/staging_upgrade_20261121000100.sql` (xóa tài khoản) — [ACCOUNT_OPERATIONS §2](ACCOUNT_OPERATIONS.md).
- [ ] Cấu hình sao lưu (khóa age, secrets, `BACKUP_ENABLED`) và chạy thử — [ACCOUNT_OPERATIONS §3](ACCOUNT_OPERATIONS.md).
- [ ] Xác nhận 9 migrations đã áp dụng (owner đã báo migration 8 và 9).
- [ ] Sao lưu: gói Free không có khôi phục theo thời điểm. V5.36.0 có workflow sao lưu mã hóa hằng ngày; còn chờ owner cấu hình và diễn tập khôi phục trên project thử.
- [ ] Thử thật trên thiết bị sau từng bước (đăng nhập, lưu, đồng bộ, offline, đổi tài khoản).
- [ ] Lát 2d (khôi phục) vẫn chưa đạt: lần thử đầu báo "Chưa nhận diện được định dạng"; cần tên tệp hoặc kết quả lệnh kiểm tra.

## 6. Chưa kiểm chứng
Kế hoạch dựa trên đọc mã; chưa bước nào được cài đặt. Hành vi trên project Supabase thật (SMTP, giới hạn, hai thiết bị) chỉ owner thử được.

## 7. Bước A1 — đã cài đặt (V5.31.0)
- `staging-pilot.js`: `auto()` đúng khi ở host chính, Auth bật và URL **không có** `pilot`/`maintenance`. Khi đó ba cờ nguồn bật với `auto:true` và không có nhãn "dữ liệu giả". URL `?pilot=…` giữ nguyên luồng thủ công cho người vận hành; URL `?maintenance=…` **tắt mọi nguồn** (công tắc tắt và điều kiện của công cụ dọn cache). Query `pilot` sai/trùng vẫn đóng.
- `adopter()` dùng chung cho ba runtime: khi `auto` và đã đăng nhập, gọi đúng hành động có sẵn của controller — chọn nguồn tài khoản nếu máy chưa chọn, đọc lại nếu lần đọc đầu chưa xong, và (mục tiêu/check-in) đặt múi giờ của thiết bị nếu chưa có. Mỗi nhu cầu thử một lần cho mỗi tài khoản; thử lại khi cửa sổ được focus hoặc có mạng lại; không chạy khi đang bận/offline/trạng thái lỗi; đổi tài khoản hay đăng xuất thì đặt lại.
- Settings: hiện Tài khoản, ba mục nguồn và Cứu hộ cache trên host chính; Nhập dữ liệu và Dọn cache vẫn là công cụ vận hành (cần `?pilot=`/`?maintenance=`). Ở chế độ tự động, các nút/ô chọn nguồn thủ công bị ẩn và thay bằng mô tả ngắn.
- **Không đổi:** gửi vẫn thủ công; không nhập dữ liệu cũ; không ghi/xóa 18 khóa localStorage; khách (chưa đăng nhập) vẫn lưu trên máy cho tới bước B; đăng ký vẫn đóng cho tới bước D; host khác (bản phụ Pages, preview) giữ hành vi thiết bị.
- Kiểm thử: `source-adopter.test.js` (7), cấu hình cổng và bề mặt Settings (đã cập nhật), `staging-account.spec` thêm 6 ca cho URL thường ở bốn viewport (tự chọn nguồn, không gửi/nhập, đổi tài khoản, host khác). **Chưa thử trên project Supabase thật.**

## 8. Bước A2 — đã cài đặt (V5.32.0)
- `staging-pilot.js` có `syncer()` dùng chung cho ba runtime. Nó chỉ quyết định **khi nào** gọi `controller.sync()` có sẵn; khóa nhiều tab (lease), lùi dần theo từng yêu cầu, yêu cầu bất biến/idempotent và xử lý xung đột vẫn nằm trong sync controller.
- Hành vi: chờ khoảng 1,2 giây sau thay đổi cuối rồi gửi khi còn thao tác `pending`/`deferred`. Kết quả `synced`/`pending` xóa lùi dần; mọi kết quả khác (mất mạng, hết phiên, tab khác đang giữ khóa, `needs_review`, lỗi máy chủ) lùi dần 5 s → 10 s → … tối đa 5 phút. Focus hoặc có mạng lại thì thử ngay; đổi tài khoản thì đặt lại. Không chạy khi đang bận, offline, chưa đọc xong lần đầu hoặc `auto` tắt.
- Thao tác `sending` (đã gửi, chưa rõ kết quả), `conflict`, `blocked` **không** tự gửi lại: vẫn cần nút "Thử lại" hoặc quyết định của người dùng như trước.
- Không có lịch đọc định kỳ: đọc lại diễn ra sau mỗi lần gửi, khi đăng nhập và khi bấm "Đọc dữ liệu tài khoản". Thay đổi từ thiết bị khác chỉ xuất hiện sau một trong các thời điểm đó.
- Kiểm thử: `source-syncer.test.js` (7 ca, đồng hồ giả: debounce, không gửi khi chưa đủ điều kiện, lùi dần có trần và số lần thử trong một giờ bị chặn, đổi tài khoản), `staging-account.spec` (tự gửi đúng một lần ở bốn viewport; lưu khi offline rồi gửi khi có mạng; xung đột gửi một lần rồi dừng). **Chưa thử trên project Supabase thật.**

## 9. Bước C — đã cài đặt (V5.33.0)
- `import-config.js`: bộ nhập bật khi `auto()` (host chính, không có `pilot`/`maintenance`). URL vận hành và host khác vẫn tắt.
- Settings hiện thẻ "Nhập dữ liệu cũ trên máy vào tài khoản" trên host chính. Dọn cache vẫn là công cụ vận hành.
- **Lời mời (chỉ đọc):** khi đã đăng nhập và máy có dữ liệu cũ thuộc các nhóm nhập được, thẻ hiển thị số nhóm và tên nhóm. Nếu dữ liệu đúng fingerprint này đã nhập xong cho tài khoản, hiển thị "đã được nhập"; nếu có phiên dở, mời tiếp tục. Lời mời không gửi hay ghi gì.
- **Nút "Dùng dữ liệu đang có trên máy này":** tạo bản raw-rescue từ 18 khóa trong trang (cùng lõi với phần Cứu hộ), nạp vào bộ nhập như một tệp, chọn sẵn các nhóm có dữ liệu và điền múi giờ thiết bị. Sau đó vẫn bắt buộc: lập preview → xử lý mục cần quyết định → ba ô xác nhận → nhập. Chọn tệp thủ công vẫn dùng được.
- Sau khi nhập xong ở chế độ tự động, ba nguồn tài khoản được đọc lại để hiển thị dữ liệu vừa nhập.
- **Không đổi:** không tự nhập; không ghi/xóa localStorage; lõi mapper, checkpoint, idempotency và RPC nhập giữ nguyên. Ô "đã giữ tệp gốc/bản cứu hộ" vẫn bắt buộc — nên tải bản cứu hộ ở phần phía trên trước khi nhập.
- Kiểm thử: `import-pilot.spec` thêm 2 ca (luồng đầy đủ từ dữ liệu máy với RPC nhập mô phỏng: mời → nạp → preview → xác nhận → nhập → "đã được nhập", localStorage không đổi; không có dữ liệu thì không mời), `staging-account.spec` thêm 2 ca trên host chính (mời và nạp không gửi gì; URL vận hành tắt bộ nhập). **Chưa thử trên project Supabase thật.**

## 10. Bước B — đã cài đặt (V5.34.0)
- `modules/legacy-storage.js` (nạp ở mọi trang, kể cả Home) có `PickleUpGuestWrites`: `cloudOnly()` đúng khi ở host chính, đúng đường dẫn, không có `?pilot=`/`?maintenance=` và Auth không bị tắt; `signedIn()` đúng khi có phiên Supabase lưu trên máy (`pickleup_auth_v6`) hoặc một trong ba runtime tài khoản có owner. `require()` ném lỗi `sign_in_required` với thông báo "Cần đăng nhập để lưu…".
- Mọi nhánh ghi dữ liệu khách gọi `require()` trước khi ghi: mục tiêu tuần, lịch tập, check-in (Hành trình và Tiến bộ), điểm Học viện, tự đánh giá, kiểm tra chuyển cấp, kiểm tra nâng cao, nhật ký trận, tạo/hoàn thành giáo án cơ bản và nâng cao (kèm nhật ký tập), lượt tập Trên sân, điểm tuần ở Home (lưu và xóa), khôi phục sao lưu V5 (trỏ sang bộ nhập).
- Trạng thái tạm chỉ giữ trong trang: checklist/bước tập trung Học viện, bài Học viện đang xem, giáo án đang chọn, trạng thái đồng hồ Trên sân.
- Dữ liệu cũ trên máy vẫn được đọc và hiển thị; không có gì bị xóa hay ghi đè. Host khác, URL vận hành và host test loopback giữ hành vi thiết bị.
- Đây là cổng giao diện; ranh giới thật vẫn là Auth/RLS phía máy chủ. Trên trang có nguồn tài khoản, trạng thái Auth của các nguồn đó quyết định (phiên hết hạn → không có owner → không ghi xuống máy). Chỉ ở Home (không nạp nguồn tài khoản) cổng dựa vào phiên Supabase còn lưu trên máy, nên một phiên đã hết hạn ở đó vẫn có thể lưu điểm tuần xuống máy.
- Kiểm thử: `guest-writes.test.js` (5 ca), `staging-account.spec` thêm 4 ca (chưa đăng nhập: mục tiêu, check-in, điểm Học viện, trận đấu bị từ chối và localStorage không đổi ở 390/1440; khôi phục V5 bị từ chối và đăng nhập thì mở; URL vận hành vẫn lưu trên máy).

## 11. Bước D — đã cài đặt (V5.35.0)
- `modules/auth-config.js`: `allowSignup: true`. Đăng nhập vẫn chỉ bật trên host chính có Auth (`PickleUpAuthOrigin`); GitHub Pages và host khác vẫn tắt.
- Mục Tài khoản (Dữ liệu): ô "Đăng ký tài khoản mới nếu chưa có" hiển thị; hướng dẫn đăng ký bằng mã email (không mật khẩu). `signInWithOtp` chỉ gửi `shouldCreateUser: true` khi người dùng tích ô, nên gõ nhầm email khi đăng nhập không tạo tài khoản.
- Thông báo lỗi: email chưa có tài khoản (`otp_disabled`/"Signups not allowed for otp") → nhắc tích ô đăng ký; đăng ký bị tắt phía máy chủ (`signup_disabled`) → "Đăng ký mới đang tạm đóng…". Gửi mã thành công → nhắc kiểm tra thư rác.
- Mục "Dữ liệu tài khoản và xóa tài khoản": liệt kê dữ liệu lưu (email và dữ liệu tập do người dùng lưu), nơi lưu (Supabase của ứng dụng, RLS theo tài khoản), không dùng cho quảng cáo/không chia sẻ; **chưa có nút tự xóa**, yêu cầu xóa gửi người quản trị; tệp đã tải và cache trình duyệt không xóa từ xa được.
- Giới hạn: quy trình xóa theo [chính sách §4](PILOT_OPERATING_POLICY.md) (reauth, preview/export, xóa Auth identity + dữ liệu qua quy trình đặc quyền) **chưa được tự động hóa**; backup định kỳ vẫn chưa vận hành (gói Free). Lạm dụng đăng ký được hạn chế bằng Rate Limits/CAPTCHA của Supabase do owner cấu hình.
- Kiểm thử: `auth-adapter.test.js` thêm ca thông báo đăng ký; `auth-origin.test.js` kiểm `allowSignup` mở trên mọi host có cấu hình.

## 12. Sau D — xóa tài khoản và sao lưu (V5.36.0)
- Xóa tài khoản tự phục vụ: RPC `public.delete_own_account(p_confirmation)` (migration `20261121000100`), security definer với `search_path=''`, chỉ `authenticated`; xóa `auth.users` của `auth.uid()` khi token có `amr` trong 10 phút, mọi bảng `ON DELETE CASCADE`. Giao diện: gửi mã email, gõ cụm xác nhận, xác minh mã rồi xóa, đăng xuất cục bộ.
- Sao lưu: `scripts/backup_db.sh` + `.github/workflows/db-backup.yml` (lịch hằng ngày, mã hóa age, artifact 35 ngày, cổng `BACKUP_ENABLED`). CI backend chạy script trên Supabase local mỗi PR.
- Kiểm thử: pgTAP `009_account_deletion` (26 ca), unit adapter, Playwright `account-delete.spec` (mock, 390/1440), real-Auth browser (GoTrue/Mailpit thật, Chromium + WebKit): đăng nhập → dữ liệu → mã xóa thứ hai → xóa → không còn user/dòng trên DB.
- Hướng dẫn owner: [ACCOUNT_OPERATIONS.md](ACCOUNT_OPERATIONS.md).
