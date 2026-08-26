// Parse word/comments.xml and word/commentsExtended.xml into the editor's ReviewLayer.

import { DEFAULT_CHAR_STYLE, freshId, type Comment, type CommentThread, type ReviewAnchor, type ReviewLayer, type Run, type UserInfo } from "@kindy/shared";
import { attr, children, el, parseXml, rootEl, textOf } from "./xml";
import { decodeRunProps } from "./props";
import { halfPointsToPx } from "./units";

export interface RawDocxComment {
  id: string;
  author: string;
  initials?: string;
  date?: string;
  paraId?: string;
  runs: Run[];
}

export interface CommentExInfo {
  paraId: string;
  paraIdParent?: string;
  done?: boolean;
}

export function parseCommentsXml(xmlText: string): Map<string, RawDocxComment> {
  const out = new Map<string, RawDocxComment>();
  const nodes = parseXml(xmlText, "comments.xml");
  const root = rootEl(nodes, "w:comments");
  if (!root) return out;

  for (const node of children(root)) {
    if (node.tagName !== "w:comment") continue;
    const id = attr(node, "w:id");
    if (id === undefined) continue;

    const author = attr(node, "w:author") || "Anonymous";
    const initials = attr(node, "w:initials");
    const date = attr(node, "w:date");

    const runs: Run[] = [];
    let paraId: string | undefined;

    for (const p of children(node)) {
      if (p.tagName !== "w:p") continue;
      if (!paraId) paraId = attr(p, "w14:paraId");

      for (const r of children(p)) {
        if (r.tagName !== "w:r") continue;
        // Ignore the annotation reference marker itself (<w:annotationRef/>)
        if (el(r, "w:annotationRef")) continue;

        const rPr = el(r, "w:rPr");
        const props = rPr ? decodeRunProps(rPr) : {};

        let runText = "";
        for (const c of children(r)) {
          if (c.tagName === "w:t") {
            runText += textOf(c);
          } else if (c.tagName === "w:br") {
            runText += "\n";
          } else if (c.tagName === "w:tab") {
            runText += "\t";
          }
        }

        if (runText.length > 0) {
          const colorHex = props.color && props.color !== "auto" ? (props.color.startsWith("#") ? props.color : `#${props.color}`) : undefined;
          runs.push({
            text: runText,
            style: {
              ...DEFAULT_CHAR_STYLE,
              bold: props.bold ?? false,
              italic: props.italic ?? false,
              underline: props.underline ?? false,
              strikethrough: props.strikethrough ?? false,
              ...(colorHex ? { color: colorHex } : {}),
              ...(props.fontAscii ? { fontFamily: props.fontAscii } : {}),
              ...(props.sizeHalfPoints ? { fontSizePx: halfPointsToPx(props.sizeHalfPoints) } : {}),
            },
          });
        }
      }
    }

    if (runs.length === 0) {
      runs.push({ text: "", style: DEFAULT_CHAR_STYLE });
    }

    out.set(id, {
      id,
      author,
      runs,
      ...(initials !== undefined ? { initials } : {}),
      ...(date !== undefined ? { date } : {}),
      ...(paraId !== undefined ? { paraId } : {}),
    });
  }

  return out;
}

export function parseCommentsExtendedXml(xmlText: string): Map<string, CommentExInfo> {
  const out = new Map<string, CommentExInfo>();
  const nodes = parseXml(xmlText, "commentsExtended.xml");
  const root = rootEl(nodes, "w15:commentsEx") ?? rootEl(nodes, "w:commentsEx");
  if (!root) return out;

  for (const node of children(root)) {
    if (node.tagName !== "w15:commentEx" && node.tagName !== "w:commentEx") continue;
    const paraId = attr(node, "w15:paraId") ?? attr(node, "w:paraId");
    if (!paraId) continue;
    const paraIdParent = attr(node, "w15:paraIdParent") ?? attr(node, "w:paraIdParent");
    const doneVal = attr(node, "w15:done") ?? attr(node, "w:done");
    const done = doneVal === "1" || doneVal === "true";
    out.set(paraId, {
      paraId,
      done,
      ...(paraIdParent !== undefined ? { paraIdParent } : {}),
    });
  }

  return out;
}

export function buildReviewLayer(
  comments: Map<string, RawDocxComment>,
  commentsExt: Map<string, CommentExInfo>,
  anchors: Map<string, ReviewAnchor>,
  fallbackAnchor?: ReviewAnchor,
): ReviewLayer | undefined {
  if (comments.size === 0) return undefined;

  // Index by paraId to resolve parent/child relationships
  const commentByParaId = new Map<string, RawDocxComment>();
  for (const c of comments.values()) {
    if (c.paraId) commentByParaId.set(c.paraId, c);
  }

  // Identify replies vs root comments
  const parentOf = new Map<string, string>(); // commentId -> parentCommentId
  for (const c of comments.values()) {
    if (!c.paraId) continue;
    const ext = commentsExt.get(c.paraId);
    if (ext?.paraIdParent) {
      const parent = commentByParaId.get(ext.paraIdParent);
      if (parent && parent.id !== c.id) {
        parentOf.set(c.id, parent.id);
      }
    }
  }

  // Build threads
  const threadMap = new Map<string, Comment[]>(); // rootCommentId -> Comment[]
  const rootCommentOrder: string[] = [];

  for (const [id, c] of comments) {
    const parentId = parentOf.get(id);
    if (!parentId) {
      // Root comment
      if (!threadMap.has(id)) {
        threadMap.set(id, []);
        rootCommentOrder.push(id);
      }
      const modelComment = toModelComment(c);
      threadMap.get(id)!.push(modelComment);
    }
  }

  // Place replies into their parent's thread
  for (const [id, c] of comments) {
    const parentId = parentOf.get(id);
    if (parentId) {
      let targetRoot = parentId;
      while (parentOf.has(targetRoot)) {
        targetRoot = parentOf.get(targetRoot)!;
      }
      if (!threadMap.has(targetRoot)) {
        threadMap.set(targetRoot, []);
        rootCommentOrder.push(targetRoot);
      }
      threadMap.get(targetRoot)!.push(toModelComment(c));
    }
  }

  const threads: CommentThread[] = [];

  for (const rootId of rootCommentOrder) {
    const list = threadMap.get(rootId);
    if (!list || list.length === 0) continue;

    const rawRoot = comments.get(rootId);
    const ext = rawRoot?.paraId ? commentsExt.get(rawRoot.paraId) : undefined;
    const status = ext?.done ? "resolved" : "open";

    const anchor = anchors.get(rootId) ?? fallbackAnchor;
    if (!anchor) continue; // no anchor and no fallback

    threads.push({
      id: freshId(),
      anchor,
      status,
      comments: list,
    });
  }

  if (threads.length === 0) return undefined;

  return {
    docId: "imported",
    baseVersion: 0,
    suggestions: [],
    threads,
  };
}

function toModelComment(raw: RawDocxComment): Comment {
  let createdAt = Date.now();
  if (raw.date) {
    const t = Date.parse(raw.date);
    if (!isNaN(t)) createdAt = t;
  }

  const parts = raw.author.trim().split(/\s+/);
  const firstName = parts[0] || "Anonymous";
  const lastName = parts.slice(1).join(" ");
  const author: UserInfo = {
    id: raw.author || "anonymous",
    firstName,
    lastName,
  };

  return {
    id: freshId(),
    author,
    body: raw.runs,
    createdAt,
  };
}
