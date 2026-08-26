// Floating comment affordance — the 💬 chip beside a ranged selection
// and the inline composer it expands into. Extracted from createEditor (index.ts)
// so the editor factory no longer owns this DOM + lifecycle. Pure presentation:
// the host injects live selection/doc/layout/mode getters and the addComment sink.

import type { CharStyle, Document, DocSelection, Fragment, ReviewLayer, UserInfo } from "@kindy/shared";
import { blockById, colorForId, isCollapsed, styleAtRuns } from "@kindy/shared";
import { attachMentionAutocomplete } from "../review/mentions";
import { caretRect, selectionRects, type CaretRect, type GeoScope } from "../layout/geometry";
import type { LayoutTree } from "../layout/layoutTree";
import type { CellSelection, EditMode } from "./state";
import type { MentionPicker } from "../review/integration";
import type { ReviewAction } from "../review/integration";
import { ICONS } from "../ui/icons";

export interface CommentControllerDeps {
  container: HTMLElement;
  caretToContainer: (caret: CaretRect) => { left: number; top: number } | null;
  getSelection: () => DocSelection | null;
  getCellSelection: () => CellSelection | null | undefined;
  getTree: () => LayoutTree;
  getDoc: () => Document;
  getReview: () => ReviewLayer;
  getMode: () => EditMode;
  scope: () => GeoScope | undefined;
  reviewAuthor: () => UserInfo;
  mentionableUsers: () => UserInfo[];
  mentionPicker?: MentionPicker;
  getDocumentId: () => string | null;
  canCreateComment: () => boolean;
  addComment: (body: Fragment, mentions?: UserInfo[]) => string | null;
  replyToComment: (threadId: string, body: Fragment, mentions?: UserInfo[]) => void;
  resolveThread: (threadId: string, resolved?: boolean) => void;
  canReviewAction: (action: ReviewAction, threadId?: string, commentId?: string) => boolean;
  focusProxy: () => void;
}

export interface CommentController {
  /** Expand the full composer at the current selection (chip click, or API). */
  openComposer(): void;
  /** Open a compact anchored view of an existing discussion. */
  openThread(threadId: string): void;
  /** Tear down the open composer, if any. */
  closeComposer(): void;
  /** Remove the floating chip, if shown. */
  hideChip(): void;
  /** Show/hide the chip as the selection/mode changes. */
  updateAffordance(): void;
  /** Re-render the active inline thread after a local/remote review mutation. */
  refresh(): void;
  /** Remove popovers and viewport observers. */
  destroy(): void;
}

