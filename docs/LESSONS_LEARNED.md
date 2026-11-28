# Lessons learned — bài học từ lỗi thật

Sổ bài học cho agent và người phát triển. Chỉ ghi lỗi **có bằng chứng** (commit, Actions run, tài liệu sự cố) và có giá trị phòng ngừa lâu dài. Không ghi suy đoán, không ghi lỗi một lần không có khả năng lặp lại. Đọc trước khi sửa vùng mã liên quan ([DOC-05] trong `AGENTS.md`).

Mẫu bắt buộc (`tests/agent-harness.test.js` kiểm tra đủ các trường):

```md
## LL-NNN: tiêu đề ngắn
- **Triệu chứng:** điều quan sát được
- **Nguyên nhân gốc:** cơ chế thật, không chỉ thông báo lỗi
- **Phòng ngừa:** quy tắc hoặc cách làm
- **Kiểm chứng:** test/workflow bảo vệ, hoặc "chưa có test" nếu là gap
- **Nguồn:** commit/PR/run/tài liệu
- **Trạng thái:** active | retired
```

## LL-001: Version PWA không đồng bộ giữa các file
- **Triệu chứng:** người dùng có thể nhận asset cũ từ service worker sau khi release; test offline kiểm cache tên cũ.
- **Nguyên nhân gốc:** version nằm ở nhiều nơi (`package.json`, `PICKLEUP_BUILD`, mọi `?v=`, tên cache trong `sw.js`, assertion trong test PWA) và được sửa tay.
- **Phòng ngừa:** khi bump version, sửa đủ mọi vị trí trong cùng commit; thay đổi chỉ tài liệu/test thì không bump.
- **Kiểm chứng:** `tests/release-consistency.test.js`, `tests/stable-pwa-cache.test.js`, `tests/v38-pwa-upgrade.spec.cjs`.
- **Nguồn:** `docs/RELEASE_CHECKLIST.md` §5.
- **Trạng thái:** active

## LL-002: Test đọc dữ liệu trước khi lazy script của trang khởi tạo xong
- **Triệu chứng:** WebKit 820 `ReferenceError: Can't find variable: PickleUpLocalRepository` sau `page.reload()`, qua khi retry.
- **Nguyên nhân gốc:** trang Settings render markup (nút `disabled`, link `hidden`) trước khi lazy scripts chạy; chờ các thuộc tính đó không bảo đảm repository/controller/Auth đã có.
- **Phòng ngừa:** trong test, `await PICKLEUP_PAGE_LOADER.ensure('<page>')` và chờ trạng thái do controller tạo ra, không chờ thuộc tính có sẵn trong HTML. Không thêm sleep/timeout/retry.
- **Kiểm chứng:** CI chạy thêm 10 lượt WebKit 820 với retries=0 trước suite đầy đủ.
- **Nguồn:** `docs/POSTMERGE_V5_17.md`; `docs/REVIEW_SAFETY_2026_11.md` (Academy selection WebKit).
- **Trạng thái:** active

## LL-003: Service worker mới bị kẹt ở trạng thái waiting
- **Triệu chứng:** `v38-pwa-upgrade` thỉnh thoảng thất bại; cache cũ không được dọn.
- **Nguyên nhân gốc:** khi đã có worker điều khiển, worker mới gọi `skipWaiting()` trong install đôi khi vẫn ở `waiting` (khoảng 3/100 lượt cục bộ).
- **Phòng ngừa:** `pwa-client` gửi `PICKLEUP_SKIP_WAITING` tới worker đang waiting khi tải trang và sau mỗi lần install (giới hạn số lần). Đo tỷ lệ lỗi trước/sau thay vì đoán nguyên nhân.
- **Kiểm chứng:** `tests/pwa-client.test.js`, `tests/v38-pwa-upgrade.spec.cjs`.
- **Nguồn:** commit `cc74e79`.
- **Trạng thái:** active

