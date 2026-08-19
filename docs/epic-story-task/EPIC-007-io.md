# EPIC-007: Import/Export

## Overview

Build the import/export engine for document formats.

## Duration

3-4 months

## Stories

### STORY-001: DOCX Import

**Priority:** High
**Duration:** 3-4 weeks

**Tasks:**

- [ ] Parse DOCX files
- [ ] Convert to Document AST
- [ ] Handle styles, images, tables
- [ ] Handle headers/footers

**Acceptance Criteria:**

- DOCX import works
- Common formats are supported

---

### STORY-002: DOCX Export

**Priority:** High
**Duration:** 3-4 weeks

**Tasks:**

- [ ] Generate DOCX files
- [ ] Convert from Document AST
- [ ] Handle styles, images, tables
- [ ] Handle headers/footers

**Acceptance Criteria:**

- DOCX export works
- Output is compatible with Word

---

### STORY-003: PDF Export

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Generate PDF files
- [ ] Handle page layout
- [ ] Handle header/footer
- [ ] Handle images

**Acceptance Criteria:**

- PDF export works
- Output is correct

---

### STORY-004: HTML Import/Export

**Priority:** Medium
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Import HTML to Document AST
- [ ] Export Document AST to HTML
- [ ] Handle common HTML elements
- [ ] Handle styles

**Acceptance Criteria:**

- HTML import/export works
- Common elements are supported

---

### STORY-005: Markdown Import/Export

**Priority:** Medium
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Import Markdown to Document AST
- [ ] Export Document AST to Markdown
- [ ] Handle common Markdown syntax
- [ ] Handle extensions

**Acceptance Criteria:**

- Markdown import/export works
- Common syntax is supported

---

## Dependencies

- EPIC-001: Document Core
- EPIC-003: Layout Engine

## Deliverables

- `@umo/io` package
- DOCX import/export
- PDF export
- HTML import/export
- Markdown import/export
