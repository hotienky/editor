# Audit cơ chế load DOCX và lưu trữ của Kindy Editor

> Ngày đánh giá: 2026-08-24  
> Phạm vi: `DOCX → KindyDocumentState → CanvasEngine → DocumentApiAdapter`  
> Kết luận: dùng được cho **Kindy DOCX Compatibility Profile v2.2**, chưa tương đương bộ máy đọc/layout của Microsoft Word hoặc Google Docs và chưa được phép tuyên bố fidelity 100% với mọi OOXML.

## 1. Kết luận điều hành

Kindy hiện có đúng ranh giới kiến trúc cho một SDK Document Library:

```text
DOCX gốc
  → validate ZIP/OOXML
  → parse semantic OOXML
  → KindyDocumentState 2.0 (canonical)
  → ProseMirror transaction model
  → CanvasEngine layout/render/input
  → save revision JSON + store DOCX/PDF artifacts qua adapter
```

Các lỗi mất xuống hàng, giãn từng ký tự và mất header/footer khi autosave là lỗi bridge/state-sync, không phải lý do để thay canonical model. Các lỗi này đã được sửa và có regression test.

Tuy nhiên, kiến trúc hiện tại là **semantic import + dựng lại DOCX**, không phải chỉnh trực tiếp toàn bộ cây OOXML gốc. Sau khi tài liệu đã được sửa, serializer chỉ có thể giữ các feature đã được biểu diễn trong `KindyDocumentState`. Vì vậy:

- File vừa import, chưa sửa: có thể tải lại artifact gốc byte-for-byte.
- File đã sửa: chỉ cam kết các feature thuộc profile v2.2 và đã có golden test.
- `.doc` nhị phân cũ và `.docs` không phải định dạng được hỗ trợ; đầu vào chuẩn là `.docx` OOXML theo ISO/IEC 29500.

## 2. Audit cơ chế load

### 2.1 Các bước đang thực hiện

| Bước | Implementation hiện tại | Đánh giá |
|---|---|---|
| Nhận file | Chỉ nhận `.docx`/MIME WordprocessingML | Đúng phạm vi |
| An toàn ZIP | Giới hạn dung lượng nén/giải nén, số entry, media, compression ratio | Tốt; có test ZIP bomb |
| Xác nhận OOXML | Bắt buộc `[Content_Types].xml`, `word/document.xml`, content type Word | Tốt |
| Worker | Giải nén và Mammoth conversion trong Web Worker | Chưa hoàn toàn: parse semantic `DOMParser` vẫn chạy ở main thread sau khi worker trả parts |
| Semantic parser | Đọc trực tiếp paragraph/run/style/list/table/image/comment/track-change/section/header/footer | Đúng hướng; không dùng HTML làm canonical state trên browser |
| Canonical state | `KindyDocumentState { content, page, assets }` | Đúng ranh giới, nhưng schema validation/migration còn mỏng |
| Editor load | ProseMirror schema kiểm tra cây; bridge chuyển sang Canvas elements | Đúng hướng hybrid |
| Layout | Canvas phân trang/render; virtualize backing bitmap | Tốt cho viewport, chưa phải Word layout engine |
| Compatibility | `CompatibilityReport` theo profile | Có nền tảng, detection chưa bao phủ mọi OOXML part |

### 2.2 Các OOXML part được hiểu hiện tại

- `word/document.xml`
- `word/_rels/document.xml.rels`
- `word/styles.xml`
- `word/numbering.xml`
- `word/comments.xml`
- `word/commentsExtended.xml`
- `word/header*.xml`, `word/footer*.xml` và relationship tương ứng
- `word/media/*`

Các phần chưa có mô hình đầy đủ gồm theme/font table/settings, footnote/endnote, field phức tạp, content control, drawing anchor chính xác, chart/SmartArt/OLE, equation, macro, custom XML và nhiều rule pagination/layout đặc thù Word. Một số phần được cảnh báo/best-effort; một số chưa được detector liệt kê đầy đủ.

