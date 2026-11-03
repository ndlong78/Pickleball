# PR5b1a — RPC giáo án và lựa chọn có epoch fence

Nền main `ddcb9f25327feab7cefa41d3539357270a9572e1`, [#26](https://github.com/ndlong78/Pickleball/pull/26) đã merge, app5.7.0; không PR mở khi bắt đầu. Main [regression41411674425](https://github.com/ndlong78/Pickleball/actions/runs/41411674425):242 unit+394 browser+5 WebKit rescue+5 WebKit controlled-font,0 fail/flaky/retry; [backend41411674398](https://github.com/ndlong78/Pickleball/actions/runs/41411674398):241 pgTAP/37 REST và GoTrue/Mailpit/SDK/browser Auth thật Chromium/WebKit; [Pages41411673280](https://github.com/ndlong78/Pickleball/actions/runs/41411673280) success cùng merge SHA.

## Phạm vi

Migration additive `20261103000100_plan_selection_fence.sql` và `auth.planRpc` cung cấp nền protocol1 cho `personal_plans`/`user_selections`. Chưa có repository policy/projection, sender, consent/review hay nguồn account cho giao diện giáo án/lựa chọn. App/build/cache vẫn5.7.0; không thay asset URL, router hoặc PWA shell. Bốn flags Auth/import/sync/activity vẫn false, URL/publishable key rỗng. Guest và mọi writer/reader plan/timer hiện có vẫn dùng kho thiết bị.

Không cần cấu hình mới để review PR. Chưa áp dụng migration vào staging/production, chưa mở signup hoặc pilot. Khi tích hợp UI sau này phải bump đồng bộ app/assets/cache và kiểm capability của adapter; client cache cũ không được giả định đã có `planRpc`.

## Hợp đồng RPC

`apply_plan_operation(p_operation_id uuid,p_kind text,p_entity_key text,p_action text,p_expected_revision text,p_epoch uuid,p_payload jsonb default '{}',p_protocol_version integer default1)` trả domain envelope trong HTTP200. Chỉ `applied` là ghi được xác nhận; giữ nguyên `conflict` (kèm own row hoặc null), `invalid`, `reset_required`, `upgrade_required`, `auth_required`. Không dùng HTTP200 làm acknowledgement chung.

- Plan key là UUID lowercase chuẩn; selection là singleton `self`. Actions `put/delete/restore`; revision decimal string, không đổi sang JS Number. Payload object≤256KiB, snapshot/field constraints PR1a giữ nguyên.
- Tạo plan bằng revision0: source basic/advanced, schema_version1, level_band và snapshot đúng schema. Snapshot là nội dung đã chốt, không sửa source/band/schema/snapshot sau tạo. Update/restore chỉ nhận `check_score` và `completed_at`, kể cả resend snapshot bằng hệt cũng bị `immutable_plan_fields`. Kết quả vẫn CAS, không tạo attendance hoặc training entry.
- Selection chỉ tham chiếu plan còn sống của cùng owner. Không xóa plan đang được selection còn sống tham chiếu. Xóa/clear là tombstone CAS; `put` không phục sinh. Muốn khôi phục: restore plan trước rồi restore selection bằng command mới sau review. Failed receipt giữ nguyên dù dependency sau đó đã được khôi phục. Dependency với training giữ hợp đồng PR1a, không tự cascade hoặc sửa history.
- Trước gửi gọi `prepare_sync`/pull lấy epoch. Writer khóa cùng `sync_heads` với các writer/manual/import và restore; kiểm epoch trước ledger/receipt. Epoch sai trả `reset_required`, không commit dữ liệu/binding. UUID command đã bind epoch không rebind sau restore.
- Dùng chung append-only `sync_operation_epochs`: hash chứa kind/key/action/revision/epoch/payload/protocol. Cùng request replay; đổi body/epoch hoặc dùng UUID đã có receipt legacy/import bị từ chối. Giữ nguyên UUID/body khi mất phản hồi sau commit. Wrapper rejection immutable có binding nhưng chưa tạo core receipt, replay vẫn trả cùng invalid; không yêu cầu `replayed:true` cho mọi lỗi.
- RLS, FORCE RLS, quyền DML và API role không đổi. Function SECURITY DEFINER owner `pickleup_api` NOLOGIN/NOBYPASSRLS, search_path rỗng; anon/public không EXECUTE, authenticated được EXECUTE. CREATE/SET đặc quyền tạm của migration được thu hồi.

`apply_operation`/import và hai writer fenced trước vẫn tương thích, không thêm kind vào chúng; endpoint legacy không tự trở thành fenced. API này bổ sung capability riêng, không tuyên bố mọi đường ghi đã fence. Profile tiếp tục dùng hợp đồng PR1a.

## Adapter và cách ly tài khoản

`planRpc(owner,method,args)` chỉ cho `prepare_sync`, `apply_plan_operation`, `pull_changes`. Dùng cùng transport riêng của adapter: clone body trước await, pin bearer của owner, abort khi generation đổi, trả `stale` nếu response A tới sau logout/B. Caller phải bỏ `stale`; không dùng token B để tiếp tục request A. Các capability import/sync/event không gọi được writer plan và ngược lại. Chưa có lệnh RPC mới tự chạy lúc login, restore session hoặc đổi route.

## Kiểm chứng và giới hạn

- Unit mock transport: method allowlist, frozen clone, pinned bearer/abort/late A→B và HTTP200 domain envelope. Đây không phải kiểm chứng RLS/Auth thật.
- PostgreSQL17/PostgREST local fallback với Auth fixture tối thiểu:8 REST tests pass. Tạo basic/advanced, immutable fields, replay/body binding, CAS concurrency, anon/A/B/direct-DML, selection/deleted target, tombstone/restore, legacy receipt và epoch restore lock race. Không gọi fallback là GoTrue/email integration.
- CI chuẩn chạy migrations upgrade/reset, pgTAP và toàn REST; thêm suite SQL quyền/capability/dependency và8 REST nói trên. Real GoTrue/Mailpit/SDK/browser Chromium+WebKit thêm plan/selection **API-only**: commit rồi mất phản hồi/replay, CAS race, dependency/delete/restore, A→B và response A muộn. Gateway chỉ fault-inject sau upstream thật, giữ payload trong memory; không lưu token/OTP/private payload, trace/video/screenshot/storageState hoặc artifact Auth.
- Regression hiện hữu giữ `/Pickleball/`, guest/router/PWA/offline và hai browser engines. Số pass/fail/flaky/retry và URLs của **HEAD cuối** ghi trong PR, không commit tài liệu chỉ để tự ghi SHA của nó.
- Chưa Managed staging/SMTP deliverability, browser expiry/auto-refresh theo thời gian thực, physical devices/field QA hoặc vận hành backup/Auth restore/deletion. Test local alias publishable không chứng minh Managed gateway. Không dùng production credentials hay reset DB production.

## Tiếp theo

PR5b1b sẽ thêm repository policy/projection, dependency và sender với frozen queue, source/consent/review; sau đó nối UI plans/selections cùng toàn bộ readers Coach/Court/Journey/Progress và cache version mới. Các bước này cần kiểm A→B/native reload/offline/multi-tab/repair trước training UI PR5a2d. Timer/checklist vẫn device-only; không tự import legacy hoặc chép private assessment sang giáo án khách. PR5b2 full V6 backup round-trip/purge và PR6 vận hành/staging vẫn là gate trước pilot.
