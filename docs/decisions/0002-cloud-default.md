# ADR-0002 — Cloud là nguồn dữ liệu chính

**Trạng thái:** active. Đã cài đặt đủ lộ trình A1, A2, C, B, D (V5.31.0–V5.35.0); V5.36.0 thêm tự xóa tài khoản và sao lưu mã hóa.
**Ngày:** 15/11/2026. Kế hoạch: [`CLOUD_DEFAULT_PLAN.md`](../CLOUD_DEFAULT_PLAN.md).

## Quyết định của owner
1. Chưa đăng nhập thì không lưu được; khách vẫn xem nội dung.
2. Dữ liệu cũ trên máy được **mời** nhập vào tài khoản, có xem trước và xác nhận; không tự nhập.
3. Mở đăng ký cho mọi người; project Supabase hiện tại chứa dữ liệu thật.

## Giữ nguyên
Không xóa/đổi 18 khóa `localStorage` cũ; vẫn có cache IndexedDB để chạy offline; không last-write-wins âm thầm; Auth/RLS/CAS là ranh giới thật; test/CI không bao giờ dùng project thật; host không có Auth giữ hành vi thiết bị.

## Hệ quả
Hiện hành trong `AGENTS.md`: [DATA-01]–[DATA-05], [DATA-10]. Việc owner còn phải làm: [`ACCOUNT_OPERATIONS.md`](../ACCOUNT_OPERATIONS.md) và mục "Owner cần làm" của `RELEASE_V5.36.0.md`.

## Quy tắc bị thay (trích AGENTS.md V2)
- "guest vẫn hoạt động", "không tài khoản/cloud sync", "không public signup" → [DATA-01]–[DATA-04].
