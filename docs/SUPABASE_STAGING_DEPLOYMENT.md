# PickleUp V6 — triển khai Supabase staging

Cập nhật 06/11/2026. Baseline đã merge: **#34 / main `c849a16cb77aaaa6295a3683e14d172582542a3b` / V5.13.0**. [UI42029535372](https://github.com/ndlong78/Pickleball/actions/runs/42029535372):321 unit +528 browser Chromium/WebKit +10 lượt WebKit bổ sung pass,0 fail/flaky/retry. [Backend42029535288](https://github.com/ndlong78/Pickleball/actions/runs/42029535288):275 pgTAP +45 REST và Auth local thật hai engines pass. [Pages42029534340](https://github.com/ndlong78/Pickleball/actions/runs/42029534340) success cùng merge SHA. Evidence đúng HEAD của PR hướng dẫn ghi trong mô tả PR.

Đây là hướng dẫn operator cho **staging với dữ liệu giả**, chưa phải bằng chứng đã triển khai Managed hoặc mở pilot. Môi trường Codex hiện chưa có kết nối Supabase/SMTP. Chỉ Project URL/ref và publishable key được dùng ở frontend; DB password, personal access token, service/secret key và SMTP credentials ở máy operator hoặc cấu hình bảo mật, không chat/repo/log/artifact. Không tự mua dịch vụ hoặc mở production/signup công khai. [Policy](PILOT_OPERATING_POLICY.md) và [runbook](MIGRATION_RUNBOOK.md) giữ các gate dữ liệu thật.

## 1. Chọn project và phạm vi

Supabase chạy PostgreSQL/Auth/API; frontend vẫn là static PWA. Tạo project **riêng** tên `pickleup-staging`, Free, Singapore nếu khả dụng; kiểm quota và PostgreSQL17 như CI. Nếu version khác, chưa coi migrations đã được kiểm chứng trên version đó. Không link project đang chứa dữ liệu thật hoặc ứng dụng khác để làm theo hướng dẫn mới này. Project staging hiện hữu cần đối chiếu migration history trước, không ép đồng bộ lịch sử.

Ghi Project ref từ Dashboard và đối chiếu với Project URL `https://<PROJECT_REF>.supabase.co`. Trong phần API Keys lấy **Publishable key `sb_publishable_…`**. Adapter hiện từ chối legacy `anon` JWT và mọi secret key; không thay bằng service_role để sửa lỗi kết nối. Database password lưu trong trình quản lý mật khẩu.

## 2. Checkout và áp dụng sáu migrations

