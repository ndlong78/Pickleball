<!-- Mẫu theo AGENTS.md [REPORT-02]. Xóa phần không áp dụng, không xóa tiêu đề. -->

## Bằng chứng lỗi / nhu cầu
<!-- Link Actions run, log, commit, issue, rule ID trong AGENTS.md hoặc LL-NNN. -->

## Nguyên nhân gốc
<!-- Cơ chế thật. Với tính năng mới: vấn đề người dùng cần giải quyết. -->

## Thay đổi và phạm vi
<!-- Files/modules chạm tới. Nêu rõ nếu chạm: dữ liệu/18 khóa localStorage, IndexedDB, SQL/RLS/RPC, Auth, PWA cache, tests/workflows. -->

## Dự đoán tác động
- Lỗi/nhu cầu được giải quyết:
- Chỗ có thể hồi quy:
- Có sửa assertion/timeout/retry/skip test cũ không? (không / có — lý do, theo [CI-03])

## Evidence (đúng HEAD SHA)
- HEAD SHA:
- Unit: pass / fail
- Browser Chromium + WebKit: pass / fail / flaky
- Backend (nếu chạy): pgTAP / REST
- Dữ liệu cũ/lỗi đã thử:
- Version/PWA cache: bump / không bump (lý do)
- QA thiết bị thật: chưa / có (thiết bị)

## Merge
- [ ] Tự merge được theo [MERGE-01]
- [ ] Cần owner trước khi merge theo [MERGE-02] (ghi việc owner phải làm)

## Bài học
<!-- Có thêm LL-NNN vào docs/LESSONS_LEARNED.md không? Vì sao. -->
