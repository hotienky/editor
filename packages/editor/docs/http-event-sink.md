# HTTP event sink

`createHttpEventSink` is an optional transport adapter. It batches envelopes,
retries transient failures with exponential backoff, and sends JSON to a host-owned
endpoint. It contains no Kindy backend URL or authentication policy.

```ts
import { KindyEditor } from "kindy-editor";
import { createHttpEventSink } from "kindy-editor/events";

const sink = createHttpEventSink({
  endpoint: "https://api.example.com/integrations/kindy/events",
  headers: async () => ({
    Authorization: `Bearer ${await session.accessToken()}`,
  }),
  batchSize: 25,
  flushIntervalMs: 1000,
  maxAttempts: 4,
  onDeliveryError(error, events) {
    offlineQueue.put(events);
    console.error(error);
  },
});

const editor = new KindyEditor({
  container,
  events: { detail: "operations", sink },
});

window.addEventListener("pagehide", () => void sink.flush());
```

Request body:

```json
{
  "schemaVersion": "1.0",
  "events": [{ "schemaVersion": "1.0", "id": "...", "type": "..." }]
}
```

Delivery is at-least-once, so the receiver must deduplicate by event `id`.
Recommended endpoint behavior:

1. Authenticate the request and derive the real tenant/user from the session.
2. Validate every envelope against `kindy-editor/events/schema`.
3. Verify the user can access `document.id`; never trust browser `actor` for auth.
4. Insert events and an outbox row in one database transaction using a unique
   constraint on `(tenant_id, event_id)`.
5. Return 2xx only after durable acceptance; process webhooks/analytics from the
   outbox asynchronously.

The in-memory adapter is intentionally small. Applications that require delivery
across browser crashes should persist failed batches in IndexedDB or send critical
events through their normal document-save API instead.

