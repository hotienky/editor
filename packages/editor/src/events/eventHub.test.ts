import { describe, expect, it, vi } from "vitest";
import { EDITOR_EVENT_SCHEMA_VERSION, type PublicEditorEvent } from "@kindy/shared";
import { EditorEvents } from "./eventHub";
import { createHttpEventSink } from "./httpSink";

const readyEvent = (): PublicEditorEvent<"editor.ready"> => ({
  schemaVersion: EDITOR_EVENT_SCHEMA_VERSION,
  id: "event-1",
  type: "editor.ready",
  occurredAt: "2026-08-26T00:00:00.000Z",
  source: "system",
  document: { id: null, baseVersion: 0 },
  data: { mode: "edit" },
});

describe("EditorEvents", () => {
  it("delivers typed and catch-all subscriptions", () => {
    const events = new EditorEvents();
    const typed = vi.fn();
    const any = vi.fn();
    events.on("editor.ready", typed);
    events.onAny(any);
    events.dispatch(readyEvent());
    expect(typed).toHaveBeenCalledOnce();
    expect(any).toHaveBeenCalledOnce();
  });

  it("supports AbortSignal and isolates listener errors", () => {
    const onError = vi.fn();
    const controller = new AbortController();
    const events = new EditorEvents({ onError });
    const aborted = vi.fn();
    events.onAny(aborted, { signal: controller.signal });
    controller.abort();
    events.onAny(() => { throw new Error("subscriber failed"); });
    expect(() => events.dispatch(readyEvent())).not.toThrow();
    expect(aborted).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("can redact or drop events before delivery", () => {
    const listener = vi.fn();
    const events = new EditorEvents({ redact: () => null });
    events.onAny(listener);
    events.dispatch(readyEvent());
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("createHttpEventSink", () => {
  it("batches and flushes envelopes", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 202 }));
    const sink = createHttpEventSink({ endpoint: "https://example.test/events", fetch: fetchMock, batchSize: 2 });
    sink(readyEvent());
    sink({ ...readyEvent(), id: "event-2" });
    await sink.flush();
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]![1]!;
    expect(JSON.parse(init.body as string).events).toHaveLength(2);
  });
});
