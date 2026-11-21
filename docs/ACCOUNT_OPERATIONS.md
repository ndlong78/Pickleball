# Vận hành tài khoản: giới hạn, xóa tài khoản, sao lưu (V5.36.0)

Dành cho owner. Claude không có quyền vào Supabase Dashboard hay GitHub Settings; các bước dưới đây chỉ owner làm được. Project thật: `rfeoeagklmaqmkcdhprb`.

## 1. Giới hạn chống lạm dụng (Supabase → Authentication)

Mở **Authentication → Rate Limits** (tên mục có thể là "Rate Limits" trong nhóm Configuration). Giá trị đề xuất cho ứng dụng nhỏ:

| Mục | Đề xuất | Ghi chú |
|---|---|---|
| Rate limit for sending emails (mỗi giờ, toàn project) | 30 | Mỗi lần đăng nhập/đăng ký và mỗi lần xin mã xóa tài khoản tốn 1 email. Không đặt cao hơn hạn mức của nhà cung cấp SMTP. |
| Sign ups and sign ins (mỗi 5 phút, mỗi IP) | 20 | Người dùng chung mạng (NAT văn phòng) dùng chung IP; đừng đặt quá thấp. |
| Token verifications (mỗi 5 phút, mỗi IP) | 30 | Chặn đoán mã OTP. |
| Token refreshes (mỗi 5 phút, mỗi IP) | giữ mặc định (150) | Ứng dụng tự làm mới phiên. |
| SMS / Anonymous / Web3 | giữ mặc định | Ứng dụng không dùng. |

Mở **Authentication → Sign In / Providers → Email** (hoặc Email Templates/Settings tùy phiên bản):
- **Email OTP expiration**: `600` giây (10 phút).
- **Email OTP length**: `6`.
- Nếu có **Minimum interval per user**: `60` giây (ứng dụng cũng chờ 60 giây giữa hai lần gửi).

**Không bật CAPTCHA** (Authentication → Attack Protection) lúc này: ứng dụng chưa gửi `captchaToken`, bật lên sẽ làm **mọi** lần gửi mã thất bại. Nếu thấy đăng ký rác, báo để làm PR thêm Cloudflare Turnstile trước rồi mới bật.

Kiểm tra sau khi lưu: đăng nhập lại một lần trên production; gửi mã liên tục nhiều lần phải nhận thông báo "Gửi quá nhiều mã…".

## 2. Xóa tài khoản tự phục vụ

### Cài SQL (một lần)
1. Dashboard → đúng project `rfeoeagklmaqmkcdhprb` → **SQL Editor** → New query.
2. Dán toàn bộ [`supabase/manual/staging_upgrade_20261121000100.sql`](../supabase/manual/staging_upgrade_20261121000100.sql) → **Run**.
3. Kết quả phải là `INSTALLED | 20261121000100`. Nếu báo `Unexpected migration history` hoặc lỗi khác: dừng, không sửa tay, gửi nguyên văn thông báo.
4. Tệp chỉ **thêm** một hàm `public.delete_own_account`; không sửa bảng, dữ liệu, RLS hay quyền khác. Rollback nếu cần: `drop function public.delete_own_account(text); delete from supabase_migrations.schema_migrations where version='20261121000100';`

Trước khi cài SQL, nút xóa vẫn hiện nhưng máy chủ từ chối: "Xóa tài khoản chưa sẵn sàng trên máy chủ…"; tài khoản không bị xóa.

### Người dùng làm gì
Dữ liệu → Tài khoản → **Xóa tài khoản** → **Gửi mã xác nhận xóa tới email** → nhập mã + gõ `XÓA TÀI KHOẢN` → **Xóa vĩnh viễn tài khoản**.

### Bảo vệ
- Máy chủ chỉ xóa `auth.uid()` (không nhận id/email từ trình duyệt) và chỉ khi token có lần xác thực mã email **trong 10 phút** (`amr`). Token chỉ được làm mới (refresh) không đủ.
- Xóa người dùng Auth kéo theo mọi bảng dữ liệu (`ON DELETE CASCADE`): hồ sơ, mục tiêu, check-in, điểm, đánh giá, nhật ký, trận, giáo án, lựa chọn, nhập dữ liệu cũ, sync/receipt/epoch.
- Đăng ký lại cùng email tạo tài khoản mới (id mới, trống); cache cũ trên máy không được chuyển sang.
- Giới hạn: tệp người dùng đã tải và cache trình duyệt không xóa từ xa được. Bản sao lưu cũ (mục 3) còn chứa dữ liệu tới khi hết hạn (tối đa 35 ngày).

