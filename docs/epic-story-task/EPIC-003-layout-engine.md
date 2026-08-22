# EPIC-003: Layout Engine ⭐⭐⭐⭐⭐

## Overview

Build the layout engine that converts Document AST into Layout Tree.

## Duration

4-6 months (longest phase)

## Stories

### STORY-001: Font Measurement

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Implement Canvas-based text measurement
- [ ] Handle different fonts, sizes, weights
- [ ] Implement LRU cache for measurements
- [ ] Handle web fonts (wait for load)
- [ ] Handle fallback fonts

**Acceptance Criteria:**

- Text measurement is accurate
- Cache improves performance

---

### STORY-002: Line Breaking

**Priority:** High
**Duration:** 3-4 weeks

**Tasks:**

- [ ] Implement Knuth-Plass line breaking algorithm
- [ ] Handle word wrapping
- [ ] Handle hyphenation
- [ ] Handle CJK text (no word boundaries)
- [ ] Handle right-to-left text

**Acceptance Criteria:**

- Line breaks are optimal
- CJK text works correctly

---

### STORY-003: Paragraph Layout

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Calculate paragraph height from lines
- [ ] Handle paragraph spacing (margin-top, margin-bottom)
- [ ] Handle first line indent
- [ ] Handle alignment (left, center, right, justify)
- [ ] Handle line height

**Acceptance Criteria:**

- Paragraphs are correctly sized
- Alignment works correctly

---

### STORY-004: Block Height Estimation

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Accurately estimate height for all block types
- [ ] Handle images (actual dimensions)
- [ ] Handle tables (actual row heights)
- [ ] Handle lists (nested items)
- [ ] Handle code blocks (monospace font)
- [ ] Handle blockquotes

**Acceptance Criteria:**

- Height estimation matches actual render
- All block types are handled

---

### STORY-005: Table Layout

**Priority:** High
**Duration:** 3-4 weeks

**Tasks:**

- [ ] Calculate column widths
- [ ] Calculate row heights
- [ ] Handle column spanning
- [ ] Handle row spanning
- [ ] Handle table overflow
- [ ] Handle table borders

**Acceptance Criteria:**

- Tables are correctly sized
- Spanning works correctly

---

### STORY-006: Image Layout

**Priority:** High
**Duration:** 1-2 weeks

**Tasks:**

- [ ] Handle image dimensions (width/height)
- [ ] Handle image aspect ratio
- [ ] Handle image captions
- [ ] Handle image positioning (inline, block)

**Acceptance Criteria:**

- Images are correctly sized
- Aspect ratio is maintained

---

### STORY-007: Column Layout

**Priority:** Medium
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Handle multi-column pages
- [ ] Handle column breaks
- [ ] Handle column spanning
- [ ] Handle different column widths

**Acceptance Criteria:**

- Multi-column pages work
- Column breaks work

---

### STORY-008: Pagination

**Priority:** High
**Duration:** 3-4 weeks

**Tasks:**

- [ ] Implement page break computation
- [ ] Handle page margins
- [ ] Handle header/footer space
- [ ] Handle page numbers
- [ ] Handle widow/orphan control

**Acceptance Criteria:**

- Pagination is correct
- Widow/orphan control works

---

### STORY-009: Section Layout

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Handle section breaks
- [ ] Handle different page sizes per section
- [ ] Handle different margins per section
- [ ] Handle different header/footer per section

**Acceptance Criteria:**

- Sections work correctly
- Different layouts per section work

---

### STORY-010: Layout Tree

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Generate complete Layout Tree
- [ ] Map document positions to layout positions
- [ ] Map layout positions to document positions
- [ ] Handle page references

**Acceptance Criteria:**

- Layout Tree is correct
- Position mapping works

---

### STORY-011: Cache Optimization

**Priority:** Medium
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Implement smart caching (incremental updates)
- [ ] Handle partial re-layout
- [ ] Implement cache invalidation
- [ ] Handle concurrent access

**Acceptance Criteria:**

- Cache improves performance
- Partial updates work

---

### STORY-012: Web Worker

**Priority:** Medium
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Move layout computation to Web Worker
- [ ] Implement message passing
- [ ] Handle main thread fallback
- [ ] Handle worker lifecycle

**Acceptance Criteria:**

- Layout doesn't block UI
- Worker works in all browsers

---

## Dependencies

- EPIC-001: Document Core

## Deliverables

- `@umo/layout` package
- Text measurement system
- Line breaking algorithm
- Pagination algorithm
- Layout Tree generation
- Web Worker support
