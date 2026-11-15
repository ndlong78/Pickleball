# V5.29.1 — Rà soát nội bộ 40 bài 4.0–5.0 và sửa 6 bài

## Thay đổi
- Theo yêu cầu owner (15/11/2026), 40 bài `PU-081…120` được rà soát **không qua HLV người**: Claude đọc từng bài theo bốn tiêu chí (an toàn, luật/kỹ thuật, mốc /20, rõ ràng). Kết quả: [docs/CONTENT_REVIEW_4_0_5_0.md](docs/CONTENT_REVIEW_4_0_5_0.md).
- Sửa 6 bài (revision +1, **mốc /20 và `assessmentVersion` giữ nguyên** nên điểm đã lưu vẫn so sánh được): `PU-097` (luật Erne: bật và đáp ngoài kitchen, bỏ bài tập nhảy qua góc kitchen), `PU-098` (người điều phối thay vì chỉ HLV), `PU-109` (câu về vạch kitchen), `PU-087/089/094` (nhắc kính bảo hộ, không nhắm đầu/mặt).
- Ghi chú trang HLV: "đã rà soát nội bộ (không có HLV người)".

## Giới hạn
Đây là rà soát trên văn bản của Claude, **không phải đánh giá của HLV có chứng chỉ và không thay thế thử trên sân**; mốc đạt vẫn là đề xuất nội bộ, không phải DUPR.

## Tương thích
Không đổi dữ liệu, SQL, khóa localStorage. App/assets/PWA `5.29.1` (`pickleup-shell-v5-29-1-stable`); test nâng cấp xóa cache 5.29.0.