## LL-004: Storage event của chính tab đến tài liệu sau reload
- **Triệu chứng:** ngay sau khi khôi phục V1 thành công và reload, page-loader báo "Dữ liệu đang chờ phục hồi an toàn" (Chromium, flaky).
- **Nguyên nhân gốc:** Chromium gửi storage event xóa journal bất đồng bộ; event có thể tới tài liệu đã reload của cùng tab, khiến tab coi phục hồi của chính nó là của tab khác.
- **Phòng ngừa:** đánh dấu phục hồi đã commit trong `sessionStorage` theo tab và bỏ qua echo. Với mọi logic đa tab dựa trên storage event, xét trường hợp event đến sau reload.
- **Kiểm chứng:** `tests/backup-v1.spec.cjs`, `tests/legacy-storage.test.js`.
- **Nguồn:** commit `0fb1f3b`.
- **Trạng thái:** active

## LL-005: Đổi câu chữ giao diện làm hỏng test chờ theo văn bản
- **Triệu chứng:** sau V5.35.0, test Auth thật và `auth.spec` không còn thấy trạng thái đã gửi mã.
- **Nguyên nhân gốc:** test chờ cụm `mã đã được gửi`; bản sửa câu chữ bỏ cụm đó.
- **Phòng ngừa:** trước khi sửa câu thông báo trạng thái, `grep` cụm cũ trong `tests/` và `scripts/test_auth_browser.cjs`; giữ cụm được test dùng hoặc sửa test trong cùng PR có nêu lý do.
- **Kiểm chứng:** `tests/auth.spec.cjs`, `npm run test:auth:browser`.
- **Nguồn:** commit `862b580`.
- **Trạng thái:** active

## LL-006: Hai `role=status` trong cùng panel làm locator mơ hồ
- **Triệu chứng:** locator `#accountPanel [role=status]` trong test purge/auth/real-Auth khớp hai phần tử.
- **Nguyên nhân gốc:** dòng trạng thái xóa tài khoản thêm `role=status` thứ hai vào `#accountPanel`.
- **Phòng ngừa:** mỗi panel chỉ một `role=status`; thông báo phụ dùng `aria-live`. Khi thêm vùng thông báo, `grep` locator đang dùng trong `tests/`.
- **Kiểm chứng:** `tests/account-delete.spec.cjs`, `tests/account-purge.spec.cjs`.
- **Nguồn:** commit `9fc94af`.
- **Trạng thái:** active

## LL-007: Xử lý nhiều khóa backup không fail-closed
- **Triệu chứng (phát hiện qua review):** import backup parse nhiều khóa trong một handler không có catch và ghi tuần tự; lỗi JSON/quota giữa chừng có thể để dữ liệu nửa cũ nửa mới.
- **Nguyên nhân gốc:** thiếu validate toàn bộ trước khi ghi và thiếu journal phục hồi.
- **Phòng ngừa:** validate toàn bộ tệp trước khi ghi; journal trước khi ghi và recovery trước khi feature đọc; khi quota/conflict chưa an toàn thì giữ dữ liệu và dừng.
- **Kiểm chứng:** `tests/backup-v1.test.js`, `tests/backup-v1.spec.cjs`.
- **Nguồn:** `docs/REVIEW_SAFETY_2026_11.md` (C1–C3), `docs/GUEST_BACKUP_SAFETY.md`.
- **Trạng thái:** active

## LL-008: Bước phụ chặn đường cứu hộ dữ liệu đã biết
- **Triệu chứng (phát hiện qua review):** `capture` gọi `discover` dù chỉ xuất 18 khóa đã biết; lỗi liệt kê khóa lạ chặn cả cứu hộ.
- **Nguyên nhân gốc:** gộp bước tùy chọn (khám phá khóa lạ) vào đường bắt buộc (cứu dữ liệu đã biết).
- **Phòng ngừa:** đường cứu hộ dữ liệu đã biết không phụ thuộc bước tùy chọn; bước tùy chọn lỗi thì degrade có cảnh báo.
- **Kiểm chứng:** `tests/rescue-core.test.js`.
- **Nguồn:** `docs/REVIEW_SAFETY_2026_11.md` (R1).
- **Trạng thái:** active

