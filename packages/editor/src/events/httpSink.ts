import type { PublicEditorEvent } from "@kindy/shared";
import type { EditorEventSink } from "./eventHub";

export interface HttpEventSinkOptions {
  endpoint: string;
  /** Static or lazily-resolved headers. Put your Authorization header here. */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  batchSize?: number;
  flushIntervalMs?: number;
  maxAttempts?: number;
  /** Defaults to globalThis.fetch; injectable for tests and non-browser hosts. */
  fetch?: typeof fetch;
  /** Receives batches that still fail after all retry attempts. */
  onDeliveryError?: (error: unknown, events: PublicEditorEvent[]) => void;
}

export interface HttpEventSink extends EditorEventSink {
  flush(): Promise<void>;
  destroy(): Promise<void>;
}

/** Small opt-in JSON batch adapter. Delivery is at-least-once; receivers should
 * deduplicate by envelope.id. Authentication stays entirely host-owned. */
export function createHttpEventSink(options: HttpEventSinkOptions): HttpEventSink {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("createHttpEventSink requires fetch");
  const batchSize = Math.max(1, options.batchSize ?? 25);
  const flushIntervalMs = Math.max(10, options.flushIntervalMs ?? 1000);
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  let queue: PublicEditorEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let delivery = Promise.resolve();
  let disposed = false;

  const clearTimer = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const resolveHeaders = async (): Promise<HeadersInit> => {
    const supplied = typeof options.headers === "function" ? await options.headers() : options.headers;
    const headers = new Headers(supplied);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return headers;
  };

  const deliver = async (events: PublicEditorEvent[]): Promise<void> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetchImpl(options.endpoint, {
          method: "POST",
          headers: await resolveHeaders(),
          body: JSON.stringify({ schemaVersion: events[0]?.schemaVersion ?? "1.0", events }),
        });
        if (!response.ok) throw new Error(`event sink returned HTTP ${response.status}`);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) await new Promise<void>((resolve) => setTimeout(resolve, 100 * 2 ** (attempt - 1)));
      }
    }
    options.onDeliveryError?.(lastError, events);
  };

  const flush = async (): Promise<void> => {
    clearTimer();
    if (queue.length === 0) return delivery;
    const events = queue;
    queue = [];
    delivery = delivery.then(() => deliver(events));
    await delivery;
  };

  const sink = ((event: PublicEditorEvent): void => {
    if (disposed) return;
    queue.push(event);
    if (queue.length >= batchSize) void flush();
    else if (!timer) timer = setTimeout(() => void flush(), flushIntervalMs);
  }) as HttpEventSink;
  sink.flush = flush;
  sink.destroy = async (): Promise<void> => {
    disposed = true;
    await flush();
  };
  return sink;
}
