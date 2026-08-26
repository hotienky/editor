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
  });
});
