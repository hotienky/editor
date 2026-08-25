# OOXML-Native Migration Plan

> Version: 2.0
> Date: 2026-08-24
> Status: Active

---

## Context

Kindy Editor hiện dùng ProseMirror JSON làm canonical state. OOXML chỉ là import/export codec. Kết quả:

- 2 lần convert (OOXML → ProseMirror → Canvas) mỗi bước mất fidelity
- Character styles, numbering lvlText, theme fonts bị mất
- Round-trip không giữ nguyên format gốc

**Mục tiêu**: OOXML tree là canonical state. Import = parse trực tiếp. Export = serialize trực tiếp.

Xem thêm:
- [Gap Analysis](./ooxml-gap-analysis.md) — chi tiết feature nào mất, feature nào còn
- [Architecture Overview](./architecture/overview.md) — kiến trúc mới
- [SAD](./architecture/SAD.md) — full architecture spec

---

## Phase 0: OOXML Type System + Style Resolution (Week 1-3)

### Mục tiêu
Xây dựng OOXML type definitions và style resolver. Không thay đổi UI.

### Tasks

| # | Task | Effort | Dependency |
|---|---|---|---|
| 0.1 | Define OOXML types (`src/model/ooxml-types.ts`) | 3d | — |
| 0.2 | Implement `StyleResolver` — paragraph styles + basedOn cascade | 3d | 0.1 |
| 0.3 | Implement character style resolution (`w:rStyle`) | 2d | 0.2 |
| 0.4 | Implement table style resolution (`w:tblStyle`) | 2d | 0.2 |
| 0.5 | Theme font resolution (`majorHAnsi`, `minorEastAsia`) | 2d | 0.2 |
| 0.6 | Unit tests: style cascade, character styles, theme fonts | 3d | 0.3-0.5 |

### Deliverables
- `src/model/ooxml-types.ts` — Full type definitions
- `src/model/style-resolver.ts` — Style cascade engine
- Unit tests passing

---

## Phase 1: Numbering Engine + OOXML Parser (Week 4-6)

### Mục tiêu
Parse DOCX → OoxmlPackage trực tiếp. Numbering lvlText hoạt động.

### Tasks

| # | Task | Effort | Dependency |
|---|---|---|---|
| 1.1 | Build `OoxmlParser` — parse all parts to OoxmlPackage | 5d | 0.1 |
| 1.2 | Implement `NumberingEngine` — resolve lvlText patterns | 3d | 1.1 |
| 1.3 | Handle restart/override in numbering | 2d | 1.2 |
| 1.4 | Nested tables support | 2d | 1.1 |
| 1.5 | Unit tests: parser, numbering, nested tables | 3d | 1.1-1.4 |

### Deliverables
- `src/codecs/ooxml-parser.ts` — DOCX → OoxmlPackage
- `src/model/numbering-engine.ts` — Numbering resolution
- Unit tests passing

---

## Phase 2: Layout Engine từ OOXML (Week 7-10)

### Mục tiêu
Layout engine tính pagination từ OOXML tree với twips-based measurement.

### Tasks

| # | Task | Effort | Dependency |
|---|---|---|---|
| 2.1 | Implement `OoxmlTextMeasure` — twips-based measurement | 5d | 0.1 |
| 2.2 | Implement `LineBreaker` — Word-compatible line breaking | 4d | 2.1 |
| 2.3 | Implement `OoxmlPagination` — section-aware pagination | 4d | 2.2 |
| 2.4 | Implement `HeaderFooterLayout` — per-variant layout | 3d | 2.3 |
| 2.5 | Compare layout with Word output (visual diff) | 3d | 2.4 |

### Deliverables
- `src/layout/ooxml-layout.ts` — Main layout engine
- `src/layout/ooxml-text-measure.ts` — Text measurement
- `src/layout/line-breaker.ts` — Line breaking
- Visual comparison report

---

