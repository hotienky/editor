import { describe, expect, it } from "vitest";
import type { Comment, CommentThread, UserInfo } from "@kindy/shared";
import { defaultReviewAccessCan, type ReviewAction, type ReviewActionContext } from "./integration";

const actor: UserInfo = { id: "u1", firstName: "Current", lastName: "User" };
const other: UserInfo = { id: "u2", firstName: "Other", lastName: "User" };
const comment: Comment = { id: "c1", author: actor, body: [], createdAt: 1 };
const thread: CommentThread = {
  id: "t1",
  anchor: {
    start: { blockId: "p1", offset: 0 },
    end: { blockId: "p1", offset: 1 },
  },
  status: "open",
  comments: [comment],
};

const context = (overrides: Partial<ReviewActionContext> = {}): ReviewActionContext => ({
  documentId: "d1",
  mode: "edit",
  actor,
  thread,
  comment,
  ...overrides,
});

describe("default review capabilities", () => {
  it("makes every mutation read-only in view mode", () => {
    const actions: ReviewAction[] = [
      "comment.create",
      "comment.reply",
      "comment.edit",
      "comment.delete",
      "thread.resolve",
      "thread.reopen",
    ];
    for (const action of actions) expect(defaultReviewAccessCan(action, context({ mode: "view" }))).toBe(false);
  });

  it("allows edit/suggest create, reply, resolve and reopen", () => {
    const actions: ReviewAction[] = ["comment.create", "comment.reply", "thread.resolve", "thread.reopen"];
    for (const mode of ["edit", "suggest"] as const) {
      for (const action of actions) expect(defaultReviewAccessCan(action, context({ mode }))).toBe(true);
    }
  });

  it("limits edit/delete to the non-deleted comment author", () => {
    expect(defaultReviewAccessCan("comment.edit", context())).toBe(true);
    expect(defaultReviewAccessCan("comment.delete", context())).toBe(true);
    expect(defaultReviewAccessCan("comment.edit", context({ actor: other }))).toBe(false);
    expect(defaultReviewAccessCan("comment.delete", context({
      comment: { ...comment, deletedAt: 2, deletedBy: actor },
    }))).toBe(false);
  });
});
