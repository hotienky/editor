# Specification: Chuẩn xử lý tài liệu tương thích Microsoft Word

**Phiên bản:** 2.1  
**Ngày:** 2026-08-25  
**Trạng thái:** Draft  

---

## Mục lục

1. [Mục tiêu và phạm vi](#1-mục-tiêu-và-phạm-vi)
2. [Điều tài liệu này KHÔNG tuyên bố](#2-điều-tài-liệu-này-không-tuyên-bố)
3. [Hiện trạng hệ thống](#3-hiện-trạng-hệ-thống)
4. [Compatibility Contract](#4-compatibility-contract)
5. [Test Methodology](#5-test-methodology)
6. [Kiến trúc pipeline](#6-kiến-trúc-pipeline)
7. [Chi tiết kỹ thuật OOXML](#7-chi-tiết-kỹ-thuật-ooxml)
8. [Định hướng tiếp theo](#8-định-hướng-tiếp-theo)
9. [KPI và tiêu chí hoàn thành](#9-kpi-và-tiêu-chí-hoàn-thành)
10. [Glossary](#10-glossary)
11. [Nguồn tham khảo](#11-nguồn-tham-khảo)

---

## 1. Mục tiêu và phạm vi

### 1.1 Mục tiêu

Xây dựng một **chuẩn xử lý tài liệu thống nhất** dựa trên OOXML/DOCX của Microsoft, đảm bảo toàn bộ luồng **Upload → Hiển thị → Chỉnh sửa → Comment → Export** hoạt động ổn định và có độ trung thực cao so với Microsoft Word.

### 1.2 Nguyên tắc cốt lõi

| # | Nguyên tắc | Mô tả |
|---|-----------|-------|
| 1 | **Tính nhất quán** | Một chuẩn xử lý duy nhất — OOXML/DOCX — cho toàn bộ pipeline |
| 2 | **Tính bảo toàn** | File DOCX giữ nguyên khả năng mở và chỉnh sửa trên Microsoft Word |
| 3 | **Tính dự đoán** | Mỗi phần tử tài liệu có một và chỉ một cách xử lý |
| 4 | **Tính minh bạch** | Báo cáo rõ ràng những gì hỗ trợ, những gì chưa hỗ trợ |
| 5 | **Tính trung thực** | Không tuyên bố hỗ trợ/hoàn thiện khi chưa có test evidence |

### 1.3 Phạm vi áp dụng

- **Áp dụng cho:**_kindy-editor — Document Editor SDK dựa trên Tiptap/ProseMirror
- **Standard:** OOXML (ECMA-376 / ISO 295000)
- **Reference:** Microsoft Word (Office 365 / Word for Web)

---

## 2. Điều tài liệu này KHÔNG tuyên bố

> Đây là phần quan trọng nhất để tránh hiểu lầm.

Tài liệu này **KHÔNG** tuyên bố:

1. ❌ Hệ thống đã đạt 100% nền tảng cốt lõi của Microsoft Word
2. ❌ Tất cả tính năng văn phòng đều vận hành trơn tru và chính xác như Word
3. ❌ File DOCX export ra sẽ luôn giống Word ở mọi trường hợp
4. ❌ PDF export có fidelity tương đương Word PDF
5. ❌ Mọi DOCX complex đều xử lý được không lỗi

Tài liệu này **CHỈ** tuyên bố:

1. ✅ Kiến trúc nền tảng Document Engine đã xây dựng (Parser → Model → Layout → Rendering → Serialization)
2. ✅ Một số chức năng core đã có implementation
3. ✅ Còn nhiều chức năng cần validation trước khi khẳng định hoạt động đúng
4. ✅ Cần bộ test suite chứng minh fidelity thay vì tuyên bố miệng

---

## 3. Hiện trạng hệ thống

### 3.1 Architecture Compliance — Nền tảng đã xây dựng

Hệ thống đã hoàn thiện phần lớn kiến trúc nền tảng Document Engine:

| Thành phần | Trạng thái | Chi tiết |
|------------|-----------|---------|
| OOXML Parser | ✅ | ZIP extraction, content types, relationships, DOM parsing |
| Document AST / Model | ✅ | ProseMirror JSON, `KindyDocumentState` |
| Style Resolver | ✅ | `parseDocxStyles()`, `basedOn` chain, `docDefaults` |
| Layout Engine | ✅ | `LayoutEngine`, `DomDocumentLayoutService`, pagination |
| Painter / Rendering | ✅ | ProseMirror rendering, CSS-based page layout |
| DOCX Import | ✅ | Native OOXML parsing + Mammoth fallback |
| DOCX Export | ✅ | `docx.js` library serialization |

> **Nhận xét:** Đây là nền tảng cần thiết để đạt mức tương thích Microsoft Word. Tuy nhiên, **nền tảng có ≠ chức năng hoạt động đúng**. Mỗi thành phần cần được validate với test cases cụ thể.

### 3.2 Feature Compliance — Phân tích từng chức năng

> **Ghi chú:** Mỗi chức năng được đánh giá theo 5维度: Import, Export, Rendering, Round-trip, Fidelity. "Có implementation" không đồng nghĩa "hoạt động đúng như Word".

#### Nhóm A: Core Text & Paragraph

| Chức năng | Import | Export | Rendering | Round-trip | Fidelity | Ghi chú |
|-----------|--------|--------|-----------|------------|----------|---------|
| Text formatting | ✅ | ✅ | ✅ | 🟡 | ❌ | Bold/italic/underline/strike. Chưa test fidelity |
| Paragraph formatting | ✅ | ✅ | ✅ | 🟡 | ❌ | Alignment, spacing, indent. Chưa test fidelity |
| Heading 1–6 | ✅ | ✅ | ✅ | 🟡 | ❌ | Heading styles. Chưa test fidelity |
| Font family/size | ✅ | ✅ | ✅ | 🟡 | ❌ | w:rFonts, w:sz. Chưa test cross-platform |
| Font color | ✅ | ✅ | ✅ | 🟡 | ❌ | w:color. Chưa test theme colors |
| Background/shading | ✅ | ✅ | ✅ | 🟡 | ❌ | w:shd, w:highlight |
| Subscript/Superscript | ✅ | ✅ | ✅ | 🟡 | ❌ | w:vertAlign |
| Tab stops | ✅ | ✅ | ✅ | 🟡 | ❌ | w:tabs, w:tab với leader types |

#### Nhóm B: Lists

| Chức năng | Import | Export | Rendering | Round-trip | Fidelity | Ghi chú |
|-----------|--------|--------|-----------|------------|----------|---------|
| Bullet lists | ✅ | ✅ | ✅ | 🟡 | ❌ | w:numPr, w:abstractNum |
| Numbered lists | ✅ | ✅ | ✅ | 🟡 | ❌ | w:numPr, w:abstractNum |
| Nested lists | ✅ | ✅ | ✅ | 🟡 | ❌ | Up to 9 levels |
| Task lists | ✅ | ✅ | ✅ | 🟡 | ❌ | Editor extension |

#### Nhóm C: Table

| Chức năng | Import | Export | Rendering | Round-trip | Fidelity | Ghi chú |
|-----------|--------|--------|-----------|------------|----------|---------|
| Basic table | ✅ | ✅ | ✅ | 🟡 | ❌ | w:tbl, w:tr, w:tc |
| Column span (gridSpan) | ✅ | ✅ | ✅ | 🟡 | ❌ | |
| Row span (vMerge) | ✅ | ✅ | ✅ | 🟡 | ❌ | restart/continue |
| Cell width | ✅ | ✅ | ✅ | 🟡 | ❌ | w:tcW, DXA/twip |
| Cell shading | ✅ | ✅ | ✅ | 🟡 | ❌ | w:shd |
| Vertical align | ✅ | ✅ | ✅ | 🟡 | ❌ | w:vAlign |
| Header row | ✅ | ✅ | ✅ | 🟡 | ❌ | w:tblHeader |
| Table grid | ✅ | ✅ | ✅ | 🟡 | ❌ | w:tblGrid, w:gridCol |
| Table borders | ❌ | ❌ | ❌ | ❌ | ❌ | w:tblBorders, w:tcBorders chưa xử lý |
| Preferred width | ❌ | ❌ | ❌ | ❌ | ❌ | w:tblW type="dxa"/"pct" |
| Auto-fit | ❌ | ❌ | ❌ | ❌ | ❌ | w:tblLayout |
| Row height | ❌ | ❌ | ❌ | ❌ | ❌ | w:trHeight |
| Cell margins | ❌ | ❌ | ❌ | ❌ | ❌ | w:tcMar |
| Nested tables | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Table page split | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Table positioning | ❌ | ❌ | ❌ | ❌ | ❌ | w:tblpPr |

#### Nhóm D: Image

| Chức năng | Import | Export | Rendering | Round-trip | Fidelity | Ghi chú |
|-----------|--------|--------|-----------|------------|----------|---------|
| Inline image | ✅ | ✅ | ✅ | 🟡 | ❌ | w:drawing, wp:inline, a:blip |
| Block image | ✅ | ✅ | ✅ | 🟡 | ❌ | Figure with figcaption |
| Image dimensions | ✅ | ✅ | ✅ | 🟡 | ❌ | wp:extent |
| Image format (PNG/JPG) | ✅ | ✅ | ✅ | 🟡 | ❌ | |
| Image format (SVG/WebP) | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | Best effort |
| Floating image | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | Flattened to inline + warning |
| Anchor positioning | ❌ | ❌ | ❌ | ❌ | ❌ | wp:anchor, wp:positionH/V |
| Text wrapping | ❌ | ❌ | ❌ | ❌ | ❌ | wp:wrapText |
| Crop | ❌ | ❌ | ❌ | ❌ | ❌ | a:srcRect |
| Image relationship | ✅ | ✅ | — | 🟡 | ❌ | r:embed, r:link |
| Broken/missing image | ⚠️ | — | ⚠️ | — | — | Placeholder display |

#### Nhóm E: Section & Page Layout

| Chức năng | Import | Export | Rendering | Round-trip | Fidelity | Ghi chú |
|-----------|--------|--------|-----------|------------|----------|---------|
| Page size | ✅ | ✅ | ✅ | 🟡 | ❌ | w:pgSz |
| Page margins | ✅ | ✅ | ✅ | 🟡 | ❌ | w:pgMar |
| Page orientation | ✅ | ✅ | ✅ | 🟡 | ❌ | portrait/landscape |
| Section breaks | ✅ | ✅ | ✅ | 🟡 | ❌ | nextPage, continuous, even/odd |
| Per-section geometry | ✅ | ✅ | ✅ | 🟡 | ❌ | Different size/margin per section |
| Different first page | ✅ | ✅ | ✅ | 🟡 | ❌ | w:titlePg |
| Odd/even pages | ✅ | ✅ | ✅ | 🟡 | ❌ | |
| Page number start | ✅ | ✅ | ✅ | 🟡 | ❌ | w:pgNumType |
| Pagination (auto) | ✅ | — | ✅ | — | ❌ | Layout engine computation |
| Keep next | ✅ | ✅ | ✅ | 🟡 | ❌ | w:keepNext |
| Keep lines | ✅ | ✅ | ✅ | 🟡 | ❌ | w:keepLines |
| Widow/Orphan | ✅ | — | ✅ | — | ❌ | Layout engine |
| Page break before | ✅ | ✅ | ✅ | 🟡 | ❌ | w:pageBreakBefore |

#### Nhóm F: Header/Footer

| Chức năng | Import | Export | Rendering | Round-trip | Fidelity | Ghi chú |
|-----------|--------|--------|-----------|------------|----------|---------|
| Default header/footer | ✅ | ✅ | ✅ | 🟡 | ❌ | w:headerReference/w:footerReference |
| First page header/footer | ✅ | ✅ | ✅ | 🟡 | ❌ | |
| Even page header/footer | ✅ | ✅ | ✅ | 🟡 | ❌ | |
| Header/footer images | ✅ | ✅ | ✅ | 🟡 | ❌ | |
| Header/footer text styling | ✅ | ✅ | ✅ | 🟡 | ❌ | Font, size, color, alignment |
| Layout modes (banner/split) | ✅ | ✅ | ✅ | 🟡 | ❌ | Editor-specific |

#### Nhóm G: Comments

| Chức năng | Import | Export | Rendering | Round-trip | Fidelity | Ghi chú |
|-----------|--------|--------|-----------|------------|----------|---------|
| Comment definition | ✅ | ✅ | — | 🟡 | ❌ | w:comment trong comments.xml |
| Comment range | ✅ | ✅ | ✅ | 🟡 | ❌ | w:commentRangeStart/End |
| Comment thread | ✅ | ✅ | ✅ | 🟡 | ❌ | commentsExtended.xml |
| Reply | ✅ | ✅ | ✅ | 🟡 | ❌ | w15:paraIdParent |
| Resolve state | ✅ | ✅ | ✅ | 🟡 | ❌ | w15:done |
| Author/timestamp | ✅ | ✅ | ✅ | 🟡 | ❌ | w:author, w:date |
| Comment UI (floating cards) | — | — | ✅ | — | ❌ | Word-style floating margin |
| Multi-paragraph range | 🟡 | 🟡 | 🟡 | ❌ | ❌ | Cần validation |
| Comment formatting | ❌ | ❌ | ❌ | ❌ | ❌ | Bold/italic trong comment text |

#### Nhóm H: Track Changes

| Chức năng | Import | Export | Rendering | Round-trip | Fidelity | Ghi chú |
|-----------|--------|--------|-----------|------------|----------|---------|
| Insert tracking | ✅ | ✅ | ✅ | 🟡 | ❌ | w:ins |
| Delete tracking | ✅ | ✅ | ✅ | 🟡 | ❌ | w:del, w:delText |
| Author/timestamp | ✅ | ✅ | ✅ | 🟡 | ❌ | |
| Accept/reject | ✅ | — | ✅ | — | ❌ | Editor functionality |
| Visual display | ✅ | — | 🟡 | — | ❌ | Chưa giống Word styling |

#### Nhóm I: Chưa hỗ trợ

| Chức năng | Trạng thái | Ghi chú |
|-----------|-----------|---------|
| Character styles | ❌ | w:style[type="character"] |
| Theme colors | ❌ | w:theme, w:clrScheme, w:fontScheme |
| Footnotes | ⚠️ | Extension có, DOCX import/export chưa |
| Endnotes | ❌ | |
| Equations (OMML) | ❌ | m:oMath — best-effort only |
| SmartArt | ❌ | Lossless preservation |
| Text boxes | ❌ | w:txbxContent |
| Shapes | ❌ | |
| Fields (DATE, PAGE, TOC) | ❌ | w:fldSimple flattened |
| Mail Merge | ❌ | |
| Content Control | ❌ | |
| Document Compare | ❌ | |
| Bookmarks (round-trip) | ❌ | Extension có, DOCX chưa |
| Underline variants | ❌ | Chỉ single, chưa double/dotted/dashed |
| Cross-reference | ❌ | |

**Legend:**

- ✅ Đã có implementation và cơ bản hoạt động
- 🟡 Có implementation nhưng cần validation chi tiết
- ⚠️ Partial — một số trường hợp hoạt động
- ❌ Chưa có hoặc chưa hoạt động

---

## 4. Compatibility Contract

### 4.1 Định nghĩa 6 Level

| Level | Tên | Mô tả | Tiêu chí kiểm tra |
|-------|-----|--------|-------------------|
| **L1** | Open | File mở được mà không crash | Import không lỗi, content hiển thị cơ bản |
| **L2** | Preserve | Không mất dữ liệu | Không mất text, image, formatting, comments |
| **L3** | Render | Hiển thị đúng | Layout, spacing, breaks đúng so với source |
| **L4** | Edit | Chỉnh sửa đúng | Thêm/sửa/xóa hoạt động, không phá layout hiện có |
| **L5** | Round-trip | Word → System → Word | File export mở lại trên Word giữ nguyên nội dung/formatting |
| **L6** | Fidelity | Layout ≈ Microsoft Word | So sánh visual (pixel/layout) gần như Word |

### 4.2 Quy tắc đánh giá

- **Không được skip level:** Phải đạt L1 trước khi đánh giá L2, L2 trước khi đánh giá L3, ...
- **Mỗi level cần test evidence:** Không tuyên bố đạt level nếu chưa có test case chứng minh
- **Fidelity (L6) là optional:** Chỉ cần cho nhóm tính năng quan trọng, không cần cho mọi feature

### 4.3 Trạng thái hiện tại

> **Ghi chú:** Tất cả đánh giá dưới đây cần được verify bằng test cases thực tế. Hiện tại hầu hết mới ở mức "có implementation" (L1-L2), chưa đạt "đã validate" (L3-L6).

#### Nhóm A: Core Text & Paragraph

| Chức năng | L1 Open | L2 Preserve | L3 Render | L4 Edit | L5 Round-trip | L6 Fidelity |
|-----------|---------|-------------|-----------|---------|---------------|-------------|
| Text formatting | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Paragraph formatting | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Heading 1–6 | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Font family/size | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Font color | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Subscript/Superscript | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Tab stops | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |

#### Nhóm B: Table

| Chức năng | L1 Open | L2 Preserve | L3 Render | L4 Edit | L5 Round-trip | L6 Fidelity |
|-----------|---------|-------------|-----------|---------|---------------|-------------|
| Basic table | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Column span | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Row span | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Cell width | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Cell shading | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Table borders | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Table page split | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Nested tables | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Nhóm C: Image

| Chức năng | L1 Open | L2 Preserve | L3 Render | L4 Edit | L5 Round-trip | L6 Fidelity |
|-----------|---------|-------------|-----------|---------|---------------|-------------|
| Inline image | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Image dimensions | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Floating image | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| Anchor positioning | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Text wrapping | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Nhóm D: Section & Layout

| Chức năng | L1 Open | L2 Preserve | L3 Render | L4 Edit | L5 Round-trip | L6 Fidelity |
|-----------|---------|-------------|-----------|---------|---------------|-------------|
| Page size/margins | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Section breaks | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Different first page | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Odd/even pages | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Pagination | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |

#### Nhóm E: Header/Footer

| Chức năng | L1 Open | L2 Preserve | L3 Render | L4 Edit | L5 Round-trip | L6 Fidelity |
|-----------|---------|-------------|-----------|---------|---------------|-------------|
| Default header/footer | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| First page header/footer | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Header/footer images | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |

#### Nhóm F: Comments

| Chức năng | L1 Open | L2 Preserve | L3 Render | L4 Edit | L5 Round-trip | L6 Fidelity |
|-----------|---------|-------------|-----------|---------|---------------|-------------|
| Comment definition | ✅ | ✅ | — | 🟡 | 🟡 | ❌ |
| Comment range | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Reply | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Resolve state | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Multi-paragraph range | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ |

#### Nhóm G: Track Changes

| Chức năng | L1 Open | L2 Preserve | L3 Render | L4 Edit | L5 Round-trip | L6 Fidelity |
|-----------|---------|-------------|-----------|---------|---------------|-------------|
| Insert tracking | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Delete tracking | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Visual display | ✅ | ✅ | 🟡 | — | — | ❌ |

#### Nhóm H: Chưa hỗ trợ

| Chức năng | L1 | L2 | L3 | L4 | L5 | L6 |
|-----------|----|----|----|----|----|----|
| Footnotes | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Character styles | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Theme colors | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Equations (OMML) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| SmartArt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Text boxes | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Fields | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PDF (vector text) | ❌ | — | ❌ | — | — | ❌ |

---

## 5. Test Methodology

### 5.1 Round-trip Test (L5)

```
Microsoft Word
      ↓
   DOCX File
      ↓
   Import (kindy-editor)
      ↓
Document Model (JSON)
      ↓
   Editing (thêm/sửa/xóa)
      ↓
   Export DOCX (kindy-editor)
      ↓
Microsoft Word
      ↓
   Compare (visual + structural)
```

**Mỗi test case phải kiểm tra:**

| # | Kiểm tra | Mức độ |
|---|---------|--------|
| 1 | File export không lỗi khi mở trên Word | Bắt buộc |
| 2 | Nội dung text giữ nguyên | Bắt buộc |
| 3 | Formatting (bold, italic, font, size, color) giữ nguyên | Bắt buộc |
| 4 | Images giữ nguyên vị trí và kích thước | Bắt buộc |
| 5 | Table structure giữ nguyên (grid, merge, width) | Bắt buộc |
| 6 | Comments giữ nguyên (text, author, thread, resolved) | Bắt buộc |
| 7 | Track changes giữ nguyên (insert, delete, author) | Bắt buộc |
| 8 | Header/Footer giữ nguyên (content, styling, variants) | Bắt buộc |
| 9 | Section breaks giữ nguyên (geometry, page number) | Bắt buộc |
| 10 | Layout gần đúng (spacing, breaks, margins) | Mong muốn |

### 5.2 Visual Regression Test (L6)

```
Original Word File
      ↓
   Export PDF từ Word (baseline)
      ↓
   ────────────────────────
      ↑
   kindy-editor Import → Render → Export PDF
      ↓
   Compare PDFs
```

**So sánh:**

| # | Metric | Tool |
|---|--------|------|
| 1 | Text content | PDF text extraction |
| 2 | Text position (bounding box) | PDF text position extraction |
| 3 | Font size, weight, style | PDF font analysis |
| 4 | Line spacing, paragraph spacing | PDF layout analysis |
| 5 | Image position, size | PDF image extraction |
| 6 | Table grid | PDF table detection |
| 7 | Page count | PDF metadata |
| 8 | Header/Footer position | PDF content analysis |
| 9 | Margin boundaries | PDF page geometry |

### 5.3 Test Matrix Mục tiêu

| Category | Test cases | Automation | Priority | Hiện tại |
|----------|-----------:|------------|----------|----------|
| Text formatting | 100 | ✅ | P0 | ~50 |
| Paragraph formatting | 100 | ✅ | P0 | ~40 |
| Style inheritance | 80 | ✅ | P0 | ~30 |
| Table (basic + complex) | 150 | ✅ | P0 | ~60 |
| Image (inline + floating) | 100 | ✅ | P0 | ~40 |
| Header/Footer | 80 | ✅ | P0 | ~30 |
| Section breaks | 100 | ✅ | P0 | ~40 |
| Comment round-trip | 80 | ✅ | P0 | ~30 |
| Track Changes round-trip | 100 | ✅ | P0 | ~30 |
| Pagination | 200 | 🟡 | P1 | ~80 |
| PDF fidelity | 150 | 🟡 | P1 | ~20 |
| Round-trip (all features) | 200+ | ✅ | P0 | ~100 |
| **Tổng** | **~1,340** | | | **~550** |

> **Hiện tại:** ~528-550 tests. Mục tiêu: ~1,340 tests. Mỗi test case phải có **expected output đúng như Word** (không chỉ "file không lỗi").

### 5.4 Test Case Template

Mỗi test case phải tuân theo format:

```
Test ID: [CATEGORY]-[NUMBER]
Category: Text / Paragraph / Table / Image / ...
Feature: Mô tả ngắn gọn

Input:
- File DOCX cụ thể (hoặc generated DOCX)
- Steps để tạo

Expected Output:
- Word: [Mô tả Word hiển thị như thế nào]
- Kindy: [Mô tả kindy-editor phải hiển thị như thế nào]
- Fidelity: [So sánh — giống/khác ở đâu]

Actual Output:
- [Kết quả thực tế khi test]

Status: PASS / FAIL / PARTIAL
```

---

## 6. Kiến trúc pipeline

### 6.1 Luồng xử lý

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   UPLOAD    │───▶│   PARSE     │───▶│   EDIT      │───▶│   EXPORT    │
│  (DOCX In)  │    │  (OOXML)    │    │(ProseMirror)│   │ (DOCX/PDF)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
  Compatibility      DocumentState      EditorState        DOCX Package
     Report           (JSON)            (JSON)           (ZIP/OOXML)
```

### 6.2 Một Document Model → Nhiều Output

```
                    ┌── Web Renderer (ProseMirror + CSS)
                    │
Document Model ─────┼── PDF Renderer (cần upgrade từ image-based)
                    │
                    └── DOCX Serializer (docx.js)
```

> **Nguyên tắc:** Không để mỗi output có logic riêng. Mọi thứ xuất phát từ một DocumentModel duy nhất.

> **Vấn đề hiện tại:** PDF Renderer đang dùng image-based approach (dom-to-image-more), không phải text-based. Điều này có nghĩa text trong PDF không selectable/searchable.

### 6.3 DocumentState

```typescript
interface KindyDocumentState {
  schemaVersion: string
  content: JSONContent           // ProseMirror JSON
  page: KindyPageState           // Page configuration
  assets: AssetReference[]       // Images, media
  unsupportedParts: Map<string, Uint8Array>  // Bảo toàn nguyên vẹn
  compatibilityReport: CompatibilityReport
}
```

### 6.4 Compatibility Report

```typescript
interface CompatibilityReport {
  profile: 'v2.0' | 'v2.1'
  supported: string[]
  issues: CompatibilityIssue[]
}

interface CompatibilityIssue {
  feature: string
  severity: 'info' | 'warning' | 'error'
  message: string
  suggestion?: string
}
```

---

## 7. Chi tiết kỹ thuật OOXML

### 7.1 Styles

**Import:**
- Parse `word/styles.xml` với `parseDocxStyles()`
- Resolve `w:basedOn` chain đệ quy
- Merge paragraph format (`pPr`) và run format (`rPr`) từ base styles
- Hỗ trợ `docDefaults` cho `pPrDefault` và `rPrDefault`

**Export:**
- Giữ nguyên paragraph styles đã import
- Export inline `textStyle` marks cho character formatting
- Không tạo custom named styles mới

**Gap:**
- Character styles (`w:style[type="character"]`) chưa import/export
- Theme colors (`w:themeColor`) chưa xử lý
- Underline variants (single, double, dotted...) chỉ export single
- Font substitution / theme fonts chưa xử lý

### 7.2 Numbering

**Import:**
- Parse `word/numbering.xml` với `parseNumberingKinds()`
- Đọc `w:abstractNum` definitions với `w:lvl`

**Export:**
- Single `kindy-numbering` reference, định dạng fixed

**Gap:**
- Complex numbering (restart, continue, legal numbering) bị mất
- Picture bullets không hỗ trợ
- Multi-level numbering với restart rules chưa preserve

### 7.3 Comments

**Import:**
```
word/comments.xml          → Comment definitions (id, author, date, text)
word/commentsExtended.xml  → Threading (parent/child, resolved state)
document.xml               → CommentRangeStart/End/Reference
```

**Export:**
```
Collect definitions từ document marks → CommentDefinition[]
Generate comments.xml + commentsExtended.xml
Inline CommentRangeStart/End/Reference trong runs
```

**Gap:**
- Comment formatting (bold/italic) chưa hỗ trợ
- Multi-paragraph comment ranges cần validation
- Author initials không preserve từ OOXML gốc
- Comment anchoring chính xác cần validation

### 7.4 Track Changes

**Import/Export:**
```xml
<w:ins w:id="1" w:author="Kindy" w:date="2026-01-01T00:00:00Z">
  <w:r><w:t>Text được chèn</w:t></w:r>
</w:ins>
<w:del w:id="2" w:author="Kindy" w:date="2026-01-01T00:00:00Z">
  <w:r><w:delText>Text bị xóa</w:delText></w:r>
</w:del>
```

**Gap:**
- Hiển thị visual chưa giống Word (thiếu strikethrough/underline styling cho deletion)
- Accept/reject lifecycle cần validation
- Format changes (w:rPrChange) chưa xử lý

### 7.5 Page Layout

**Import:**
```xml
<w:pgSz w:w="11906" w:h="16838"/>  <!-- A4 in twips -->
<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"
         w:header="720" w:footer="720" w:gutter="0"/>
```

**Mapping:** 1 inch = 1440 twips = 96 px | 1 cm = 567 twips = 37.8 px

**Gap:**
- Page background颜色 chưa export
- Watermark định nghĩa có nhưng import/export/render chưa hoàn thiện

---

## 8. Định hướng tiếp theo

### 8.1 Phase 1: Core Stabilization (P0)

> **Ưu tiên số 1:** Ổn định các chức năng đang có. Không phát triển tính năng mới (Footnote, SmartArt, Mail Merge) cho đến khi Phase 1 hoàn thành.

#### 8.1.1 Image — Hoàn thiện lifecycle

```
Upload → Parse → Store → Render → Resize → Position → Save → Re-open
```

| Task | Mô tả | Priority |
|------|-------|----------|
| Inline image round-trip test | Test 10+ cases với different formats, sizes, positions | P0 |
| Floating image handling | Parse wp:anchor, render with CSS absolute positioning | P0 |
| Text wrapping | Parse wp:wrapText, implement wrap modes | P0 |
| Crop support | Parse a:srcRect, apply crop on render | P1 |
| Image relationship integrity | Test broken/missing relationships | P0 |
| Image format support | Test PNG, JPG, GIF, BMP, SVG, WebP | P0 |

#### 8.1.2 Comment — Đảm bảo persistence

```
Create → Anchor → Edit → Reply → Resolve → Save → Reopen in Word
```

| Task | Mô tả | Priority |
|------|-------|----------|
| Comment round-trip test | Test 10+ cases với different thread structures | P0 |
| Multi-paragraph range | Test comment spanning multiple paragraphs | P0 |
| Comment ID stability | Verify IDs không đổi sau round-trip | P0 |
| Author/timestamp preservation | Verify author, date giữ nguyên | P0 |
| Word compatibility | Export DOCX → Mở trên Word → Verify comments hiển thị | P0 |

#### 8.1.3 PDF Export — Chuyển từ "export được" sang "PDF fidelity"

| Task | Mô tả | Priority |
|------|-------|----------|
| Text-based PDF renderer | Thay thế image-based approach | P0 |
| Font embedding | Đảm bảo font trong PDF | P0 |
| Text selectability | Text trong PDF selectable/searchable | P0 |
| Layout comparison | So sánh PDF với Word PDF cho 10+ documents | P0 |

#### 8.1.4 Table Engine — Mở rộng

| Task | Mô tả | Priority |
|------|-------|----------|
| Table borders | Parse w:tblBorders, w:tcBorders | P0 |
| Preferred width | Parse w:tblW type="dxa"/"pct" | P0 |
| Table page split | Test table spanning multiple pages | P0 |
| Cell margins | Parse w:tcMar | P1 |
| Nested tables | Parse table within table | P1 |
| Table alignment | Parse w:jc trong w:tblPr | P1 |

#### 8.1.5 Pagination Engine — Hoàn thiện

| Task | Mô tả | Priority |
|------|-------|----------|
| Keep next/lines test | Test 10+ cases | P0 |
| Widow/Orphan test | Test 10+ cases | P0 |
| Table split test | Test table across page breaks | P0 |
| Image anchoring test | Test image page break behavior | P0 |
| Section break test | Test different section types | P0 |

### 8.2 Phase 2: Word Fidelity (P1)

> Biased Core Document Engine thành engine có thể xử lý DOCX thực tế ổn định như Word.

| Task | Mô tả |
|------|-------|
| Visual Regression Engine | Xây dựng hệ thống so sánh PDF/image tự động |
| Compatibility Matrix | Mở rộng test suite lên ~1,340 tests |
| Fidelity Score | Tính Word Fidelity Score cho từng category |
| Rendering Accuracy | Validate layout accuracy so với Word |
| Production Hardening | Stress test với DOCX complex, large documents |

### 8.3 Phase 3: Advanced Word Features (P2)

> Chỉ bắt đầu sau khi Phase 1 + Phase 2 hoàn thành.

| Feature | Mô tả | Complexity |
|---------|-------|------------|
| Footnotes/Endnotes | Import/export w:footnoteReference | Cao |
| Character styles | Import/export w:style[type="character"] | Trung bình |
| Theme colors | Parse theme1.xml, map color schemes | Cao |
| Multi-column | Section-level column layout | Cao |
| Fields preservation | Store w:fldSimple, w:instrText | Trung bình |
| Shapes | Basic shape rendering | Cao |
| OMML Equation | Math equation rendering | Rất cao |
| SmartArt | Diagram rendering | Rất cao |

### 8.4 Phase 4: Enterprise (P3)

| Feature | Mô tả |
|---------|-------|
| Document Compare | So sánh 2 version, highlight changes |
| Mail Merge | Template + data source → document |
| Content Control | Form fields, date picker, dropdown |
| Advanced Collaboration | Real-time co-editing với Yjs |
| Accessibility | WCAG compliance, screen reader support |

---

## 9. KPI và tiêu chí hoàn thành

### 9.1 KPI Mục tiêu

| KPI | Target | Ghi chú |
|-----|--------|---------|
| DOCX Import Success | ≥ 99.5% | Không crash, không mất data |
| DOCX Round-trip Success | ≥ 99% | Word → System → Word giữ nguyên |
| Visual Fidelity | ≥ 98% | So sánh pixel/layout với Word |
| PDF Fidelity | ≥ 98% | So sánh PDF với Word PDF |
| No data loss | 100% | Không mất text, image, formatting |
| No corruption | 100% | File export luôn mở được trên Word |

### 9.2 Definition of Done — Mỗi chức năng

Một chức năng được coi là "hoàn thành" khi:

1. ✅ Có test cases cho ít nhất L1-L5
2. ✅ Tất cả test cases PASS
3. ✅ Có ít nhất 3 round-trip test với DOCX thực tế từ Word
4. ✅ File export mở được trên Word không lỗi
5. ✅ Có visual comparison baseline (cho chức năng quan trọng)

### 9.3 Definition of Done — Phase 1

Phase 1 được coi là hoàn thành khi:

1. ✅ Image lifecycle hoàn thiện (inline + floating)
2. ✅ Comment persistence verified
3. ✅ PDF renderer upgrade (text-based)
4. ✅ Table engine mở rộng (borders, width, split)
5. ✅ Pagination engine validated (keep, widow/orphan, split)
6. ✅ Test suite ≥ 1,000 tests
7. ✅ Word Fidelity Score ≥ 90% cho nhóm core features

---

## 10. Glossary

| Term | Định nghĩa |
|------|-----------|
| **OOXML** | Office Open XML — standard document format của Microsoft (ECMA-376 / ISO 295000) |
| **DOCX** | File extension của OOXML Word document |
| **ProseMirror** | Framework editing engine dựa trên structured document model |
| **Tiptap** | Wrapper của ProseMirror với Vue.js integration |
| **DocumentState** | Định dạng trung gian (JSON) biểu diễn toàn bộ document |
| **Round-trip** | Quy trình Word → Import → Edit → Export → Word |
| **Fidelity** | Mức độ hiển thị giống Word |
| **Visual Regression** | So sánh pixel/layout giữa 2 phiên bản render |
| **Layout Engine** | Hệ thống tính toán pagination, page breaks, positioning |
| **Twips** | Twentieth of a point — đơn vị đo lường trong OOXML (1 inch = 1440 twips) |
| **Compatibility Contract** | Hợp đồng 6 level đánh giá mức độ tương thích với Word |
| **Fidelity Score** | Điểm phần trăm thể hiện mức độ giống Word |

---

## 11. Nguồn tham khảo

- [OOXML Specification (ECMA-376)](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/)
- [Microsoft Word Documentation](https://support.microsoft.com/en-us/word)
- [docx.js Library](https://docx.js.org/)
- [ProseMirror](https://prosemirror.net/)
- [Tiptap](https://tiptap.dev/)
- [kindy-editor CAPABILITIES.md](./CAPABILITIES.md)
- [kindy-editor GUIDE.md](./GUIDE.md)
