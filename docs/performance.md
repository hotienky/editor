# Hiệu năng và tài liệu dài

## Trạng thái v2.0

Kindy v2.0 import DOCX trong Web Worker, nhưng editing surface vẫn là một ProseMirror instance liên tục. Toàn bộ node của document được gắn vào DOM. Automatic pagination chạy sau debounce, cache chiều cao theo DOM node và chỉ invalid block thuộc vùng transaction; `ResizeObserver` và font loading sẽ invalid cache khi layout thật sự đổi.

Vì vậy thư viện chưa cam kết mọi tài liệu 100–200 trang luôn mượt. Độ phức tạp phụ thuộc số node, bảng, ảnh, comment và tracked change nhiều hơn số trang hiển thị.

## Chi phí chính

1. **Mount editor:** ProseMirror tạo DOM cho toàn bộ document.
2. **Pagination:** lần đầu phải đo tất cả top-level block. Các lần sau vẫn duyệt block metadata O(N), nhưng chỉ đọc layout DOM cho block mới/thay đổi. Engine chừa đúng khoảng trắng còn lại, lề dưới, page gap và lề trên trước block của trang kế tiếp.
3. **Review UI:** suggestions cần thu thập tracked change trong document.
4. **Autosave:** workspace gom update trong `stateSyncDelay` (mặc định 300ms), sau đó canonical state được clone và serialize để gửi adapter. Autosave mặc định của client là 30 giây; ứng dụng không nên đặt chu kỳ 1–2 giây cho tài liệu dài.
5. **Ảnh/bảng:** ảnh editor dùng `loading="lazy"`; import giới hạn mặc định 20MB mỗi media và 100MB tổng media trước khi chuyển thành data URL. Decoding ảnh và layout bảng vẫn có thể tạo long task trên main thread. Bảng cao hơn một trang được giữ liên tục trong editing surface; engine đếm page span nhưng không tách DOM table thành nhiều ProseMirror node.

Module `VirtualScroller` trong codebase là performance primitive, chưa được nối trực tiếp vào editable ProseMirror DOM. Không nên gỡ các node ngoài viewport một cách cơ học vì sẽ phá selection, IME, history, decoration và mapping transaction.

## Ngân sách khuyến nghị

Đây là mục tiêu nghiệm thu cho hệ thống tích hợp, không phải số liệu Kindy hiện đã bảo đảm:

| Chỉ số | Mục tiêu đề xuất |
|---|---:|
| Mở JSON 100 trang text cơ bản | ≤ 3 giây trên máy chuẩn dự án |
| Import DOCX 100 trang | ≤ 8 giây, UI không treo liên tục |
| Typing latency p95 | ≤ 50 ms |
| Pagination sau khi dừng gõ | ≤ 500 ms |
| Autosave không chặn input | Không có long task > 100 ms do save |
| Scroll | Không có blank page/nhảy layout nghiêm trọng |
| Peak memory | Đặt theo corpus và thiết bị mục tiêu |

Máy chuẩn, browser version, font và dataset phải được ghi trong báo cáo benchmark.

## Corpus test

Tối thiểu cần năm nhóm fixture:

- 100 trang text/heading/list.
- 100 trang có bảng hợp đồng và merge cell.
- 100 trang có ảnh/logo/con dấu.
- 100 trang có comment/Track Changes.
- 200 trang mixed content để stress test.

Mỗi fixture cần đo:

```text
importStart → importComplete
openStart → editorReady
firstInput → nextPaint
transaction → paginationComplete
changed → saveStarted → saved
heapBefore → heapAfterOpen → heapAfterClose
```

Không dùng một paragraph cực dài thay cho tài liệu thật; pagination hiện tính theo top-level block nên fixture phải có cấu trúc tương tự hợp đồng thực tế.

## Cách chạy kiểm thử

Repository hiện có regression/unit test:

```bash
npm test
npm run test:e2e
npm run typecheck
npm run build
npm run benchmark:long-doc
npm run benchmark:ci
```

`benchmark:ci` áp synthetic budget và ghi `.artifacts/long-document.json`.
`test:e2e` build demo production, chạy Chromium cho luồng workspace và ghi
`.artifacts/browser-performance-text.json` cùng
`.artifacts/browser-performance-mixed.json`. Workflow CI upload các file này
làm regression artifact; Node benchmark không được dùng thay DOM/paint benchmark.

Mở benchmark UI bằng:

```text
http://127.0.0.1:9000/kindy-editor?benchmarkPages=100
http://127.0.0.1:9000/kindy-editor?benchmarkPages=200
http://127.0.0.1:9000/kindy-editor?benchmarkPages=100&benchmarkVariant=table
http://127.0.0.1:9000/kindy-editor?benchmarkPages=100&benchmarkVariant=image
http://127.0.0.1:9000/kindy-editor?benchmarkPages=100&benchmarkVariant=review
http://127.0.0.1:9000/kindy-editor?benchmarkPages=100&benchmarkVariant=mixed
http://127.0.0.1:9000/kindy-editor?benchmarkPages=100&benchmarkVariant=section
```

