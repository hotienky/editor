import { afterEach, describe, expect, it, vi } from "vitest";
import { WS_MSG, type Change } from "@kindy/shared";
import { SyncClient, type SyncEditor } from "./SyncClient";

class FakeWS {
  static OPEN = 1;
  static last: FakeWS | null = null;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  constructor(_url: string) { FakeWS.last = this; }
  send(value: string): void { this.sent.push(value); }
  close(): void { this.readyState = 3; this.onclose?.(); }
  open(): void { this.onopen?.(); }
  deliver(value: unknown): void { this.onmessage?.({ data: JSON.stringify(value) }); }
}

vi.stubGlobal("WebSocket", FakeWS);
afterEach(() => { FakeWS.last = null; });

const localChange = (): Change => ({
  id: "change-local-1",
  docId: "local",
  baseVersion: 0,
  seq: 0,
  siteId: "site-local",
  origin: "typing",
  ts: 123,
  ops: [{ type: "insertText", at: { blockId: "p1", offset: 0 }, text: "x" }],
});

describe("SyncClient change correlation", () => {
  it("retains the recorder id and reports the canonical acknowledgement", () => {
    const committed = vi.fn();
    const editor: SyncEditor = {
      applyRemoteOps: vi.fn(),
      applyRemoteReviewOp: vi.fn(),
      setPeerPresence: vi.fn(),
      removePeer: vi.fn(),
    };
    const client = new SyncClient({
      wsUrl: "ws://example.test",
      docId: "doc-1",
      editor,
      startVersion: 4,
      onCommitted: committed,
    });
    client.connect();
    const ws = FakeWS.last!;
    ws.open();
    client.localEdit(localChange());

    const submitted = JSON.parse(ws.sent.at(-1)!).change as Change;
    expect(submitted.id).toBe("change-local-1");
    expect(submitted.docId).toBe("doc-1");
    expect(submitted.baseVersion).toBe(4);
    expect(submitted.origin).toBe("typing");

    const canonical = { ...submitted, seq: 4 };
    ws.deliver({ type: WS_MSG.Change, change: canonical });
    expect(committed).toHaveBeenCalledWith(canonical);
    expect(client.getVersion()).toBe(5);
  });
});
