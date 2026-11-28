# Decision records (ADR)

Lưu các quyết định của owner và quyết định kiến trúc **có hiệu lực lâu dài**, cùng các quy tắc đã bị thay. `AGENTS.md` chỉ chứa quy tắc đang hiệu lực và trỏ tới đây.

Quy ước:
- Tệp `NNNN-ten-ngan.md`, số tăng dần, không tái dùng.
- Mỗi tệp có các mục: **Trạng thái** (`active` / `superseded by ADR-NNNN`), **Ngày**, **Bối cảnh**, **Quyết định**, **Hệ quả**, và nếu có, **Quy tắc bị thay** (trích nguyên văn quy tắc cũ).
- Không sửa nội dung quyết định cũ; nếu đổi, tạo ADR mới và cập nhật trạng thái ADR cũ.
- Tệp mới phải được thêm vào bảng dưới; `tests/agent-harness.test.js` kiểm tra điều này.

| ADR | Tiêu đề | Trạng thái | Ngày |
|---|---|---|---|
| [0001](0001-v6-pilot-delegation.md) | Ủy quyền V6: Supabase Managed Free, CAS, agent chủ động quyết chi tiết | active (điều khoản "không tự merge" bị thay bởi 0003) | 29/10/2026 |
| [0002](0002-cloud-default.md) | Cloud là nguồn dữ liệu chính, chặn lưu khi chưa đăng nhập, mở đăng ký | active | 15/11/2026 |
| [0003](0003-auto-merge.md) | Agent được tự merge khi CI xanh | active | 25/11/2026 |
| [0004](0004-agent-rules-structure.md) | AGENTS.md V3: rule ID, decision records, sổ bài học | active | 25/11/2026 |
| [0005](0005-gate-guard.md) | Gate guard: cổng kiểm thử nằm ngoài tầm sửa của PR | active | 25/11/2026 |
| [0006](0006-video-analysis.md) | Phân tích video động tác: route thứ 9, xử lý trên thiết bị | active | 27/11/2026 |
| [0007](0007-video-analysis-store.md) | Kho số đo phân tích video: bảng và RPC riêng, ngoài log đồng bộ | active | 28/11/2026 |
