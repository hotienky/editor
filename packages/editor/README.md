# @kindy/docx-editor

Canvas-rendered Word-accurate document editor — an embeddable library.

## Quick Start

```bash
npm install @kindy/docx-editor
```

## Embed

```js
import { KindyEditor } from "@kindy/docx-editor";

const editor = new KindyEditor({
  container: document.getElementById("editor"),
});
```

### External fonts / CDN

```js
const editor = new KindyEditor({
  container: document.getElementById("editor"),
  fonts: {
    manifests: ["https://cdn.example.com/kindy-fonts/v1/manifest.json"],
    baseUrl: "https://cdn.example.com/kindy-fonts/v1/",
    fonts: [{
      family: "Inter",
      faces: { regular: "Inter-Regular.ttf", bold: "Inter-Bold.ttf" },
      sizing: { ascent: 0.969, descent: 0.241 },
    }],
  },
});
```

External TTF/OTF faces are used consistently by Canvas layout and PDF export;
DOCX keeps the declared family name and the same layout metrics. Authenticated
asset hosts can be integrated through `fonts.loader`. See
[Fonts and CDN](./docs/fonts.md).

## Exports

| Path | Description |
|---|---|
| `@kindy/docx-editor` | Main editor (KindyEditor class) |
| `@kindy/docx-editor/builder` | Fluent document composer |
| `@kindy/docx-editor/import` | .docx → document model |
| `@kindy/docx-editor/export` | Document → .docx/.pdf |
| `@kindy/docx-editor/events` | Typed public events + optional HTTP sink |
| `@kindy/docx-editor/events/schema` | JSON Schema for envelope v1 |

## Integrations

Use the versioned `editor.events` API for autosave, audit bridges, workflow hooks,
analytics, and external backends. See [Public events](./docs/public-events.md) and
the [HTTP sink guide](./docs/http-event-sink.md). For complete anchored
discussions, host-owned @mention UI, permission callbacks, and notification event
payloads, see [Review comments and @mentions](./docs/review-comments.md).

Table row/column/table selection, span-safe structural mutations, public
`TableSelection`/`TableAction` APIs, and current nested-table limitations are
documented in [Table editing](./docs/table-editing.md).

## Architecture

```
packages/
├── shared/    → @kindy/shared (document model, ops, OT)
└── editor/    → @kindy/docx-editor (embeddable library)
```
