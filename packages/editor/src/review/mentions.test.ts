import { describe, expect, it, vi } from "vitest";
import type { UserInfo } from "@kindy/shared";
import { attachMentionAutocomplete, computeMentionMenuPlacement } from "./mentions";

class FakeTextarea extends EventTarget {
  value = "";
  selectionStart = 0;
  selectionEnd = 0;
  focus = vi.fn();

  setSelectionRange(start: number, end: number): void {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  getBoundingClientRect(): DOMRectReadOnly {
    return {
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 210,
      bottom: 60,
      width: 200,
      height: 40,
      toJSON: () => ({}),
    };
  }
}

const alice: UserInfo = { id: "u-alice", firstName: "Alice", lastName: "A" };
const bob: UserInfo = { id: "u-bob", firstName: "Bob", lastName: "B" };

const type = (ta: FakeTextarea, value: string): void => {
  ta.value = value;
  ta.selectionStart = ta.selectionEnd = value.length;
  ta.dispatchEvent(new Event("input"));
};

describe("host-owned mention picker adapter", () => {
  it("passes query/context/anchor and aborts the previous request", async () => {
    const requests: Array<{ query: string; signal: AbortSignal }> = [];
    let resolveLatest: ((user: UserInfo | null) => void) | undefined;
    const picker = vi.fn((request: { query: string; signal: AbortSignal }) => {
      requests.push(request);
      return new Promise<UserInfo | null>((resolve) => { resolveLatest = resolve; });
    });
    const ta = new FakeTextarea();
    const mentions = attachMentionAutocomplete(ta as unknown as HTMLTextAreaElement, () => [], {
      picker,
      context: "reply",
      documentId: () => "doc-1",
      threadId: "thread-1",
    });

    type(ta, "@a");
    type(ta, "@al");

    expect(requests).toHaveLength(2);
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(picker.mock.calls[1]![0]).toMatchObject({
      query: "al",
      context: "reply",
      documentId: "doc-1",
      threadId: "thread-1",
      selectedUserIds: [],
    });

    resolveLatest?.(alice);
    await Promise.resolve();
    expect(ta.value).toBe("@Alice A ");
    expect(mentions.getMentions()).toEqual([alice]);
    mentions.destroy();
  });

  it("supports cancel, multiple users, and drops mentions removed from text", async () => {
    const picker = vi.fn(async ({ query }: { query: string }) => {
      if (query === "cancel") return null;
      return query.toLowerCase().startsWith("a") ? alice : bob;
    });
    const ta = new FakeTextarea();
    const mentions = attachMentionAutocomplete(ta as unknown as HTMLTextAreaElement, () => [], { picker });

    type(ta, "@cancel");
    await Promise.resolve();
    expect(mentions.getMentions()).toEqual([]);

    type(ta, "@a");
    await Promise.resolve();
    type(ta, `${ta.value}@b`);
    await Promise.resolve();
    expect(mentions.getMentions()).toEqual([alice, bob]);

    ta.value = ta.value.replace("@Alice A ", "");
    expect(mentions.getMentions()).toEqual([bob]);
    mentions.destroy();
  });

  it("preserves existing structured mentions during edit until their text is removed", () => {
    const ta = new FakeTextarea();
    ta.value = "Keep @Alice A for now";
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    const mentions = attachMentionAutocomplete(ta as unknown as HTMLTextAreaElement, () => [], {
      initialMentions: [alice],
      context: "edit-comment",
    });
    expect(mentions.getMentions()).toEqual([alice]);
    ta.value = "Mention removed";
    expect(mentions.getMentions()).toEqual([]);
    mentions.destroy();
  });
});

describe("mention picker placement", () => {
  const textarea = { left: 300, right: 540, top: 300, bottom: 352, width: 240 };

  it("places the menu below the whole composer instead of over its footer", () => {
    expect(computeMentionMenuPlacement({
      textarea,
      avoid: { left: 250, right: 570, top: 280, bottom: 420, width: 320 },
      viewportWidth: 800,
      viewportHeight: 700,
      menuHeight: 150,
    })).toEqual({ left: 300, top: 426, width: 240 });
  });

  it("flips above the composer when the lower viewport cannot fit it", () => {
    expect(computeMentionMenuPlacement({
      textarea: { ...textarea, top: 530, bottom: 582 },
      avoid: { left: 250, right: 570, top: 500, bottom: 620, width: 320 },
      viewportWidth: 800,
      viewportHeight: 700,
      menuHeight: 180,
    }).top).toBe(314);
  });

  it("clamps width and horizontal position in a narrow viewport", () => {
    const placement = computeMentionMenuPlacement({
      textarea: { ...textarea, left: 180, right: 420 },
      viewportWidth: 240,
      viewportHeight: 500,
      menuHeight: 120,
    });
    expect(placement).toMatchObject({ left: 8, width: 224 });
    expect(placement.left + placement.width).toBeLessThanOrEqual(232);
  });
});
