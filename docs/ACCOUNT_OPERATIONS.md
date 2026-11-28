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

### Khôi phục và diễn tập (`scripts/restore_db.sh`)
Dùng script thay cho gõ tay từng lệnh `pg_restore`/`psql`. Script cần `age` và Docker (image `postgres:17`), chỉ in tên bảng và số dòng, không in nội dung. Trước khi ghi bất cứ gì, script **từ chối** nếu:
- URL đích chứa ref production `rfeoeagklmaqmkcdhprb`;
- lịch sử migration của DB đích khác lịch sử ghi trong bản backup;
- DB đích đã có dòng dữ liệu app hoặc user Auth.

Phần khôi phục chạy trong **một transaction** với `session_replication_role = replica`. Thiếu `replica` thì trigger `capture_first_write_epoch` trên `sync_heads` ghi trùng ledger và lỗi `duplicate key … epoch_ledger_pkey` ([LL-010](LESSONS_LEARNED.md)). Khi đó transaction rollback, DB đích vẫn trống.

Diễn tập trên project thử (không bao giờ trên production):
1. Supabase → New project `pickleup-restore-drill` (cùng region; gói Free, không nâng gói). Đặt mật khẩu DB mới.
2. Áp migrations: `supabase link --project-ref <REF-DIỄN-TẬP>` rồi `supabase db push`. **Kiểm tra ref trước khi push.**
3. Ngay sau một lần chạy workflow backup, dán [`scripts/db_row_counts.sql`](../scripts/db_row_counts.sql) vào SQL Editor của **production** (chỉ đọc). Lưu kết quả thành tệp `source-counts`, mỗi dòng dạng `schema.table|số`.
4. Tải artifact của run đó, giải nén ra `pickleup-backup-….tar.age`, rồi chạy:
   ```bash
   RESTORE_DB_URL='postgresql://postgres.<REF-DIỄN-TẬP>:<MẬT-KHẨU>@aws-…pooler.supabase.com:5432/postgres' \
   RESTORE_BACKUP_FILE=pickleup-backup-YYYYMMDDTHHMMSSZ.tar.age \
   RESTORE_AGE_KEY=~/pickleup-backup.key \
   RESTORE_EXPECT_COUNTS=source-counts \
   bash scripts/restore_db.sh
   ```
   Kết quả đạt: `restore ok: counts match source`. Nếu lệch vài dòng do có người ghi giữa lúc backup và lúc đếm, script in ra phần chênh lệch; ghi nhận lại, không coi là lỗi khôi phục.
5. **Dọn dẹp:** xóa project diễn tập (nó chứa bản sao dữ liệu thật), xóa tệp backup đã tải và `source-counts`. Chỉ giữ bảng số dòng và thời gian đo được.

Khôi phục thật sau sự cố cũng làm như trên, vào một project **mới** đã có migrations. Người dùng đăng nhập lại bằng mã email (phiên cũ không được sao lưu). Thiết bị đồng bộ lại theo epoch/revision hiện có; thay đổi chưa gửi vẫn nằm trong outbox của máy.

### Đã kiểm chứng / chưa
- **Sao lưu trên production đã chạy (27/11/2026):** run [45926728644](https://github.com/ndlong78/Pickleball/actions/runs/45926728644), `backup ok … app_tables=18`, artifact 154 KB, giữ tới 01/01/2027. Lần chạy theo lịch trước đó bị bỏ qua vì `BACKUP_ENABLED` chưa bật.
- CI backend chạy `backup_db.sh` trên Supabase local mỗi PR: tạo bản mã hóa, giải mã, kiểm tra có dữ liệu `user_preferences`, `sync_changes`, `auth.users`, `auth.identities`.
- CI backend còn chạy diễn tập đầy đủ trên Supabase local (PostgreSQL 17, GoTrue thật, user tạo bởi các suite Auth): đếm dòng → backup → `supabase db reset` → `restore_db.sh` → so số dòng từng bảng.
- Diễn tập khôi phục đầy đủ (sao lưu → DB mới → khôi phục → so số dòng) mới chạy trên PostgreSQL 16 cục bộ với fixture Auth, **chưa** trên Supabase thật. Theo [chính sách §4](PILOT_OPERATING_POLICY.md), chưa gọi là "đã có khôi phục kiểm chứng" cho tới khi owner diễn tập trên một project thử.

## 4. Kho số đo phân tích video (cài một lần)
Bản client lưu số đo phân tích video lên tài khoản cần bảng và RPC trong [ADR-0007](decisions/0007-video-analysis-store.md).
1. Dashboard → đúng project `rfeoeagklmaqmkcdhprb` → **SQL Editor** → New query.
2. Dán toàn bộ [`supabase/manual/staging_upgrade_20261128000100.sql`](../supabase/manual/staging_upgrade_20261128000100.sql) → **Run**.
3. Kết quả phải là `INSTALLED | 20261128000100`. Nếu báo `Unexpected migration history`, `video_analyses already exists` hoặc lỗi khác: dừng, không sửa tay, gửi nguyên văn thông báo.
4. Tệp chỉ **thêm** một bảng và ba RPC; không sửa dữ liệu, bảng, policy, quyền hay hàm hiện có. Rollback nếu cần (chỉ khi bảng chưa có dữ liệu cần giữ):
   ```sql
   drop function public.record_video_analysis(uuid,jsonb,integer), public.list_video_analyses(integer,timestamptz,integer), public.delete_video_analysis(uuid,integer);
   drop function pickleup_private.video_analysis_row(public.video_analyses);
   drop table public.video_analyses;
   delete from supabase_migrations.schema_migrations where version='20261128000100';
   ```
5. Kiểm tra nhanh (chỉ đọc): `select to_regclass('public.video_analyses') is not null as installed;` → `true`.