Máy operator cần Git, Node24, Python3. CLI **2.54.11** khớp backend CI. Dưới đây chạy bằng npx; nếu không tải/cài được CLI, dùng binary đúng version từ [release chính thức](https://github.com/supabase/cli/releases/tag/v2.54.11), xác minh `supabase --version` rồi thay tiền tố `npx --yes supabase@2.54.11` bằng `supabase`. Chưa xác minh CLI thành công thì chưa chạy bước DB. Không dùng `--debug` hoặc ghi transcript có thông tin đăng nhập.

```bash
git clone https://github.com/ndlong78/Pickleball.git Pickleball-staging
cd Pickleball-staging
git checkout c849a16cb77aaaa6295a3683e14d172582542a3b
npm ci
npx --yes supabase@2.54.11 --version
npx --yes supabase@2.54.11 login
```

Login tương tác trên máy operator. Sau đó thay `YOUR_STAGING_PROJECT_REF` bằng ref vừa đối chiếu:

```bash
npx --yes supabase@2.54.11 link --project-ref YOUR_STAGING_PROJECT_REF
npx --yes supabase@2.54.11 migration list --linked
npx --yes supabase@2.54.11 db push --linked --dry-run
```

Nhập DB password qua prompt kín nếu CLI yêu cầu, không gắn password/PAT vào command line hoặc commit. Trên project mới, dry-run phải có sáu file theo thứ tự:

| Version | File |
|---|---|
| 20261029000100 | `20261029000100_schema.sql` |
| 20261029000200 | `20261029000200_sync_rpc.sql` |
| 20261030000100 | `20261030000100_atomic_import.sql` |
| 20261101000100 | `20261101000100_sync_epoch_fence.sql` |
| 20261101000200 | `20261101000200_activity_event_fence.sql` |
| 20261103000100 | `20261103000100_plan_selection_fence.sql` |

Trên staging đã áp dụng một phần, CLI chỉ liệt kê phần còn thiếu; các version đã có phải trùng lịch sử source. Nếu có remote-only version, lỗi role/permission hoặc lệch checksum/source, dừng đối chiếu; không `migration repair`, xóa history, sửa migration cũ hay nới RLS để ép chạy.

Sau khi đối chiếu đúng project và plan:

```bash
npx --yes supabase@2.54.11 db push --linked
npx --yes supabase@2.54.11 migration list --linked
```

Đối chiếu đủ sáu versions ở local/remote. Lệnh không dùng `--include-seed` hoặc `--include-roles`; role ứng dụng đã nằm trong migration. **Không chạy `db reset`, `supabase test db`, `scripts/test_*.py`, `scripts/test_auth_browser.cjs` hoặc `scripts/fixtures/*` lên Managed staging/production**: harness chỉ dành local ephemeral. Không nhập `standalone_auth.sql`; Managed có Auth schema thật.

`db push` **chỉ đẩy SQL migrations**, không tự áp dụng Auth/SMTP/Site URL từ `supabase/config.toml`. File đó dành local CI, có signup enabled và loopback URLs; không dùng làm cấu hình rollout Managed. Database staging hiện hữu cần backup/recovery review trước thay đổi; không có rollback tự động hoặc hướng dẫn drop schema.

## 3. Kiểm tra database chỉ đọc

Trong Dashboard Data API, chỉ expose `public` cho API ứng dụng; không expose `pickleup_private` hoặc `auth`. Không bật direct INSERT/UPDATE/DELETE cho anon/authenticated, không bỏ FORCE RLS. SQL Editor chạy dưới quyền operator đặc quyền: thấy dữ liệu ở đây **không chứng minh** người dùng A/B đọc được hoặc bị chặn.

Các mẫu SELECT dưới chỉ đọc catalog/migration metadata, không đọc nội dung tài khoản hoặc thay đổi DB. Chưa được chạy trên Managed trong tác vụ soạn hướng dẫn; điều kiện đối chiếu từ migrations/pgTAP hiện có. Chạy sau bước2, ghi nhận kết quả thủ công; đây là kiểm tra cấu hình cơ bản, không thay tests ownership/concurrency qua session A/B thật.

```sql
select current_setting('server_version_num')::integer / 10000 as postgres_major;
select version from supabase_migrations.schema_migrations order by version;
```

Kỳ vọng major17 và sáu versions nêu trên cho project staging mới. Kiểm 16 bảng: tất cả `exists_ok`, `rls_enabled`, `rls_forced`, `client_acl_ok` phải true; bảng thiếu vẫn xuất một dòng false:

```sql
with expected(schema_name, table_name) as (values
 ('public','profiles'), ('public','user_preferences'),
 ('public','personal_plans'), ('public','academy_attempts'),
 ('public','skill_assessments'), ('public','legacy_score_snapshots'),
 ('public','practice_checkins'), ('public','training_entries'),
 ('public','match_records'), ('public','user_selections'),
 ('public','legacy_imports'), ('public','legacy_import_items'),
 ('pickleup_private','sync_heads'), ('pickleup_private','sync_receipts'),
 ('pickleup_private','sync_changes'), ('pickleup_private','sync_operation_epochs')
)
select e.schema_name, e.table_name, c.oid is not null as exists_ok,
 coalesce(c.relrowsecurity, false) as rls_enabled,
 coalesce(c.relforcerowsecurity, false) as rls_forced,
 case when c.oid is null then false else
  not has_table_privilege('anon', c.oid,
   'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  and not has_table_privilege('authenticated', c.oid,
   case when e.schema_name = 'public'
    then 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    else 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER' end)
 end as client_acl_ok
from expected e
left join pg_namespace n on n.nspname = e.schema_name
left join pg_class c on c.relnamespace = n.oid
 and c.relname = e.table_name and c.relkind = 'r'
order by e.schema_name, e.table_name;
```

Kiểm RPC public: mười dòng, mọi `rpc_ok` true. Thiếu function hoặc có overload ngoài hợp đồng làm false. Không gọi RPC để kiểm metadata vì một số RPC có thể tạo sync head.

```sql
with expected(name) as (values
 ('apply_operation'), ('pull_changes'), ('begin_import'), ('import_batch'),
 ('finish_import'), ('get_import_status'), ('prepare_sync'),
 ('apply_sync_operation'), ('apply_event_operation'), ('apply_plan_operation')
)
select e.name, count(p.oid) as signatures,
 count(p.oid) = 1 and coalesce(bool_and(
  p.prosecdef and pg_get_userbyid(p.proowner) = 'pickleup_api'
  and p.proconfig @> array['search_path=""']
  and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  and not has_function_privilege('anon', p.oid, 'EXECUTE')
 ), false) as rpc_ok
from expected e
left join pg_namespace n on n.nspname = 'public'
left join pg_proc p on p.pronamespace = n.oid and p.proname = e.name
group by e.name order by e.name;
```

Role phải có đúng một dòng, mọi flag dưới false; kết quả không có dòng là lỗi:

```sql
select rolname, rolcanlogin, rolinherit, rolsuper, rolbypassrls,
 rolcreaterole, rolcreatedb, rolreplication
from pg_roles where rolname = 'pickleup_api';
```

Không gọi `GRANT`/`ALTER` để sửa trực tiếp theo phỏng đoán. Nếu kiểm tra fail, giữ flags off, ghi tên check/version và lỗi đã bỏ secrets; xử lý bằng review/forward migration phù hợp.

## 4. Cấu hình Auth và SMTP trên Dashboard

Tên menu có thể thay đổi theo Dashboard; tìm Authentication / Sign In / Providers, URL Configuration, Email Templates, SMTP và Rate Limits.

| Thiết lập | Staging local frontend giai đoạn đầu |
|---|---|
| Email provider / Confirm email | Bật cả hai |
| Allow new users to sign up | **Tắt trên server** |
| Anonymous sign-ins | Tắt; guest của PickleUp không cần Supabase anonymous user |
| Site URL và redirect allowlist | `http://127.0.0.1:4173/Pickleball/`, đúng origin/prefix, không wildcard |
| Email OTP expiry | Đề xuất600 giây; ghi lại cấu hình thực tế |
| OTP length | Đề xuất6 nếu có setting; frontend nhận6–10 chữ số |
| Session JWT expiry | Có thể giữ3600 giây nếu là cấu hình hiện tại; nếu thay đổi phải ghi nhận và kiểm lại expiry/refresh |
| Send interval/rate limit | Tối thiểu60 giây mỗi địa chỉ và quota giờ theo SMTP thực tế; kiểm server enforcement |

Trong template **Magic Link / OTP**, dùng mã nhập tay:

```html
<h2>Mã đăng nhập PickleUp</h2>
<p>Mã xác thực: <strong>{{ .Token }}</strong></p>
<p>Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>
```

Không chuyển sang `TokenHash`/link PKCE: adapter đang `detectSessionInUrl:false`, UI chỉ nhập mã. Khi kiểm signup có kiểm soát ở bước sau, rà soát cả template Confirm Signup nếu flow dùng nó. Hết hạn OTP dùng chung một số email links của Supabase; ghi lại cấu hình, không coi chỉ tác động nút đăng nhập.

SMTP: dùng nhà cung cấp có thể cấu hình hợp lệ trong ngân sách đã có/free tier, xác minh sender/domain, nhập host/port/username/password/from address/sender name trong Dashboard. Không coi free tier là bảo đảm miễn phí vô hạn. SMTP mặc định chỉ phục vụ phạm vi test bị giới hạn người nhận/quota; không thêm tester vào organization để né giới hạn email. Để thử A/B với email thông thường cần custom SMTP. Kiểm delivery/spam, resend và server rate limit; ghi metadata kết quả, không lưu raw email chứa OTP. Xem [SMTP chính thức](https://supabase.com/docs/guides/auth/auth-smtp), [OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [rate limits](https://supabase.com/docs/guides/auth/rate-limits).

Tạo hai user A/B thuộc hộp thư operator kiểm soát trong Authentication → Users → Add user, email đã xác nhận. Nếu Dashboard yêu cầu password khi tạo, giữ riêng; app vẫn đăng nhập OTP. Trên UI bỏ chọn “Đăng ký tài khoản mới nếu chưa có”. **Chưa kiểm signup Managed** trong bước này. Muốn kiểm signup mới phải có allowlist/Before User Created hook được review ở server trước; giấu frontend hoặc bỏ checkbox không chặn gọi signup API trực tiếp. Giữ server signup off tới khi có cơ chế đó.

## 5. Frontend staging và nguồn dữ liệu

Chỉ sửa **bản clone thử nghiệm trên máy operator** ở bước2, không push config bật flag lên main hoặc thay Pages hiện tại. File `modules/auth-config.js` chứa thông tin công khai:

```js
window.PICKLEUP_AUTH_CONFIG = Object.freeze({
  enabled: true,
  url: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "sb_publishable_REPLACE_ME"
});
```

URL là project API origin, không `/auth/v1`, `/rest/v1` hoặc DB URL. Giữ bốn flags còn lại false trong lần kiểm Auth đầu tiên. Chạy từ root clone:

```bash
python3 scripts/serve_test.py
```

Mở `http://127.0.0.1:4173/Pickleball/?page=settings`. Dùng browser profile riêng cho staging; không xóa storage/PWA/backup của browser đang có dữ liệu thật. Nếu origin local này từng đăng nhập project khác, đăng xuất project cũ và dùng profile sạch, không mang token/cache sang project mới. Server này chỉ bind loopback, không là host cho điện thoại hoặc staging public.

Nếu UI vẫn hiện “chưa cấu hình”, đối chiếu đúng clone/file được phục vụ, Auth config URL/key và origin. Khi có SW cũ, dùng profile staging mới hoặc kiểm update ở profile đó. Không yêu cầu xóa dữ liệu luyện tập thật để sửa cấu hình. Tắt Auth flag chỉ làm UI quay về guest; **không** revoke session hoặc tắt signup server. Rollback staging phải logout các profile test, giữ export pending nếu có, rồi tắt flags; không drop tables hoặc xóa cache/queue tự động.

Khi Auth đạt, bật từng flag trong bản thử, chủ động consent từng nguồn trên UI:

| File trong `modules/data/` | Phạm vi |
|---|---|
| `sync-config.js` | Mục tiêu/check-in |
| `plan-config.js` | Giáo án/lựa chọn; own plan phải ACK trước Court/training |
| `activity-config.js` | Academy attempts, assessments, training, matches |
| `import-config.js` | Nhập legacy sau cùng, chọn nhóm/preview/quarantine/consent |

Login hoặc bật flag không tự nhập localStorage, không tự chọn nguồn hoặc gửi queue. Đọc/gửi/retry/review là thao tác riêng. Không bơm dữ liệu thật vào V5 để làm fixture. File cứu hộ cache V6 khác backup V5/raw rescue và **chưa restore**; cache chỉ gồm dữ liệu đã có trên máy, không thay backup DB/Auth.

Frontend staging HTTPS/Pages riêng chỉ được cấu hình sau khi chọn host/origin, cập nhật URL allowlist chính xác và kiểm PWA. Bật cloud trên website hiện tại cần PR rollout/config riêng, đồng bộ build/assets/cache theo quy trình. Supabase environment variables không tự thay public JS config của static app. Hướng dẫn này giữ năm flags false trong source phát hành, app/assets/cache5.13.0.

## 6. Ma trận nghiệm thu Managed staging

Ghi kết quả **PASS / FAIL / CHƯA CHẠY**, không suy từ badge local CI. Dùng dữ liệu tổng hợp; không lưu token/OTP/raw mail/private exports vào ảnh/video/HAR/trace hoặc GitHub artifact.

| Nhóm | Thao tác và kỳ vọng |
|---|---|
| Guest | Không cấu hình Auth vẫn dùng tám route và backup khách; đăng nhập không đổi18 keys |
| OTP delivery | User A được cấp sẵn nhận email → nhập mã sai → mã đúng → có session; thử expired/resend/quota/network và loading |
| Session | Reload restore; hai tab cùng profile; logout từ một tab; refresh/hết phiên theo thời gian thực và mất mạng; không chỉ gọi refresh thủ công rồi ghi là auto-refresh |
| Private access | Nút kiểm truy cập dữ liệu riêng thành công với session; account mới có thể trả dữ liệu rỗng, chưa là bằng chứng đã đồng bộ dữ liệu luyện tập |
| Write/owner | Bật sync local + consent; A lưu và gửi mục tiêu/check-in tổng hợp, kiểm ACK. Profile/browser B đăng nhập và đọc: không có nội dung A. Đổi A→B trong cùng profile khi response đang chờ, không lộ A/không gửi queue A bằng B |
| Multi-device/conflict | Hai browser/profile A cùng revision, sửa khác nhau; sender thứ hai nhận conflict trong HTTP200, review rõ, không silent overwrite; mất ACK giữ request ID/frozen retry |
| Plans/activity | Plan ACK trước chọn/Court; lưu/gửi hoạt động tổng hợp đúng nguồn; score/timer/checklist không tự attendance; clear/delete/review theo domain |
| Import | Raw rescue/backup V5 giả → preview → consent đúng owner → explicit import; retry/overlap/quarantine, không double-count hoặc xóa guest |
| Cache rescue | Chụp bảy stores → export → mở file đúng account chỉ xem inventory/checksum; không RPC/restore; logout/A→B clear inventory/link; file giữ riêng ngoài browser |
| PWA/path | `/Pickleball/`, Settings deep link, route/back/reload, offline/online, update từ5.12; SW không cache Auth/REST/token URL |
| Thiết bị thật | Safari iPhone/iPad và Chrome Android/PWA; Playwright390/820/1180/1440 không thay field QA |
| Signup mới | **Chưa chạy** khi signup server off; chỉ test sau server allowlist/hook, không mở public signup để đạt checklist |

Tách status: mock transport/native IDB → GoTrue/Mailpit/Auth local thật → Managed staging SMTP/gateway → physical QA → pilot. Hai tầng đầu đã có CI; hướng dẫn mới chưa chứng minh hai tầng sau. Chưa triển khai operational backup/Auth restore/delete hoặc V6 full restore/purge; giữ gate dữ liệu thật đóng.

## 7. Lỗi thường gặp và bằng chứng cần giữ

| Hiện tượng | Đối chiếu |
|---|---|
| CLI link/dry-run lỗi | Đúng ref/password qua prompt, quyền operator/network và CLI version; không lấy DB URL chứa password đưa vào log/chat |
| Migration role/permission lỗi | PostgreSQL version, history và quyền migrator Managed; dừng review lỗi gốc, không cấp BYPASSRLS/service key cho frontend |
| UI guest / chưa cấu hình | Đúng clone/origin/config, `sb_publishable_` prefix, modules load và SW profile staging |
| Email không đến | SMTP/sender/provider sandbox/quota; default SMTP recipient restrictions; không log mã hoặc thêm tester vào organization |
| Người dùng mới bị từ chối | Signup server đang off là trạng thái chủ ý; dùng user A/B tạo sẵn, không bật public signup để né lỗi |
| HTTP200 nhưng queue còn | Kiểm domain status `conflict`, `invalid`, `reset_required`, `upgrade_required`, không coi HTTP200 là ACK |
| Auth thành công nhưng không thấy dữ liệu tập | Flags/consent/đọc/gửi từng nguồn riêng; không import guest tự động; account mới ban đầu rỗng |

Biên bản operator ghi ngày, commit, CLI/PG version, project ref/origin không secret, sáu migration IDs, kết quả check metadata, cấu hình OTP/rate limits và kết quả từng dòng matrix. Không dán raw DB/Auth/mail/API logs. Trước dữ liệu thật còn phải có encrypted backup destination/job, restore DB/Auth identities/epoch/deletion markers, account/cache deletion, privacy/support, quota và field QA theo [policy](PILOT_OPERATING_POLICY.md). JSON rescue không thay restore drill; các target RPO/RTO chưa là SLA.
