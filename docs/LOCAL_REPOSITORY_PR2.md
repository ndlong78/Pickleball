# PR2 — IndexedDB/repository/outbox local

Nền main `5d99168` (PR13 merge). Main backend/responsive và Pages cùng merge SHA thành công; chưa có staging SMTP/project. PR2 không cần cloud credentials.

## Phạm vi triển khai

`modules/data/local-repository.js` là module standalone vanilla JS, chưa được page-loader/shell tải và chưa thay nguồn dữ liệu của domain nào. Đây là nền persistence cho PR3/4, không rollout guest data mới lên cloud. Tám route, Auth flag off, localStorage/backup V5 và PWA cache/version5.2.0 giữ nguyên. Không có importer, network sender, tự claim guest hoặc signup sync. Module không đụng Auth tokens, localStorage hay network.

IDB `pickleup-v6`, schema1 tạo tám stores theo dictionary. `records/outbox/metadata` commit trong một transaction readwrite, chỉ trả `saved_locally` sau transaction complete. `localRevision` decimal string CAS chống lost update giữa tab; không dùng timestamp làm phiên bản. `baseRevision` server tách riêng, hiện mặc định0 cho row mới; PR4 sẽ bổ sung canonical hydration/ack/pull/cursor atomicity. Không coi localRevision là server revision.

Scope bắt buộc `guest:<installation UUID>` hoặc `user:<Auth UUID>`. Caller sở hữu UUID guest bền vững và lifecycle sau này; không tự sinh/ghi installation vào storage cũ. Guest viết device-only, không có outbox server. User ghi operation ID ổn định cùng record và local receipt. Retry cùng ID/request replay, khác request reject. Snapshot đầu vào clone trước await; giới hạn JSON256KiB/depth12 và từ chối trường credential. Domain validators/server constraints vẫn phải chạy khi domain được tích hợp; repository không tự suy attendance/level hoặc normalize payload.

Outbox operation đầu `pending`, sửa tiếp theo `deferred` phụ thuộc operation trước, expectedRevision=null tới khi predecessor ack. Payload không bị coalesce/mutate. PR4 mới bind revision cho deferred chưa gửi, claim/retry/backoff/ack/conflict; chưa có operation sending hay dữ liệu đã đồng bộ. Không gửi draft/deferred trực tiếp tới RPC. Tombstone local chỉ sống lại bằng restore rõ ràng, append events không sửa nội dung bằng put. Metadata receipt giữ suốt pilot, chưa GC.

Scope close hủy transactions và từ chối read/write muộn. Chuyển A→B phải close scopeA rồi tạo scopeB; pendingA vẫn nằm trong namespaceA. Auth adapter chưa bind tự động vì chưa có domain consumer. Tab reread có CAS local; IDB lease theo namespace serialize sender tương lai, không dựa lease client làm security. Không có broadcaster/sender consumer trong PR2.

`device_state` chỉ timer/checklist/focus theo namespace+deviceUUID. Không sync timer. Stores conflicts/cursor/import_receipts/legacy_snapshots được dành sẵn, chưa mở API import/export/resolve để không giả có sync engine.

## Lỗi và upgrade

Quota/storage unavailable/upgrade blocked/scope closed/local conflict có error.code, không trả saved thành công. Không fallback ghi V5 hoặc xóa dữ liệu để tránh quota. UI consumer tương lai phải hiển thị lỗi/retry và rescue export trước khi chuyển domain. PR3 bổ sung export đủ18 keys; hiện backup V5 chưa chứa IDB nên module chưa được bật cho người dùng.

versionchange đóng scope/connection; upgrade blocked từ chối mở và callback, không deleteDatabase/reset. Interrupted upgrade rollback schema/data theo transaction native. Schema mới tương lai phải có forward migration tường minh, không đổi VERSION đơn lẻ vì schema1 initializer chưa có nhánh migration2.

## Kiểm thử và giới hạn

Unit dùng fake-indexeddb: atomic rollback khi inject QuotaExceededError sau put, replay/hash mismatch, multiconnection CAS, deferred operation, A/B/guest isolation, stale scope, lease expiry, tombstone/restore, credential validation, interrupted version upgrade. Đây là mock IDB, không bằng chứng durability browser.

`tests/data-repository.spec.cjs` chạy Chromium/WebKit với IndexedDB thật dưới `/Pickleball/`: offline/reopen/reload, legacy key giữ nguyên, race hai tabs, namespace isolation, quota exception injection rollback native và upgrade abort giữ pending. Quota được inject deterministic, không phải đo quota/eviction vật lý hoặc browser crash/power-loss. Commit complete không hứa chống mất điện/OS eviction; chưa QA iPhone/iPad/Android thật. Không có domain UI hoặc rollout trong PR2.

Chạy `npm run test:unit`, `npm run test:responsive`; backend CI giữ pgTAP/REST/Auth local thật hiện hữu. Kết quả exact HEAD và flaky ghi trong PR.