### 2.3 Vì sao chưa giống Word/Google Docs 1:1

1. Word dùng layout engine riêng với font metrics, kerning, line breaking, printer metrics và compatibility flags. Canvas hiện dùng metrics của browser/font đang có trên máy.
2. Font nhúng/theme/font substitution chưa được resolve thành một font registry ổn định. Thiếu đúng font sẽ đổi dòng và đổi trang.
3. Floating object hiện bị flatten thành inline; text wrapping/anchor không thể giữ nguyên.
4. Table pagination, keep-with-next, widow/orphan, field code, columns và nhiều section rule chưa đủ.
5. Export tạo một package OOXML mới; các part chưa có trong canonical state sẽ không tự xuất hiện lại.
6. Canonical semantic parse vẫn chạy trên main thread; file lớn/nhiều XML có thể tạo long task dù unzip đã ở worker.

### 2.4 Chuẩn load được phép công bố

Tên cam kết nên là **Kindy DOCX Compatibility Profile v2.2**, không phải “Word-compatible 100%”. Một feature chỉ được chuyển sang `Supported` khi có đủ:

1. fixture DOCX thực tế;
2. import assertion;
3. canonical JSON save/load assertion;
4. Canvas edit assertion;
5. export assertion với OOXML hợp lệ;
6. LibreOffice headless không repair;
7. kiểm tra thủ công Microsoft Word trước release.

## 3. Audit cơ chế lưu trữ

### 3.1 Ranh giới trách nhiệm

SDK không có database, user store, auth hay object storage. Hai adapter hiện có:

- `MemoryDocumentAdapter`: lưu `Map` trong RAM, chỉ dùng demo/test và mất khi reload.
- `RestDocumentAdapter`: truyền contract tới backend khách hàng; state đi JSON, file/artifact đi multipart.

Backend production phải tổ chức tối thiểu bốn nhóm dữ liệu:

| Nhóm | Nguồn dữ liệu | Nơi lưu khuyến nghị |
|---|---|---|
| Document metadata | title, fileName, folder, tags, current revision/version, capability | Database |
| Revision snapshot | toàn bộ `KindyDocumentState` bất biến | JSONB/document DB, có nén |
| Durable version | con trỏ tới revision được checkpoint | Database |
| Binary artifact | original DOCX, exported DOCX/PDF | S3/MinIO/object storage + checksum |

Comments và Track Changes thuộc canonical document schema nên hiện được lưu cùng revision JSON. UI state như panel đang mở, selection hoặc zoom không được lưu vào document.

### 3.2 Luồng import và save hiện tại

```text
Import
  Browser parse DOCX → state + compatibility report
  POST /documents/import: original file + metadata + state + report
  Backend tạo document + import revision + original-docx artifact

Edit/save
  Canvas mutation → ProseMirror transaction → KindyDocumentState
  PUT /documents/{id}/state
    state + baseRevisionId + reason + clientMutationId
  Backend compare-and-swap currentRevisionId
  200: revision mới | 409: VERSION_CONFLICT, autosave dừng

Export
  Chưa sửa: lấy original-docx artifact
  Đã sửa: serialize state → DOCX mới → tùy chọn store artifact
```

### 3.3 Các khoảng trống production cần xử lý

