import { userDisplayName, type CommentThread, type Run } from "@kindy/shared";
import { el, XML_DECL } from "./xmlWrite";

export interface CommentsXmlResult {
  commentsXml: string;
  commentsExtendedXml: string;
  commentsIdsXml: string;
  threadCommentIdMap: Map<string, number[]>; // threadId -> all comment integer ids in this thread
}

export function buildCommentsXml(threads: CommentThread[]): CommentsXmlResult {
  let idCounter = 0;
  let paraIdCounter = 1;
  const nextParaId = (): string => (paraIdCounter++).toString(16).toUpperCase().padStart(8, "0");

  let commentEntries = "";
  let commentExEntries = "";
  let commentIdsEntries = "";
  const threadCommentIdMap = new Map<string, number[]>();

  for (const thread of threads) {
    if (thread.comments.length === 0) continue;
    const isDone = thread.status === "resolved";
    let rootParaId: string | undefined;
    const commentIds: number[] = [];

    for (let i = 0; i < thread.comments.length; i++) {
      const comment = thread.comments[i]!;
      const commentId = idCounter++;
      commentIds.push(commentId);
      const paraId = nextParaId();
      if (i === 0) {
        rootParaId = paraId;
      }

      const authorName = userDisplayName(comment.author);
      const initials =
        authorName
          .split(/\s+/)
          .map((s: string) => s[0] || "")
          .join("")
          .slice(0, 3)
          .toUpperCase() || "A";
      const dateStr = new Date(comment.createdAt).toISOString();

      let runsXml = "";
      // Annotation ref marker
      runsXml += el("w:r", undefined, el("w:rPr", undefined, el("w:rStyle", { "w:val": "CommentReference" })) + el("w:annotationRef"));

      for (const run of comment.body) {
        runsXml += formatCommentRun(run);
      }

      const pPr = el("w:pPr", undefined, el("w:pStyle", { "w:val": "CommentText" }));
      const p = el("w:p", { "w14:paraId": paraId }, pPr + runsXml);

      commentEntries += el(
        "w:comment",
        {
          "w:id": commentId,
          "w:author": authorName,
          "w:date": dateStr,
          "w:initials": initials,
        },
        p,
      );

      commentExEntries += el("w15:commentEx", {
        "w15:paraId": paraId,
        ...(i > 0 && rootParaId ? { "w15:paraIdParent": rootParaId } : {}),
        "w15:done": isDone ? "1" : "0",
      });

      commentIdsEntries += el("w16cid:commentId", {
        "w16cid:paraId": paraId,
        "w16cid:durableId": paraId,
      });
    }

    threadCommentIdMap.set(thread.id, commentIds);
  }

  const commentsXml =
    XML_DECL +
    el(
      "w:comments",
      {
        "xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "xmlns:w14": "http://schemas.microsoft.com/office/word/2010/wordml",
        "xmlns:w15": "http://schemas.microsoft.com/office/word/2012/wordml",
      },
      commentEntries,
    );

  const commentsExtendedXml =
    XML_DECL +
    el(
      "w15:commentsEx",
      {
        "xmlns:w15": "http://schemas.microsoft.com/office/word/2012/wordml",
      },
      commentExEntries,
    );

  const commentsIdsXml =
    XML_DECL +
    el(
      "w16cid:commentsIds",
      {
        "xmlns:w16cid": "http://schemas.microsoft.com/office/word/2016/08/main",
      },
      commentIdsEntries,
    );

  return { commentsXml, commentsExtendedXml, commentsIdsXml, threadCommentIdMap };
}

function formatCommentRun(run: Run): string {
  let rPr = "";
  if (run.style.bold) rPr += el("w:b");
  if (run.style.italic) rPr += el("w:i");
  if (run.style.underline) rPr += el("w:u", { "w:val": "single" });
  if (run.style.strikethrough) rPr += el("w:strike");

  const lines = run.text.split("\n");
  let content = "";
  for (let j = 0; j < lines.length; j++) {
    if (j > 0) content += el("w:br");
    const segment = lines[j]!;
    if (segment.length > 0) {
      const preserve = segment.startsWith(" ") || segment.endsWith(" ") || segment.includes("  ");
      content += el("w:t", preserve ? { "xml:space": "preserve" } : undefined, segment);
    }
  }

  return el("w:r", undefined, (rPr ? el("w:rPr", undefined, rPr) : "") + content);
}
