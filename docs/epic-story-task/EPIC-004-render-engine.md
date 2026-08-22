# EPIC-004: Render Engine

## Overview

Build the render engine that converts Layout Tree into HTML/CSS.

## Duration

2-3 months

## Stories

### STORY-001: Page Renderer

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Render page from Layout Tree
- [ ] Generate HTML/CSS for page
- [ ] Handle page dimensions and margins
- [ ] Handle page backgrounds

**Acceptance Criteria:**

- Pages render correctly
- CSS is valid

---

### STORY-002: Header/Footer Renderer

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Render header with logo, text, page numbers
- [ ] Render footer with logo, text, page numbers
- [ ] Handle different layouts (single, split)
- [ ] Handle different styles

**Acceptance Criteria:**

- Header/footer render correctly
- Different layouts work

---

### STORY-003: Virtual Renderer

**Priority:** High
**Duration:** 3-4 weeks

**Tasks:**

- [ ] Implement viewport-based rendering
- [ ] Only render visible pages
- [ ] Handle page buffer (preload adjacent pages)
- [ ] Handle scroll synchronization

**Acceptance Criteria:**

- Virtual rendering works
- Performance is good

---

### STORY-004: React Adapter

**Priority:** Medium
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Create React components for pages
- [ ] Handle React lifecycle
- [ ] Handle React state
- [ ] Handle React events

**Acceptance Criteria:**

- React rendering works
- Components are well-documented

---

### STORY-005: Vue Adapter

**Priority:** Medium
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Create Vue components for pages
- [ ] Handle Vue lifecycle
- [ ] Handle Vue reactivity
- [ ] Handle Vue events

**Acceptance Criteria:**

- Vue rendering works
- Components are well-documented

---

### STORY-006: Print Renderer

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Generate print-friendly HTML/CSS
- [ ] Handle @page rules
- [ ] Handle page breaks
- [ ] Handle header/footer in print

**Acceptance Criteria:**

- Print output is correct
- PDF export works

---

## Dependencies

- EPIC-003: Layout Engine

## Deliverables

- `@umo/render` package
- Page Renderer
- Virtual Renderer
- React and Vue adapters
- Print Renderer
