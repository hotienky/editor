# kindy-editor

Canvas-rendered Word-accurate document editor — an embeddable library.

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
});
```

## Exports

| Path | Description |
|---|---|
| `kindy-editor` | Main editor (KindyEditor class) |
| `kindy-editor/builder` | Fluent document composer |
| `kindy-editor/import` | .docx → document model |
| `kindy-editor/export` | Document → .docx/.pdf |

## Architecture

```
packages/
├── shared/    → @kindy/shared (document model, ops, OT)
└── editor/    → kindy-editor (embeddable library)
```
