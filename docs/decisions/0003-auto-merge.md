# ADR-0003 — Agent được tự merge khi CI xanh

**Trạng thái:** active.
**Ngày:** 25/11/2026. Owner xác nhận trong phiên làm việc: "Được tự merge khi CI xanh".

## Bối cảnh
AGENTS.md V2 chứa hai câu trái nhau: quyết định 15/11 nói owner đã cho phép tự merge khi CI xanh, trong khi đoạn ủy quyền 29/10 và nhiều tài liệu PR cũ ghi "không tự merge". Quyết định này chốt lại.

## Quyết định
Agent được merge PR của mình khi mọi workflow của PR thành công đúng HEAD SHA, không fail/flaky, không còn blocker, merge bằng expected HEAD SHA. Ngoại lệ (vẫn cần owner): PR phụ thuộc thao tác của owner trên project thật mà thiếu nó production sẽ hỏng; PR làm yếu cổng kiểm thử; người dùng của nhiệm vụ yêu cầu không merge.

## Hệ quả
Hiện hành trong `AGENTS.md`: [MERGE-01]–[MERGE-03]. Merge vào `main` deploy production qua Cloudflare, nên kiểm tra sau merge là bắt buộc. Các câu "không tự merge" trong `docs/*_PR*.md`, `docs/V6_PROGRESS_REVIEW.md`, `docs/POSTMERGE_V5_17.md`, `RELEASE_V*.md`, `ROADMAP.md` là lịch sử.

## Quy tắc bị thay
- AGENTS.md V2 (ủy quyền 29/10): "Giữ không tự merge".
- AGENTS.md V2 (CI backend): "Yêu cầu 'không tự merge' của nhiệm vụ hiện hành luôn ưu tiên quy trình merge tổng quát ở trên." → giữ ý nghĩa trong [MERGE-02].
- `PILOT_OPERATING_POLICY.md` §1: "Giữ yêu cầu **không tự merge**."
