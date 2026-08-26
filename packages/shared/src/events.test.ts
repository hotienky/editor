import { describe, expect, it } from "vitest";
import { affectedBlockIds, projectReviewEvents } from "./events";

describe("public event projections", () => {
  it("collects affected document block ids", () => {
    expect(affectedBlockIds([
      { type: "insertText", at: { blockId: "p1", offset: 0 }, text: "x" },
      { type: "setTableColFractions", blockId: "t1", fractions: [1] },
      { type: "setSectionProps", geometry: {} as never },
    ])).toEqual(["p1", "t1"]);
  });

  it("projects a review operation into generic and semantic events", () => {
    const projected = projectReviewEvents({
      type: "addComment",
      threadId: "thread-1",
      c: {
        id: "comment-1",
        author: { id: "u1", firstName: "A", lastName: "B" },
        body: [],
        createdAt: 1,
      },
    }, false);
    expect(projected.map((event) => event.type)).toEqual([
      "review.operation.applied",
      "review.comment.added",
    ]);
    expect(projected[1]).toEqual({
      type: "review.comment.added",
      data: {
        threadId: "thread-1",
        commentId: "comment-1",
        authorId: "u1",
        isReply: true,
        mentionedUserIds: [],
        remote: false,
      },
    });
  });

  it("projects a root comment as thread-created plus comment-added", () => {
    const mentioned = { id: "u2", firstName: "Mentioned", lastName: "User" };
    const projected = projectReviewEvents({
      type: "addThread",
      t: {
        id: "thread-1",
        anchor: {
          start: { blockId: "p1", offset: 0 },
          end: { blockId: "p1", offset: 3 },
        },
        status: "open",
        comments: [{
          id: "root-1",
          author: { id: "u1", firstName: "Root", lastName: "Author" },
          body: [],
          createdAt: 1,
          mentions: [mentioned],
        }],
      },
    }, false);
    expect(projected.map((event) => event.type)).toEqual([
      "review.operation.applied",
      "review.thread.created",
      "review.comment.added",
    ]);
    expect(projected[2]).toMatchObject({
      data: { authorId: "u1", isReply: false, mentionedUserIds: ["u2"] },
    });
  });

  it("projects edit mention deltas and tombstone actor ids", () => {
    const edited = projectReviewEvents({
      type: "editComment",
      threadId: "t1",
      commentId: "c1",
      body: [],
      mentions: [
        { id: "u2", firstName: "Existing", lastName: "User" },
        { id: "u3", firstName: "New", lastName: "User" },
      ],
      newlyMentionedUserIds: ["u3"],
    }, false);
    expect(edited[1]).toMatchObject({
      type: "review.comment.edited",
      data: { mentionedUserIds: ["u2", "u3"], newlyMentionedUserIds: ["u3"] },
    });

    const deleted = projectReviewEvents({
      type: "deleteComment",
      threadId: "t1",
      commentId: "c1",
      deletedAt: 10,
      deletedBy: { id: "u1", firstName: "Delete", lastName: "Actor" },
    }, true);
    expect(deleted[1]).toEqual({
      type: "review.comment.deleted",
      data: { threadId: "t1", commentId: "c1", deletedByUserId: "u1", remote: true },
    });
  });
});
