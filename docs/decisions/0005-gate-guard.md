# ADR-0005 — Gate guard: cổng kiểm thử nằm ngoài tầm sửa của PR

**Trạng thái:** active.
**Ngày:** 25/11/2026.

## Bối cảnh
Từ [ADR-0003](0003-auto-merge.md) agent được tự merge khi CI xanh. Nếu agent có thể nới assertion, thêm skip hoặc sửa workflow trong cùng PR thì "CI xanh" mất ý nghĩa (reward hacking). PR do agent tạo đứng tên tài khoản của owner, nên GitHub không cho owner approve, và "Require review from Code Owners" sẽ chặn mọi PR chạm `tests/`. Bypass cho owner cũng là bypass cho agent vì cùng danh tính.

## Quyết định
- Workflow `.github/workflows/gate-guard.yml` dùng `pull_request_target`: workflow và `scripts/gate-guard*.cjs` luôn chạy theo bản trên `main`, PR không sửa được bộ kiểm tra đang phán xét nó. Job chỉ đọc danh sách file và diff qua API, không checkout hay chạy code của PR; token chỉ đọc.
- Báo khi: giảm số assertion trong file test (JS `expect`/`assert`, Python `self.assert*`, pgTAP), thêm `skip`/`only`/`fixme`/`todo`, thêm/đổi retry hoặc `failOnFlakyTests`, tăng timeout, xóa file test, bỏ spec khỏi `testMatch` hoặc file khỏi script `test:*`, xóa/sửa dòng của workflow có sẵn hoặc xóa workflow, sửa/xóa migration đã có, sửa chính gate-guard hoặc CODEOWNERS. Thêm test, thêm spec, thêm bước workflow, thêm migration mới không bị báo.
- Cho qua bằng label `gates-change`, chỉ owner gắn ([MERGE-02]).
- `.github/CODEOWNERS` chỉ để ghi nhận vùng nhạy cảm, chưa bật bắt buộc review.

## Đo trước khi áp dụng
Chạy bộ phát hiện trên toàn bộ 70 PR đã merge vào `main` (`node scripts/gate-guard.cjs --git <merge>^1 <merge>^2`):
- Quy tắc đầu tiên (mọi thay đổi workflow/`playwright.config.cjs` đều báo) báo 37/70 PR, gần như toàn bộ là thêm spec vào `testMatch` hoặc thêm bước CI. Đã thu hẹp.
- Bản hiện tại báo 6/70 (#13, #41, #42, #49, #50, #56), đều là thay đổi cổng thật đáng để người xem: sửa lệnh chạy CI, đổi `timeout-minutes`, thêm `failOnFlakyTests` (thay đổi làm chặt hơn cũng được báo, chấp nhận). Không PR nào bị báo vì giảm assertion hoặc thêm skip.
- Thử đầu-cuối: commit tạm xóa một `expect` và thêm `test.skip` vào `tests/auth.spec.cjs` → báo đúng `assertions-removed` và `skip-added`, exit 1.

## Giới hạn
- Heuristic trên diff, không chứng minh được tính đúng: sửa nội dung một assertion mà giữ nguyên số lượng thì không bị báo.
- Agent dùng danh tính owner nên về kỹ thuật vẫn gắn được label: cổng này **có dấu vết (tamper-evident), không chống được hoàn toàn (tamper-proof)**. Muốn chống hoàn toàn, agent cần tài khoản GitHub riêng, khi đó bật "Require review from Code Owners".
- Workflow chỉ có hiệu lực sau khi vào `main`. PR thêm nó không tự chạy gate-guard.

## Việc của owner sau khi merge
1. Settings → Rules → Rulesets: thêm required check `gate-guard` (nguồn GitHub Actions), hoặc import lại [`docs/admin/main-ruleset.json`](../admin/main-ruleset.json) (đã có `responsive`, `backend`, `gate-guard`).
2. Issues/PR → Labels: tạo label `gates-change`.
3. Kiểm tra: mở PR thử xóa một `expect` → `gate-guard` đỏ; gắn label → xanh. Rollback: gỡ `gate-guard` khỏi required checks hoặc tắt workflow trong Actions.