| Mức | Khoảng trống | Hậu quả | Hướng xử lý |
|---|---|---|---|
| P0 | Ảnh import đang nằm trong node dưới dạng data URL base64; `AssetReference` chưa có API upload/download asset riêng | State JSON rất lớn, autosave tốn băng thông/RAM, không phù hợp 100–200 trang nhiều ảnh | Thêm asset resolver/store; node chỉ giữ `assetId`, URL ký ngắn hạn chỉ dùng khi render |
| P0 | Giao dịch import gồm DB + object storage chưa được quy định atomic/idempotent | Có thể có document thiếu file hoặc object mồ côi | Outbox/saga, checksum, cleanup job, idempotency key |
| P0 | `clientMutationId` có trong contract nhưng Memory adapter và spec chưa bảo đảm replay idempotent | Retry có thể tạo revision trùng ở backend triển khai sai | Unique `(document_id, client_mutation_id)` và trả lại kết quả cũ |
| P0 | Restore không nhận `baseRevisionId` | Restore có thể ghi đè thay đổi vừa phát sinh | Compare-and-swap khi restore hoặc bắt buộc explicit force |
| P1 | Schema vẫn là `2.0` dù page/header/section được mở rộng; migration chỉ xử lý legacy tổng quát | Snapshot cũ/mới có thể khác nghĩa | Version tuần tự + validator + migration fixtures |
| P1 | OpenAPI dùng nhiều `additionalProperties` | Backend có thể chấp nhận state thiếu/sai mà không biết | JSON Schema đầy đủ cho node/mark/page + validation ở hai phía |
| P1 | Artifact API chưa có checksum/ETag bắt buộc và retention | Không phát hiện file hỏng/trùng, khó audit | SHA-256, object version, immutable key, retention policy |
| P1 | Compatibility report gắn import/artifact nhưng chưa gắn bất biến vào mọi revision | Không truy ra feature nào bị mất ở revision nào | Lưu report hoặc capability fingerprint theo revision/export |
| P2 | Autosave tạo revision nhưng Memory adapter chỉ tạo durable version khi manual save | Lịch sử audit phụ thuộc backend | Chốt policy revision retention và checkpoint rõ ràng |

## 4. Kiến trúc lưu trữ đích

```text
documents
  id, tenant_id, title, file_name,
  current_revision_id, current_version_id, original_artifact_id

document_revisions (immutable)
  id, document_id, base_revision_id,
  schema_version, state_json/compressed_state,
  client_mutation_id UNIQUE per document,
  reason, author_id, compatibility_fingerprint, created_at

document_versions
  id, document_id, revision_id, number, label, author_id, created_at

document_artifacts (immutable metadata)
  id, document_id, revision_id/version_id,
  kind, object_key, sha256, mime_type, size, created_at

document_assets (content-addressed)
  id/sha256, tenant_id, object_key, mime_type, size, metadata
```

State chỉ tham chiếu ảnh bằng `assetId`. Adapter/backend resolve asset thành URL/blob khi mở; URL ký không được coi là canonical vì sẽ hết hạn.

## 5. Thứ tự triển khai đề xuất

1. Khóa regression cho paragraph boundary, justify/distributed, header/footer save và comments/track changes.
2. Chuyển toàn bộ semantic OOXML parse sang worker; main thread chỉ nhận state/report đã serialize.
3. Thêm canonical schema validator và migration registry tuần tự.
4. Thiết kế `DocumentAssetAdapter` hoặc mở rộng adapter bằng `storeAsset/getAsset/resolveAsset`.
5. Bổ sung idempotency, checksum, atomic import và optimistic concurrency cho restore.
6. Mở rộng golden corpus theo từng OOXML part, không theo ảnh chụp riêng lẻ.
7. Chỉ sau khi corpus/SLA pass mới nâng capability matrix hoặc tuyên bố mức tương thích cao hơn.

## 6. Tiêu chí “sẵn sàng production”

- Không silent fallback thành tài liệu trắng khi schema không hợp lệ.
- Không mất body/header/footer/comment/track-change qua `open → edit → autosave → reload`.
- State không chứa binary base64 vượt ngưỡng cấu hình.
- Import/save/restore idempotent và không ghi đè revision mới hơn.
- Artifact có checksum, immutable object key và audit metadata.
- Corpus hợp đồng thực tế pass import/edit/export; Word/LibreOffice không yêu cầu repair.
- Benchmark riêng cho 20/100/200 trang, gồm tài liệu nhiều ảnh và bảng dài.