## LL-009: Push chỉ tài liệu không tạo CI trên `main`
- **Triệu chứng:** sau merge PR tài liệu, không có run `Responsive UI checks` cho merge SHA.
- **Nguyên nhân gốc:** `responsive.yml` có push path filters không gồm `AGENTS.md`/`docs/**`; PR CI vẫn chạy vì `pull_request`.
- **Phòng ngừa:** với PR tài liệu, lấy bằng chứng từ CI PR; báo rõ main không có run mới, không tuyên bố đã có.
- **Kiểm chứng:** chưa có test; quy tắc [MERGE-03].
- **Nguồn:** `docs/RELEASE_CHECKLIST.md` §5.
- **Trạng thái:** active

## LL-010: Khôi phục dữ liệu phải tắt trigger, nếu không ledger epoch bị ghi trùng
- **Triệu chứng:** nạp `auth.sql` + `data.sql` vào DB mới mà không `SET session_replication_role = replica` thì lỗi `duplicate key value violates unique constraint "epoch_ledger_pkey"`.
- **Nguyên nhân gốc:** trigger `capture_first_write_epoch` (AFTER INSERT trên `pickleup_private.sync_heads`) tự ghi ledger, trong khi bản dump cũng đã chứa các dòng ledger đó.
- **Phòng ngừa:** chỉ khôi phục bằng `scripts/restore_db.sh`: một transaction, tắt trigger, chặn DB đích không trống hoặc lệch lịch sử migration, chặn ref production. Khi thêm trigger mới tự ghi dữ liệu, kiểm lại bước diễn tập khôi phục.
- **Kiểm chứng:** bước "Restore drill on local Supabase" trong `.github/workflows/backend-checks.yml`; tái hiện lỗi trên PostgreSQL 16 cục bộ với fixture (không có `replica` → lỗi trên, rollback, DB đích còn 0 dòng).
- **Nguồn:** PR thêm `scripts/restore_db.sh` (27/11/2026), migration `20261111000100_legacy_writer_epoch_guard.sql`.
- **Trạng thái:** active

## LL-011: Test đọc biến toàn cục ngay sau một thao tác làm trang tự reload
- **Triệu chứng:** WebKit CI, `backup-v1.spec.cjs`: `ReferenceError: Can't find variable: PICKLEUP_PAGE_LOADER` sau khi khôi phục V1, qua khi retry (PR #81, run 46025178418). Cùng run, `import-pilot.spec.cjs` không thấy `[data-import-body]` trong 5 s ngay sau `goto`.
- **Nguyên nhân gốc:** khôi phục thành công gọi `location.reload()` sau khi ghi localStorage. Test chờ localStorage đổi (xảy ra trước reload) rồi `evaluate` vào document mới khi script chưa nạp. Ở test import, fragment Settings và hơn 50 module được nạp lazy, trên máy CI tải nặng có lúc mất hơn 5 s, trong khi test không chờ loader.
- **Phòng ngừa:** thao tác nào gây reload thì đặt `page.waitForEvent('load')` **trước** thao tác và `await` nó sau. Sau `goto` một trang lazy, `await PICKLEUP_PAGE_LOADER.ensure('<page>')` trước khi kiểm phần tử của fragment (như LL-002). Không tăng timeout, không thêm retry.
- **Kiểm chứng:** `tests/backup-v1.spec.cjs`, `tests/import-pilot.spec.cjs`; local Chromium lặp 5 lần: 90/90 pass. WebKit chạy trên CI.
- **Nguồn:** PR #81, commit sửa test trong PR này; `modules/assessments-and-backup.js` (reload sau restore).
- **Trạng thái:** active