## 3. Sao lưu tự động hằng ngày

Workflow [`.github/workflows/db-backup.yml`](../.github/workflows/db-backup.yml) chạy 02:17 giờ Việt Nam, dùng [`scripts/backup_db.sh`](../scripts/backup_db.sh): `pg_dump` (Docker `postgres:17`) dữ liệu `public`, `pickleup_private`, lịch sử migration, `auth.users`, `auth.identities` và schema tham chiếu → **mã hóa bằng age** → lưu artifact GitHub **35 ngày**. Không có bản rõ nào rời runner; chỉ người giữ khóa riêng mới mở được.

Tắt cho tới khi owner cấu hình:

1. **Tạo khóa trên máy của anh** (không đưa khóa riêng lên GitHub/chat):
   ```bash
   age-keygen -o pickleup-backup.key
   ```
   Dòng `Public key: age1...` là khóa công khai. Cất `pickleup-backup.key` ở nơi an toàn (trình quản lý mật khẩu + bản in/USB). **Mất khóa riêng = không mở được mọi bản sao lưu.**
2. **Chuỗi kết nối DB**: Supabase → **Connect** → **Session pooler** (IPv4; runner GitHub không có IPv6 cho Direct connection) → copy URI, thay `[YOUR-PASSWORD]` bằng mật khẩu DB.
3. GitHub repo → **Settings → Secrets and variables → Actions**:
   - Secret `SUPABASE_DB_URL` = URI ở bước 2.
   - Secret `BACKUP_AGE_RECIPIENT` = `age1...` ở bước 1.
   - Tab **Variables**: `BACKUP_ENABLED` = `true`.
4. **Actions → Database backup → Run workflow** (nhánh `main`) để chạy thử. Log phải có `backup ok: pickleup-backup-…tar.age bytes=… app_tables=…`; artifact `pickleup-db-backup-<run id>` xuất hiện ở trang run.

Ghi chú bảo mật: mật khẩu DB trong secret có toàn quyền DB; GitHub che secret trong log, workflow không chạy trên PR. Nếu muốn hẹp hơn, có thể tạo role chỉ đọc riêng cho sao lưu (làm PR sau).

### Khôi phục (chỉ khi cần; nên diễn tập trên project thử trước)
```bash
age -d -i pickleup-backup.key pickleup-backup-YYYYMMDDTHHMMSSZ.tar.age | tar -xf -
```
```bash
pg_restore -l data.dump | grep -v supabase_migrations > data.list
```
```bash
pg_restore -L data.list -f data.sql data.dump && pg_restore -f auth.sql auth.dump
```
Project đích phải đã có đủ migrations (chạy các tệp `supabase/manual` hoặc `supabase db push`) và **trống dữ liệu**. Sau đó:
```bash
psql "$TARGET_SESSION_POOLER_URL" --single-transaction -v ON_ERROR_STOP=1 -c "SET session_replication_role = replica" -f auth.sql -f data.sql
```
Người dùng đăng nhập lại bằng mã email (phiên cũ không được sao lưu). Thiết bị sẽ đồng bộ lại theo epoch/revision hiện có; thay đổi chưa gửi vẫn nằm trong outbox của máy.

### Đã kiểm chứng / chưa
- CI backend chạy chính script này trên Supabase local mỗi PR: tạo bản mã hóa, giải mã, kiểm tra có dữ liệu `user_preferences`, `sync_changes`, `auth.users`, `auth.identities`.
- Diễn tập khôi phục đầy đủ (sao lưu → DB mới → khôi phục → so số dòng) mới chạy trên PostgreSQL 16 cục bộ với fixture Auth, **chưa** trên Supabase thật. Theo [chính sách §4](PILOT_OPERATING_POLICY.md), chưa gọi là "đã có khôi phục kiểm chứng" cho tới khi owner diễn tập trên một project thử.
