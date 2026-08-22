# EPIC-002: Command Engine

## Overview

Build the editing engine with commands, transactions, selection, and history.

## Duration

2-3 months

## Stories

### STORY-001: Selection

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Implement Selection class (text, node, cell)
- [ ] Selection movement (left, right, up, down)
- [ ] Selection expansion (shift+arrow)
- [ ] Selection normalization
- [ ] Selection serialization

**Acceptance Criteria:**

- Selection works correctly
- Selection can be serialized/deserialized

---

### STORY-002: Cursor

**Priority:** High
**Duration:** 1-2 weeks

**Tasks:**

- [ ] Implement Cursor class
- [ ] Cursor positioning
- [ ] Cursor blinking animation
- [ ] Cursor affinity (left/right of character)

**Acceptance Criteria:**

- Cursor appears and moves correctly
- Cursor handles edge cases

---

### STORY-003: Clipboard

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Copy to clipboard
- [ ] Paste from clipboard
- [ ] Cut to clipboard
- [ ] Handle rich text (HTML) and plain text
- [ ] Handle images
- [ ] Handle tables

**Acceptance Criteria:**

- Clipboard operations work
- Rich text is preserved

---

### STORY-004: Editing Commands

**Priority:** High
**Duration:** 3-4 weeks

**Tasks:**

- [ ] InsertText command
- [ ] DeleteText command
- [ ] InsertNode command
- [ ] DeleteNode command
- [ ] MoveNode command
- [ ] SplitNode command
- [ ] JoinNode command
- [ ] SetMark command
- [ ] ToggleMark command

**Acceptance Criteria:**

- All commands work correctly
- Commands handle edge cases

---

### STORY-005: History

**Priority:** High
**Duration:** 2-3 weeks

**Tasks:**

- [ ] Implement Undo/Redo
- [ ] Transaction history
- [ ] Group transactions
- [ ] Collaborative undo/redo

**Acceptance Criteria:**

- Undo/Redo works correctly
- History is maintained across sessions

---

### STORY-006: Keyboard Shortcuts

**Priority:** Medium
**Duration:** 1-2 weeks

**Tasks:**

- [ ] Implement keyboard shortcut system
- [ ] Default shortcuts (Ctrl+Z, Ctrl+C, etc.)
- [ ] Custom shortcuts
- [ ] Shortcut conflicts resolution

**Acceptance Criteria:**

- Keyboard shortcuts work
- Shortcuts can be customized

---

## Dependencies

- EPIC-001: Document Core

## Deliverables

- `@umo/editor` package
- Selection and Cursor classes
- Clipboard handling
- Editing commands
- History management
