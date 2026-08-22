# CKEditor 5 Architecture Analysis

> Status: Completed
> Date: 2026-08-07

## Overview

CKEditor 5 is a modern rich-text editor with a modular architecture. It uses a custom data model and editing engine.

## Architecture

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                               │
│  (Classic, Inline, Balloon, Document)                       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Editing Engine                           │
│  (Controller, Command, Selection, History)                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Model                               │
│  (Tree, Node, Element, Text, Position)                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Pipeline                            │
│  (Upcast: HTML → Model, Downcast: Model → HTML)             │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Data Model**: Internal representation of document content
2. **Editing Engine**: Handles user interactions and document modifications
3. **UI Layer**: Different editor types (Classic, Inline, Balloon, Document)
4. **Data Pipeline**: Converts between HTML and internal model

## Document Model

### Tree Structure

CKEditor 5 uses a tree-based model:

```
Root
├── Element "paragraph"
│   └── Text "Hello "
│   └── Text "World" (with "bold" attribute)
├── Element "heading1"
│   └── Text "Title"
└── Element "blockQuote"
    └── Element "paragraph"
        └── Text "Quote"
```

### Key Concepts

1. **Immutable**: Model is immutable, changes create new versions
2. **Tree-based**: Document is a tree of elements and text
3. **Attribute-based**: Formatting is stored as attributes on text nodes
4. **Position System**: Tree-based positioning

### Schema

```typescript
schema.register('paragraph', {
  inheritAllFrom: '$block',
  allowContentOf: '$root'
})

schema.register('heading1', {
  inheritAllFrom: '$block',
  allowContentOf: '$root',
  allowAttributes: ['level']
})
```

## Editing Engine

### Commands

All editing actions are commands:

```typescript
class InsertTextCommand extends Command {
  execute({ text }) {
    const model = this.editor.model;
    const selection = model.document.selection;
    
    model.change(writer => {
      writer.insertText(text, selection.getFirstPosition());
    });
  }
}
```

### Transactions

Changes are tracked through transactions:

```typescript
editor.model.change(writer => {
  // All changes are batched in a transaction
  writer.insertText('Hello', position);
  writer.setAttribute('bold', true, range);
});
```

### History

Undo/Redo is built-in:

```typescript
editor.commands.get('undo').execute();
editor.commands.get('redo').execute();
```

## Data Pipeline

### Upcasting (HTML → Model)

```typescript
conversion.for('upcast').elementToElement({
  view: 'p',
  model: 'paragraph'
});
```

### Downcasting (Model → HTML)

```typescript
conversion.for('downcast').elementToElement({
  model: 'paragraph',
  view: 'p'
});
```

## Strengths

1. **Modular Architecture**: Only include what you need
2. **Customizable**: Highly configurable
3. **Multi-editor Support**: Classic, Inline, Balloon, Document
4. **Built-in Features**: Many features out of the box
5. **Good Documentation**: Comprehensive docs

## Weaknesses

1. **Complex Architecture**: Many layers and concepts
2. **Large Bundle Size**: Many features increase bundle size
3. **Learning Curve**: Complex API
4. **Limited WYSIWYG**: Not true WYSIWYG

## Lessons Learned for UMO

1. **Data Pipeline**: Separate data model from rendering
2. **Command Pattern**: All editing actions as commands
3. **Transaction System**: Track all changes
4. **Modular Design**: Only include what you need
5. **Multiple Editor Types**: Support different editing modes

---

## References

- [CKEditor 5 Documentation](https://ckeditor.com/docs/ckeditor5/latest/)
- [CKEditor 5 GitHub](https://github.com/ckeditor/ckeditor5)
- [CKEditor 5 Architecture](https://ckeditor.com/docs/ckeditor5/latest/framework/architecture/introduction.html)
