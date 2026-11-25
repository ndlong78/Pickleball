# ADR-0001 — Ủy quyền V6 (pilot Supabase)

**Trạng thái:** active; điều khoản "không tự merge" bị thay bởi [ADR-0003](0003-auto-merge.md); các điều khoản "guest vẫn hoạt động", "không public signup" bị thay bởi [ADR-0002](0002-cloud-default.md).
**Ngày:** 29/10/2026 (PR0 #10, policy #11).

## Bối cảnh
PickleUp là PWA tĩnh lưu dữ liệu trong `localStorage`. V6 thiết kế đồng bộ tài khoản bằng Supabase PostgreSQL/Auth/RLS và IndexedDB. Chi tiết: [`PILOT_OPERATING_POLICY.md`](../PILOT_OPERATING_POLICY.md), [`ARCHITECTURE_V6_DATABASE.md`](../ARCHITECTURE_V6_DATABASE.md).

## Quyết định
- Owner duyệt Supabase Managed Free và CAS toàn entity.
- Agent (Codex/Claude) chủ động quyết Auth (email OTP), backup, retention, xóa tài khoản và các lựa chọn kỹ thuật trong hợp đồng dữ liệu; thực hiện theo các PR trong policy; không hỏi duyệt lại.
- Ngân sách tự động 0 USD. Ủy quyền không tạo credentials hay automation chưa được cấu hình.

## Hệ quả
Hiện hành trong `AGENTS.md`: [FLOW-07], [DATA-07]–[DATA-09], [SEC-03].

## Quy tắc bị thay (trích AGENTS.md V2)
- "**Static HTML/CSS/vanilla JS**; không backend, tài khoản, cloud sync, React/Vue/TypeScript/database hoặc viết lại toàn bộ nếu chưa được phê duyệt. **PR0 V6 chỉ cho phép thiết kế tài liệu** về Supabase PostgreSQL/Auth/RLS và IndexedDB; không phải quyền tạo project, dùng secrets hoặc triển khai. Trước PR1 đọc […]; owner phải chốt các quyết định trước PR1 trong kiến trúc. Mỗi PR sau được giao và cấp phạm vi riêng; giữ frontend và tám route." → thay bằng [ARCH-01], [DOC-04].
- "Khi V6 được cấp phạm vi triển khai: guest vẫn hoạt động; […]" → thay bằng [DATA-01], [DATA-04] theo ADR-0002.
- "Giữ không tự merge, ngân sách tự động0, không production DB/secrets cho tác vụ hiện tại." → ngân sách giữ ở [FLOW-07], production ở [SEC-03], merge thay bằng ADR-0003.
