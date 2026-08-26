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
| `kindy-editor/events` | Typed public events + optional HTTP sink |
| `kindy-editor/events/schema` | JSON Schema for envelope v1 |

## Integrations

Use the versioned `editor.events` API for autosave, audit bridges, workflow hooks,
analytics, and external backends. See [Public events](./docs/public-events.md) and
the [HTTP sink guide](./docs/http-event-sink.md). For complete anchored
discussions, host-owned @mention UI, permission callbacks, and notification event
payloads, see [Review comments and @mentions](./docs/review-comments.md).

## Architecture

```
packages/
├── shared/    → @kindy/shared (document model, ops, OT)
└── editor/    → kindy-editor (embeddable library)
```
