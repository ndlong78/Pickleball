# ADR-0004 — AGENTS.md V3: rule ID, decision records, sổ bài học

**Trạng thái:** active.
**Ngày:** 25/11/2026.

## Bối cảnh
AGENTS.md V2 (~12,9 KB) được vá chồng nhiều lần; quy tắc cũ và quyết định mới cùng tồn tại (ví dụ "không cloud sync" bên cạnh "cloud là nguồn chính", "không tự merge" bên cạnh "được tự merge"). Agent phải tự đoán câu nào còn hiệu lực. Cách tổ chức mới áp dụng ý tưởng từ *Harness Engineering for Self-Improvement* (Lilian Weng, 07/2026): context dạng mục rời có ID được cập nhật từng mục thay vì viết lại cả khối (ACE), bộ nhớ bền trong file, và bộ kiểm tra nằm ngoài phạm vi agent tự nới.

## Quyết định
- `AGENTS.md` chỉ chứa quy tắc đang hiệu lực, mỗi quy tắc một ID `[NHÓM-NN]`.
- Quyết định owner và quy tắc bị thay nằm trong `docs/decisions/`.
- Bài học từ lỗi thật nằm trong [`LESSONS_LEARNED.md`](../LESSONS_LEARNED.md) theo mẫu cố định.
- PR dùng `.github/pull_request_template.md`: bằng chứng → nguyên nhân gốc → phạm vi → dự đoán tác động → evidence.
- `tests/agent-harness.test.js` kiểm tra: ID không trùng, link nội bộ tồn tại, ADR được liệt kê, mục bài học đủ trường, mọi unit test có trong `npm run test:unit`.

## Hệ quả
Sửa quy tắc là sửa từng mục. Không đổi hành vi ứng dụng; không bump version/PWA cache. Việc còn lại cần owner: CODEOWNERS/ruleset cho `tests/**`, `.github/workflows/**`, `supabase/**` để cổng kiểm thử nằm ngoài tầm sửa của agent.