export function createCommentController(deps: CommentControllerDeps): CommentController {
  const {
    container, caretToContainer, getSelection, getCellSelection, getTree, getDoc, getReview, getMode,
    scope, reviewAuthor, mentionableUsers, mentionPicker, getDocumentId, canCreateComment,
    addComment, replyToComment, resolveThread, canReviewAction, focusProxy,
  } = deps;

  let bubble: HTMLDivElement | null = null;
  let bubbleCleanup: (() => void) | null = null;
  let chip: HTMLButtonElement | null = null;
  let activeThreadId: string | null = null;

  const closeComposer = (): void => {
    bubbleCleanup?.();
    bubbleCleanup = null;
    bubble?.remove();
    bubble = null;
    activeThreadId = null;
  };
  const hideChip = (): void => {
    chip?.remove();
    chip = null;
  };

  /** Container-relative anchor (top-right of the selection's first line) for the
   *  comment chip + composer, or null if there's no usable ranged selection. */
  const anchorAt = (): { left: number; top: number; lineH: number } | null => {
    const selection = getSelection();
    if (!selection || getCellSelection()) return null;
    if (isCollapsed(selection)) {
      const caret = caretRect(getTree(), selection.focus, scope());
      if (!caret) return null;
      const at = caretToContainer(caret);
      return at ? { left: at.left, top: at.top, lineH: caret.height } : null;
    }
    const rects = selectionRects(getTree(), selection, scope());
    if (rects.length === 0) return null;
    const r = rects[0]!;
    const at = caretToContainer({ pageIndex: r.pageIndex, x: r.x + r.width, y: r.y, height: r.height });
    return at ? { left: at.left, top: at.top, lineH: r.height } : null;
  };

  const styleForComment = (): CharStyle => {
    const selection = getSelection();
    const block = selection ? blockById(getDoc(), selection.focus.blockId) : undefined;
    return (
      (block && selection && styleAtRuns(block.runs, selection.focus.offset)) ?? {
        fontFamily: "Georgia, serif", fontSizePx: 16, bold: false, italic: false, underline: false, strikethrough: false, color: "#202124",
      }
    );
  };

  const placeBubble = (el: HTMLElement, anchor: { left: number; top: number; lineH: number }): void => {
    const width = el.offsetWidth || (el.classList.contains("ked-comment-thread-popover") ? 336 : 308);
    const height = el.offsetHeight || (el.classList.contains("ked-comment-thread-popover") ? 220 : 114);
    const maxLeft = Math.max(8, container.clientWidth - width - 8);
    el.style.left = `${Math.max(8, Math.min(anchor.left + 6, maxLeft))}px`;

    const viewportTop = container.scrollTop + 8;
    const viewportBottom = container.scrollTop + container.clientHeight - 8;
    const below = anchor.top + anchor.lineH + 8;
    const above = anchor.top - height - 8;
    const preferred = below + height <= viewportBottom ? below : above;
    const maxTop = Math.max(viewportTop, viewportBottom - height);
    el.style.top = `${Math.max(viewportTop, Math.min(preferred, maxTop))}px`;
  };

  const repositionBubble = (): void => {
    if (!bubble) return;
    const anchor = anchorAt();
    if (anchor) placeBubble(bubble, anchor);
  };
  const bubbleResizeObserver = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(repositionBubble)
    : null;
  bubbleResizeObserver?.observe(container);
  container.addEventListener("scroll", repositionBubble, { passive: true });
  window.addEventListener("resize", repositionBubble);

  const openThread = (threadId: string): void => {
    const thread = getReview().threads.find((item) => item.id === threadId);
    const anchor = anchorAt();
    if (!thread || !anchor) return;
    hideChip();
    closeComposer();
    activeThreadId = threadId;
    const el = document.createElement("div");
    el.className = "ked-comment-bubble ked-comment-thread-popover";
    placeBubble(el, anchor);
    el.addEventListener("mousedown", (event) => event.stopPropagation());

    const head = document.createElement("div");
    head.className = "ked-thread-popover-head";
    const title = document.createElement("strong");
    title.textContent = `Discussion · ${thread.comments.length}`;
    const close = document.createElement("button");
    close.className = "ked-review-close";
    close.textContent = "×";
    close.addEventListener("click", () => { closeComposer(); focusProxy(); });
    head.append(title, close);
    el.append(head);

    const list = document.createElement("div");
    list.className = "ked-thread-popover-list";
    for (const comment of thread.comments) {
      const row = document.createElement("div");
      row.className = "ked-thread-popover-comment";
      const who = document.createElement("strong");
      who.textContent = `${comment.author.firstName} ${comment.author.lastName}`.trim() || "Anonymous";
      const text = document.createElement("div");
      text.textContent = comment.deletedAt ? "Comment deleted" : comment.body.map((run) => run.text).join("");
      if (comment.deletedAt) text.className = "deleted";
      row.append(who, text);
      list.append(row);
    }
    el.append(list);

    if (thread.status === "open" && canReviewAction("comment.reply", threadId)) {
      const reply = document.createElement("textarea");
      reply.placeholder = "Reply… (@ to mention)";
      const mentions = attachMentionAutocomplete(reply, mentionableUsers, {
        ...(mentionPicker ? { picker: mentionPicker } : {}),
        context: "reply",
        documentId: getDocumentId,
        threadId,
      });
      bubbleCleanup = () => mentions.destroy();
      const send = document.createElement("button");
      send.className = "ked-btn ked-btn-primary ked-btn-sm";
      send.textContent = "Reply";
      const submit = (): void => {
        const text = reply.value.trim();
        if (!text) return;
        replyToComment(threadId, [{ text, style: styleForComment() }], mentions.getMentions());
        mentions.destroy();
        openThread(threadId);
      };
      send.addEventListener("click", submit);
      reply.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { event.preventDefault(); mentions.destroy(); closeComposer(); focusProxy(); }
        else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); }
      });
      const replyRow = document.createElement("div");
      replyRow.className = "ked-thread-popover-reply";
      replyRow.append(reply, send);
      el.append(replyRow);
    }

    const statusAction = thread.status === "open" ? "thread.resolve" : "thread.reopen";
    if (canReviewAction(statusAction, threadId)) {
      const status = document.createElement("button");
      status.className = "ked-btn ked-btn-ghost ked-btn-sm";
      status.textContent = thread.status === "open" ? "Resolve" : "Reopen";
      status.addEventListener("click", () => {
        resolveThread(threadId, thread.status === "open");
      });
      el.append(status);
    }
    container.appendChild(el);
    bubble = el;
    requestAnimationFrame(repositionBubble);
  };

  const openComposer = (): void => {
    if (getMode() === "view" || !canCreateComment()) return;
    const anchor = anchorAt();
    if (!anchor) return;
    hideChip();
    closeComposer();
    const style = styleForComment();

    const el = document.createElement("div");
    el.className = "ked-comment-bubble";
    placeBubble(el, anchor);
    el.addEventListener("mousedown", (e) => e.stopPropagation());

    const who = reviewAuthor();
    const row = document.createElement("div");
    row.className = "ked-bubble-row";
    const av = document.createElement("div");
    av.className = "ked-avatar";
    av.style.background = colorForId(who.id);
    av.textContent = (who.firstName[0] ?? "?") + (who.lastName[0] ?? "");
    const ta = document.createElement("textarea");
    ta.placeholder = "Add a comment…  (@ to mention)";
    row.append(av, ta);
    const mentions = attachMentionAutocomplete(ta, mentionableUsers, {
      ...(mentionPicker ? { picker: mentionPicker } : {}),
      context: "new-comment",
      documentId: getDocumentId,
    });
    bubbleCleanup = () => mentions.destroy();

    const actions = document.createElement("div");
    actions.className = "ked-bubble-actions";
    const cancel = document.createElement("button");
    cancel.className = "ked-btn ked-btn-sm";
    cancel.textContent = "Cancel";
    const submit = document.createElement("button");
    submit.className = "ked-btn ked-btn-primary ked-btn-sm";
    submit.textContent = "Comment";
    submit.disabled = true;
    actions.append(cancel, submit);
    el.append(row, actions);
    container.appendChild(el);
    bubble = el;
    requestAnimationFrame(repositionBubble);
    setTimeout(() => ta.focus(), 0);

    ta.addEventListener("input", () => {
      submit.disabled = ta.value.trim().length === 0;
    });
    const send = (): void => {
      const text = ta.value.trim();
      if (!text) return;
      const selectedMentions = mentions.getMentions();
      mentions.destroy();
      const threadId = addComment([{ text, style }], selectedMentions);
      // The editor core opens/focuses the newly-created thread so the same
      // behavior also applies to public addComment() calls.
      if (!threadId) closeComposer();
    };
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); mentions.destroy(); closeComposer(); focusProxy(); }
      else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
    });
    cancel.addEventListener("click", () => { mentions.destroy(); closeComposer(); focusProxy(); });
    submit.addEventListener("click", send);
  };

  const updateAffordance = (): void => {
    if (bubble) {
      repositionBubble();
      return; // composer/thread open → leave it; chip is irrelevant
    }
    const selection = getSelection();
    // A caret remains a valid target for the toolbar/shortcut entry points, but
    // the floating action is reserved for an explicit ranged selection so it
    // does not follow every caret movement while the user is typing.
    const anchor = selection && !isCollapsed(selection) && getMode() !== "view" && canCreateComment()
      ? anchorAt()
      : null;
    if (!anchor) {
      hideChip();
      return;
    }
    if (!chip) {
      chip = document.createElement("button");
      chip.className = "ked-comment-chip";
      chip.title = "Add comment (Ctrl+Alt+M)";
      chip.innerHTML = ICONS.comment;
      // stopPropagation is essential: without it the selection controller sees the
      // mousedown and collapses the selection, so openComposer finds nothing.
      chip.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
      chip.addEventListener("click", (e) => { e.stopPropagation(); openComposer(); });
      container.appendChild(chip);
    }
    chip.style.left = `${anchor.left + 6}px`;
    chip.style.top = `${anchor.top - 4}px`;
  };

  const refresh = (): void => {
    if (!activeThreadId) return;
    const threadId = activeThreadId;
    openThread(threadId);
  };

  const destroy = (): void => {
    closeComposer();
    hideChip();
    bubbleResizeObserver?.disconnect();
    container.removeEventListener("scroll", repositionBubble);
    window.removeEventListener("resize", repositionBubble);
  };

  return { openComposer, openThread, closeComposer, hideChip, updateAffordance, refresh, destroy };
}
