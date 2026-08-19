# EPIC-001: Document Core

## Overview

Build the foundational document model and core utilities.

## Duration

2-3 months

## Stories

### STORY-001: Document Schema

**Priority:** High
**Duration:** 1-2 weeks

**Tasks:**

- [ ] Define node types (Document, Section, Paragraph, Inline, Text)
- [ ] Define mark types (Bold, Italic, Link, etc.)
- [ ] Create schema validation
- [ ] Create schema extension API

**Acceptance Criteria:**

- Schema can validate a document structure
- Schema can be extended by plugins

---

### STORY-002: Node System

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Implement Node class with properties (type, attrs, children, marks)
- [ ] Implement tree traversal methods
- [ ] Implement node creation/deletion
- [ ] Implement node cloning
- [ ] Implement node comparison

**Acceptance Criteria:**

- Can create and manipulate node tree
- All node operations work correctly

---

### STORY-003: Tree Operations

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Insert node at position
- [ ] Delete node at position
- [ ] Move node from position A to B
- [ ] Find nodes by type/attributes
- [ ] Get node at position
- [ ] Get path for node

**Acceptance Criteria:**

- All tree operations work correctly
- Operations are efficient

---

### STORY-004: Serialization

**Priority:** High
**Duration:** 1-2 weeks

**Tasks:**

- [ ] Serialize Document to JSON
- [ ] Deserialize JSON to Document
- [ ] Convert to ProseMirror JSON format
- [ ] Convert from ProseMirror JSON format
- [ ] Convert to HTML (for export)
- [ ] Convert from HTML (for import)

**Acceptance Criteria:**

- Bidirectional conversion works
- No data loss in conversion

---

### STORY-005: Command Engine

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Implement Command interface
- [ ] Implement CommandEngine with execute/undo/redo
- [ ] Create InsertText command
- [ ] Create DeleteText command
- [ ] Create InsertNode command
- [ ] Create DeleteNode command

**Acceptance Criteria:**

- Commands can be executed
- Commands can be undone/redone

---

### STORY-006: Transaction Engine

**Priority:** High
**Duration:** 1-2 weeks

**Tasks:**

- [ ] Implement Transaction class
- [ ] Implement step-based mutations
- [ ] Implement transaction history
- [ ] Implement transaction composition

**Acceptance Criteria:**

- Transactions track all changes
- Transactions can be composed

---

## Dependencies

None (this is the first implementation phase)

## Deliverables

- `@umo/core` package
- Document, Node, Tree classes
- Schema system
- Command and Transaction engines