### Baseline cục bộ ngày 22/08/2026

Production preview, Google Chrome 151, MacBook Pro Apple M2 8-core/24GB,
viewport 1600×1000, 40 input samples, autosave tắt trong benchmark:

| Corpus | Top-level block | Bảng | Ảnh | Editor ready | Typing median | Typing p95 | Typing max | Pagination cached | Kết quả budget |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 trang text | 999 | 0 | 0 | 490,3 ms | 12,2 ms | 21,5 ms | 26,7 ms | 2,8 ms | Pass ≤ 3s / 50ms |
| 100 trang mixed | 1.101 | 50 | 100 | 849,7 ms | 29,2 ms | 36,5 ms | 89,9 ms | 3,7 ms | Pass guardrail 75ms |

Mixed có một spike 89,9ms; p95 vẫn 36,5ms và 39 mẫu còn lại chủ yếu dưới 37ms.
Số liệu JSON được sinh bởi Playwright thay vì chép tay. Baseline development
bên dưới được giữ để thấy ảnh hưởng của build mode, không dùng làm gate phát hành.

Corpus text semantic, Chromium trong Codex desktop, Vite development mode:

| Corpus | Top-level block | Editor ready | Typing median | Typing p95 | Pagination cached |
|---|---:|---:|---:|---:|---:|
| 100 trang | 999 | 0,59–0,67 s | 18,5 ms | 33,3 ms | khoảng 2,5 ms |
| 200 trang | 1.999 | 0,90 s | 26,0 ms | 38,9 ms | khoảng 3,4 ms |

Corpus mixed semantic (bảng 4x4 xen kẽ, ảnh inline, comment/Track Changes),
autosave tắt để phép đo không lẫn network/storage và vẫn chạy bằng Vite development:

| Corpus | Top-level block | Bảng | Ảnh | Editor ready | Typing median | Typing p95 | Pagination cached |
|---|---:|---:|---:|---:|---:|---:|---:|
| 100 trang mixed | 1.101 | 50 | 100 | 1,03–1,29 s | 33,0–41,3 ms | 36,1–56,6 ms | khoảng 3,3–5,1 ms |
| 200 trang mixed | 2.201 | 100 | 200 | 1,39 s | 69,5 ms | 85,1 ms | khoảng 11 ms |

Kết luận hiện tại: production harness xác nhận target 100 trang text và guardrail
100 trang mixed trên máy chuẩn cục bộ. Kết quả development từng dao động quá 50ms,
vì vậy không suy rộng thành SLA cho mọi thiết bị. Corpus 200 trang mixed không đạt
và vẫn là stress limit, không được quảng bá là SLA.

Có spike p99 khoảng 184–391ms trong lần đo này. Kết quả chỉ là baseline text,
không phải SLA cho DOCX có bảng lớn, ảnh, comment hoặc Track Changes. Benchmark
Node riêng với fixture hiện tại đo state khoảng 328KB/657KB: clone p95 lần
lượt khoảng 2,23/4,88ms và stringify p95 khoảng 0,82/2,79ms; đây không bao gồm DOM/paint.

Benchmark trình duyệt nên chạy riêng bằng Chromium cố định trong CI và ghi kết quả JSON artifact. Không đặt threshold quá chặt trên shared CI runner; dùng dedicated runner hoặc so sánh regression theo baseline.

## Hướng tối ưu tiếp theo

Thứ tự ưu tiên:

1. Chuyển bước tính page assignment O(N) sang incremental index sau khi measurement cache đã ổn định.
2. Cache/index tracked changes và chỉ cập nhật range bị thay đổi.
3. Chuyển clone/hash/serialization autosave nặng sang Worker khi browser hỗ trợ.
4. Lazy decode ảnh và giới hạn kích thước ảnh import.
5. Giảm decoration/node view không cần thiết ngoài viewport.
6. Chỉ sau khi có benchmark, thiết kế viewport rendering tương thích ProseMirror thay vì dùng virtual scroller prototype trực tiếp.

## Checklist trước production

- Chạy corpus của chính hệ thống tích hợp, không chỉ fixture nhỏ của SDK.
- Đo cả laptop cấu hình thấp nếu đó là thiết bị người dùng.
- Cài đúng font tiếng Việt trước khi so layout.
- Test với DevTools đóng và production build.
- Test autosave qua mạng có latency/loss thực tế.
- Test mở/đóng nhiều document để phát hiện listener hoặc DOM leak.
- Không công bố “hỗ trợ 200 trang” nếu chưa có threshold pass trong CI.