## Phase 3: Canvas Rendering từ OOXML (Week 11-13)

### Mục tiêu
Canvas paint trực tiếp từ OOXML layout. Bỏ ProseMirror bridge.

### Tasks

| # | Task | Effort | Dependency |
|---|---|---|---|
| 3.1 | Implement `OoxmlPainter` — paint from OOXML layout | 5d | 2.4 |
| 3.2 | Implement font loading from document | 2d | 3.1 |
| 3.3 | Implement `OoxmlSelection` — screen ↔ CP mapping | 4d | 3.1 |
| 3.4 | Implement `OoxmlInputHandler` — keyboard/IME input | 4d | 3.3 |

### Deliverables
- `src/canvas/ooxml-painter.ts` — Canvas rendering
- `src/canvas/ooxml-selection.ts` — Selection model
- `src/canvas/ooxml-input.ts` — Input handling

---

## Phase 4: Editing & Transaction (Week 14-16)

### Mục tiêu
Transaction-based editing trên OOXML tree.

### Tasks

| # | Task | Effort | Dependency |
|---|---|---|---|
| 4.1 | Implement `TransactionEngine` — apply/undo transactions | 4d | 3.4 |
| 4.2 | Implement `RevisionEngine` — track changes (w:ins/w:del) | 3d | 4.1 |
| 4.3 | Implement `CommentEngine` — add/reply/resolve comments | 2d | 4.1 |
| 4.4 | Implement floating images support | 3d | 3.1 |

### Deliverables
- `src/core/ooxml-transaction.ts` — Transaction engine
- `src/core/ooxml-revisions.ts` — Track changes
- `src/core/ooxml-comments.ts` — Comments

---

## Phase 5: Export + Round-trip (Week 17-19)

### Mục tiêu
OoxmlPackage → DOCX. Round-trip validation.

### Tasks

| # | Task | Effort | Dependency |
|---|---|---|---|
| 5.1 | Implement `OoxmlSerializer` — OoxmlPackage → DOCX | 5d | 1.1 |
| 5.2 | Implement round-trip validator | 3d | 5.1 |
| 5.3 | Test with real SharePoint documents | 3d | 5.2 |
| 5.4 | Fix fidelity issues found in testing | 5d | 5.3 |

### Deliverables
- `src/codecs/ooxml-serializer.ts` — DOCX export
- `src/codecs/ooxml-roundtrip.ts` — Round-trip validator
- Test report with real documents

---

## Phase 6: Collaboration & Delta Storage (Week 20-22)

### Mục tiêu
OT trên OOXML tree. Delta-based save.

### Tasks

| # | Task | Effort | Dependency |
|---|---|---|---|
| 6.1 | Implement OOXML OT engine | 5d | 4.1 |
| 6.2 | Implement delta storage | 3d | 4.1 |
| 6.3 | Integrate with Yjs adapter | 3d | 6.1 |

### Deliverables
- `src/core/ooxml-ot.ts` — OT engine
- `src/core/ooxml-delta.ts` — Delta storage

---

## Phase 7: Performance Optimization (Week 23-25)

### Mục tiêu
Performance cho 500+ trang documents.

### Tasks

| # | Task | Effort | Dependency |
|---|---|---|---|
| 7.1 | Streaming OOXML parser | 4d | 1.1 |
| 7.2 | Web Workers cho parse + layout | 4d | 2.4 |
| 7.3 | Incremental layout (dirty sections) | 3d | 2.4 |
| 7.4 | Lazy style resolution (visible only) | 2d | 0.2 |

### Deliverables
- Streaming parser
- Worker-based layout
- Performance benchmarks

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| OOXML spec complexity | Focus on subset used by real documents; use oxxml.dev reference |
| Text measurement accuracy | Compare against Word output pixel-by-pixel |
| Performance regression | Benchmark at each phase; feature flags for old/new path |
| Breaking existing functionality | Parallel run period; keep old code as fallback |
