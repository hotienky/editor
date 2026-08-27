# Public events and external integrations

Kindy Editor exposes a versioned event stream for host applications that need
autosave, audit, workflow, analytics, notifications, or backend integration.
The existing `editor.on("presence", ...)` API remains supported; new integrations
should use `editor.events` because it provides typed namespaced events and a stable
envelope.

## Quick start

```ts
import { KindyEditor } from "kindy-editor";

const editor = new KindyEditor({
  container: document.querySelector("#editor")!,
  user: { id: "u-42", firstName: "An", lastName: "Nguyen" },
  events: { detail: "operations" },
});

const stop = editor.events.on("document.change.applied", (event) => {
  console.log(event.transaction?.id, event.data.operations);
});

const controller = new AbortController();
editor.events.onAny((event) => analytics.track(event.type, event), {
  signal: controller.signal,
});

// stop(); or controller.abort();
```

Listener exceptions are isolated: one broken subscriber does not block editor
state or other subscribers. Do not perform heavy synchronous work in a listener;
send it to a queue/sink instead.

## Envelope v1

Every event has the same outer shape:

```json
{
  "schemaVersion": "1.0",
  "id": "client-minted-event-id",
  "type": "document.change.applied",
  "occurredAt": "2026-08-26T05:30:00.000Z",
  "source": "local",
  "actor": { "id": "u-42", "firstName": "An", "lastName": "Nguyen" },
  "document": { "id": "doc-7", "baseVersion": 12 },
  "transaction": { "id": "change-91", "status": "optimistic" },
  "data": {},
  "metadata": {}
}
```

- `id` deduplicates delivery of the envelope.
- `transaction.id` correlates optimistic apply and server commit. For document
  changes it is the same client-minted id used by collaboration idempotency.
- `document.id` is `null` for an offline document that has not been shared.
- `seq`/`document.version` from the server is canonical. Browser timestamps and
  actor values are useful context, but the backend must authenticate the actor and
  assign durable ordering itself.
- `document.change.rejected` is reserved in v1; it will be emitted once the sync
  protocol returns an explicit rejection message.

The distributable JSON Schema is exported as `kindy-editor/events/schema` and is
also available at `types/event.schema.json` in the package.

## Payload detail and privacy

The default is `metadata`; it includes counts and affected block ids, but no raw
document operations or selections.

```ts
new KindyEditor({
  container,
  events: {
    detail: "full",             // metadata | operations | full
    includeSelection: true,      // off by default; high-frequency and sensitive
    redact(event) {
      if (event.type === "selection.changed") return null;
      return { ...event, actor: undefined };
    },
  },
});
```

`operations` adds forward model operations. `full` also adds selections and the
canonical `Change` when available. A host should use the least detailed setting
it needs, redact user data before transport, and avoid sending document content to
general-purpose analytics services.

## Event catalog

| Domain | Events |
|---|---|
| Editor | `editor.ready`, `editor.destroyed`, `editor.mode.changed`, `editor.error` |
| Open/import | `document.open.*`, `document.import.*` |
| Export | `document.export.*` |
| Changes | `document.change.applied`, `document.change.committed`, `document.change.rejected`, `document.remoteChange.applied` |
| Review | `review.operation.applied`, `review.suggestion.*`, `review.thread.*`, `review.comment.*` |
| Collaboration | `collaboration.connecting`, `collaboration.connected`, `collaboration.disconnected`, `collaboration.user.*`, `collaboration.presence.changed` |
| Other | `document.shared`, `selection.changed`, `custom` |

Review emits both `review.operation.applied` (complete audit payload) and a derived
semantic event. A root comment emits both `review.thread.created` and
`review.comment.added`; replies set `isReply: true`. Comment events include stable
thread/comment/author ids and structured mention user ids. An edit additionally
includes `newlyMentionedUserIds`, and tombstoning emits
`review.comment.deleted`. See [Review comments and @mentions](./review-comments.md)
for the integration and notification flow.

## What each layer owns

The editor library owns content changes, review operations, editor state,
import/export, and live collaboration/presence events. The embedding application
should emit its own domain events for rename/archive/delete, permissions,
approval workflow, AI job lifecycle, and attachment upload. The backend owns
authenticated identity, canonical sequence, authorization, durable audit, and an
outbox for downstream delivery.

Do not treat a browser event sink as the only audit log. It is observability and
integration plumbing; the backend change/review log remains the source of truth.

## Compatibility

Event names and required envelope fields are stable for schema major version 1.
New optional data fields and new event names may be added in minor releases.
Consumers should ignore unknown fields/events. A breaking rename or semantic
change requires a new schema major version.
