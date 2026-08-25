# Kindy Editor v3.0.0

Canvas-rendered Word-accurate document editor — an embeddable library built on the Kindy-editor architecture.

## Features

- Canvas-rendered (no contenteditable)
- Word-accurate pagination with line-level page breaking
- DOCX import/export
- PDF export
- Track changes & comments
- Real-time collaboration (protocol built-in)
- Zero runtime dependencies

## Quick Start

```bash
npm install
npm run dev   # → http://localhost:5173/
```

## Embed

```js
import { KindyEditor } from "kindy-editor";

const editor = new KindyEditor({
  container: document.getElementById("editor"),
  // backendUrl: "https://...",  // optional: enable collaboration
});
```

## Architecture

```
packages/
├── shared/    → @kindy/shared (document model, ops, OT)
└── editor/    → kindy-editor (embeddable library)
```

- **shared**: Pure data model, zero DOM/canvas knowledge
- **editor**: Layout engine (pretext), canvas paint, input handling, import/export
