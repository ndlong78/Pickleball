# S1 — chặn legacy writer vượt qua epoch

Migration mới `20261111000100_legacy_writer_epoch_guard.sql` giữ chữ ký public `apply_operation` protocol1 và đường profile PR1a. Tám kind có writer fenced gồm preferences/check-ins, bốn loại hoạt động, plans/selections được bảo vệ bổ sung; client hiện tại đã dùng `apply_sync_operation`, `apply_event_operation`, `apply_plan_operation`.

## Hợp đồng

- Private `legacy_write_epochs` ghi first epoch và cờ compatibility, PK theo Auth user. FORCE RLS own-user cho RPC owner; không client SELECT/DML, không UPDATE/DELETE cho `pickleup_api`. Helper trigger không được anon/authenticated gọi trực tiếp.
- **Các head đã tồn tại khi nâng cấp:** backfill `legacy_allowed=false`, vì không thể suy từ epoch hiện tại rằng chưa từng reset. Public legacy writer của8 kind trả HTTP200 `{status:"upgrade_required",code:"epoch_required"}`, kể cả retry receipt cũ. Không ghi business rows/receipt/counter từ yêu cầu bị chặn.
- **Head tạo mới sau migration:** trigger capture epoch đầu; legacy protocol1 chỉ còn tương thích khi epoch chưa đổi. Ledger tồn tại độc lập với head và không rebind khi head bị xóa/tạo lại. Sau rotation, writer cũ bị từ chối ngay cả operation ID mới/expected revision0.
- Kiểm guard dưới cùng row lock `sync_heads` với writer và operator rotation; request đã chờ lock phải kiểm epoch sau khi rotation commit. DDL lock trong migration bảo vệ backfill/capture khỏi thiếu head mới.
- Profile PR1a và hash/replay của profile không đổi. Các writer fenced và importer nội bộ vẫn dùng private worker; không nới RLS hoặc public helper capabilities.

Đây là lựa chọn tương thích có giới hạn thay cho đóng thẳng mọi protocol1 caller. Không dùng mốc current của user cũ làm “first epoch”. Không tự đổi RPC/epoch hoặc cấp ID mới để gửi lại legacy pending; phải đọc/review theo protocol client, vì receipt cũ không được tự nhận làm operation fenced mới. Public legacy capability bị đóng cho mọi user hiện hữu khi nâng cấp; frontend5.15.1/fenced writer vẫn dùng được cả trước và sau migration.

## Giới hạn quan trọng

Không thêm hoặc cho phép reset/restore/delete-account server. Importer/operator capabilities chưa được biến thành protocol reset an toàn chỉ bởi migration này. Các gate backup/Auth recovery/importer repair/deletion/quiesce vẫn giữ theo policy. Trước server restore phải thiết kế quiesce mọi writer, đổi epoch cho toàn bộ user liên quan, xử lý Auth/tombstone/pending và thử recovery riêng. Không gọi đây là full V6 restore.

Trước **nâng cấp** cũng phải dừng/đóng các tab gửi và các writer khác. Một function cũ đã thực thi trước khi DDL thay body không được coi là tự hủy. Migration không tự khóa gateway/SDK hoặc chứng minh có maintenance window. Chỉ thử staging bằng dữ liệu giả, không production.

## SQL Editor cho staging đang có sáu migrations

Chỉ thực hiện sau review/merge và backup/recovery review phù hợp với dữ liệu đang có; không tự chạy từ PR. Môi trường Codex không có kết nối quản trị Supabase, nên chưa áp dụng lên Managed.

1. Đối chiếu Dashboard project ref **rfeoeagklmaqmkcdhprb**, PostgreSQL17, dữ liệu thử; tạm dừng các client/writer. SQL không thể tự chứng minh project ref từ tên database.
2. Mở [staging_upgrade_20261111000100.sql](../supabase/manual/staging_upgrade_20261111000100.sql) từ đúng commit đã review, dán toàn bộ vào SQL Editor dưới role operator `postgres` và chạy một lần. Không dùng bộ cài sáu migration cũ, không reset/drop schema, seed hoặc migration repair.
3. Bundle chỉ nhận đúng sáu version trước đó và history chuẩn `statements text[]`; nếu khác hoặc đã có version7/table mới thì dừng trước thay đổi, đối chiếu history. Không xóa lịch sử để ép chạy. Transaction bao DDL và ghi version7; source được sinh từ migration, CI kiểm không drift.
4. Kết quả `INSTALLED / 20261111000100` chỉ là metadata nâng cấp. Chạy kiểm tra chỉ đọc dưới, sau đó thử đăng nhập/user riêng và đọc/gửi qua writer mới bằng dữ liệu giả. Không gửi email, token, payload hoặc nội dung rows lên issue/log.

```sql
select version from supabase_migrations.schema_migrations order by version;
select relrowsecurity, relforcerowsecurity
from pg_class where oid='pickleup_private.legacy_write_epochs'::regclass;
select has_table_privilege('authenticated','pickleup_private.legacy_write_epochs','SELECT,INSERT,UPDATE,DELETE') as client_access,
       has_table_privilege('pickleup_api','pickleup_private.legacy_write_epochs','UPDATE,DELETE') as api_can_rebind;
```

Sau upgrade: **7 migrations,17 bảng ứng dụng,10 public RPC**; không thêm public endpoint. `client_access` và `api_can_rebind` phải false. Không chọn nội dung ledger/user để báo cáo. Nếu history/layout khác, lỗi phải được xử lý theo catalog thực tế; không lấy secrets hoặc nới permissions làm workaround.

Project mới dùng cả7 migration theo CLI/runbook hiện hành; không dùng bundle6→7 trên DB trống. Không chạy pgTAP/REST/fixtures/Auth capture scripts trên Managed.

## Kiểm chứng

Backend CI kiểm upgrade schema cũ giữ rows/CAS bằng fenced writer, profile receipt/manifest metadata giữ nguyên; dựng DB sáu migration, seed user giả, chạy chính bundle SQL Editor, kiểm user hiện hữu bị chặn legacy và writer mới thành công; reset từ trống với cả7 migrations.

pgTAP kiểm RLS/ACL/search_path, first epoch/replay, cả8 kind bị chặn sau rotation, profile/current fenced write, no rejected receipts/cursor mutation, head recreation và A/B isolation. REST bổ sung rotation/replay/new operation, B độc lập, profile compatibility và transaction thực sự chờ operator lock trước khi bị từ chối. Kết quả cuối đúng PR HEAD ghi ở mô tả PR, không suy thành Managed QA.
