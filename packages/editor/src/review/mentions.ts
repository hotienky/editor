// @-mention autocomplete for comment composers. Attaches to a <textarea>: typing
// "@" + a query pops a dropdown of the editor's knownUsers; picking one inserts
// "@Display Name " and records the user. Reusable by both the floating comment
// composer (index.ts) and the inline reply box (the Review panel). The body text
// carries the "@Name" spans; getMentions() returns the structured UserInfo list
// (filtered to mentions still present in the text) for Comment.mentions.

import { colorForId, userDisplayName, type UserInfo } from "@kindy/shared";
import type { MentionPicker, MentionPickerContext } from "./integration";

export interface MentionAutocomplete {
  /** Users currently @-mentioned in the textarea (resolved identities). */
  getMentions(): UserInfo[];
  destroy(): void;
}

export interface MentionAutocompleteOptions {
  picker?: MentionPicker;
  context?: MentionPickerContext;
  documentId?: () => string | null;
  threadId?: string;
  /** Structured mentions already present when editing an existing comment. */
  initialMentions?: UserInfo[];
}

const initials = (u: UserInfo): string => ((u.firstName[0] ?? "?") + (u.lastName[0] ?? "")).toUpperCase();
let mentionMenuSequence = 0;

interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
}

/** Pure placement policy shared by render and unit tests. The picker never
 * intersects its composer/reply surface and remains inside the viewport. */
export function computeMentionMenuPlacement(input: {
  textarea: RectLike;
  avoid?: RectLike;
  viewportWidth: number;
  viewportHeight: number;
  menuHeight: number;
}): { left: number; top: number; width: number } {
  const { textarea, avoid, viewportWidth, viewportHeight } = input;
  const menuHeight = Math.min(220, input.menuHeight || 220);
  const width = Math.min(Math.max(220, textarea.width), Math.max(0, viewportWidth - 16));
  const left = Math.max(8, Math.min(textarea.left, viewportWidth - width - 8));
  const below = (avoid?.bottom ?? textarea.bottom) + 6;
  const above = (avoid?.top ?? textarea.top) - menuHeight - 6;
  const top = below + menuHeight <= viewportHeight - 8
    ? below
    : above >= 8
      ? above
      : Math.max(8, Math.min(textarea.bottom + 4, viewportHeight - menuHeight - 8));
  return { left, top, width };
}

export function attachMentionAutocomplete(
  ta: HTMLTextAreaElement,
  getUsers: () => UserInfo[],
  options: MentionAutocompleteOptions = {},
): MentionAutocomplete {
  const chosen = new Map<string, UserInfo>((options.initialMentions ?? []).map((user) => [user.id, user]));
  let menu: HTMLDivElement | null = null;
  let items: UserInfo[] = [];
  let active = 0;
  let tokenStart = -1; // index of the '@' that opened the current token
  let hostRequest: AbortController | null = null;
  let hostRequestNo = 0;
  const view = ta.ownerDocument?.defaultView ?? (typeof window !== "undefined" ? window : null);
  ta.setAttribute?.("aria-autocomplete", "list");
  ta.setAttribute?.("aria-haspopup", "listbox");
  ta.setAttribute?.("aria-expanded", "false");

  const close = (): void => {
    hostRequest?.abort();
    hostRequest = null;
    menu?.remove();
    menu = null;
    ta.removeAttribute?.("aria-controls");
    ta.removeAttribute?.("aria-activedescendant");
    ta.setAttribute?.("aria-expanded", "false");
    items = [];
    tokenStart = -1;
  };

  /** The "@query" token immediately before the caret (or null). '@' must start
   *  the value or follow whitespace; the query runs to the caret with no space. */
  const tokenAtCaret = (): { start: number; query: string } | null => {
    const v = ta.value;
    const caret = ta.selectionStart;
    let i = caret - 1;
    while (i >= 0 && !/\s/.test(v[i]!) && v[i] !== "@") i--;
    if (i < 0 || v[i] !== "@") return null;
    if (i > 0 && !/\s/.test(v[i - 1]!)) return null;
    return { start: i, query: v.slice(i + 1, caret) };
  };

  const placeMenu = (): void => {
    if (!menu) return;
    const r = ta.getBoundingClientRect();
    const doc = ta.ownerDocument ?? document;
    const viewportWidth = doc.documentElement.clientWidth || view?.innerWidth || 0;
    const viewportHeight = doc.documentElement.clientHeight || view?.innerHeight || 0;
    // The textarea lives above the composer footer. Anchoring directly to its
    // bottom makes the picker cover Cancel/Comment (the bug visible in the
    // screenshot). Treat the whole composer/reply editor as an avoid-rect and
    // place the picker outside it, preferring below and flipping above.
    const avoid = ta.closest?.(".ked-comment-bubble, .ked-comment-edit, .ked-reply-box")?.getBoundingClientRect();
    const placement = computeMentionMenuPlacement({
      textarea: r,
      ...(avoid ? { avoid } : {}),
      viewportWidth,
      viewportHeight,
      menuHeight: menu.scrollHeight,
    });
    menu.style.width = `${placement.width}px`;
    menu.style.left = `${placement.left}px`;
    menu.style.top = `${placement.top}px`;
  };

  const render = (): void => {
    if (!menu) {
      menu = document.createElement("div");
      menu.className = "ked-mention-menu";
      menu.id = `ked-mention-menu-${++mentionMenuSequence}`;
      menu.setAttribute("role", "listbox");
      menu.setAttribute("aria-label", "Mention a person");
      menu.addEventListener("mousedown", (e) => e.preventDefault()); // keep textarea focus
      // Keep the popup in the editor subtree so it inherits the instance's
      // design tokens and typography. Portalling to document.body made every
      // CSS var invalid, producing the unstyled rows shown in the screenshot.
      (ta.closest?.(".kindy-editor-root") ?? document.body).appendChild(menu);
      ta.setAttribute("aria-controls", menu.id);
      ta.setAttribute("aria-expanded", "true");
    }
    menu.textContent = "";
    ta.removeAttribute("aria-activedescendant");
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "ked-mention-empty";
      empty.textContent = "No people found";
      menu.appendChild(empty);
    }
    items.forEach((u, idx) => {
      const row = document.createElement("div");
      row.className = "ked-mention-item" + (idx === active ? " active" : "");
      row.id = `${menu!.id}-option-${idx}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(idx === active));
      if (idx === active) ta.setAttribute("aria-activedescendant", row.id);
      const av = document.createElement("span");
      av.className = "ked-mention-av";
      av.style.background = colorForId(u.id);
      av.textContent = initials(u);
      const name = document.createElement("span");
      name.textContent = userDisplayName(u);
      row.append(av, name);
      row.addEventListener("click", () => pick(u));
      menu!.appendChild(row);
    });
    placeMenu();
  };

  const update = (): void => {
    const tok = tokenAtCaret();
    if (!tok) return close();
    if (options.picker) {
      hostRequest?.abort();
      const controller = new AbortController();
      hostRequest = controller;
      const requestNo = ++hostRequestNo;
      tokenStart = tok.start;
      const caret = ta.selectionStart;
      void options.picker({
        query: tok.query,
        anchorRect: ta.getBoundingClientRect(),
        context: options.context ?? "new-comment",
        documentId: options.documentId?.() ?? null,
        ...(options.threadId ? { threadId: options.threadId } : {}),
        selectedUserIds: [...chosen.values()]
          .filter((user) => ta.value.includes(`@${userDisplayName(user)}`))
          .map((user) => user.id),
        signal: controller.signal,
      }).then((user) => {
        if (!user || controller.signal.aborted || requestNo !== hostRequestNo) return;
        // Only apply the result if the caret/token still represents the request.
        const current = tokenAtCaret();
        if (!current || current.start !== tok.start || ta.selectionStart !== caret) return;
        pick(user);
      }).catch((error) => {
        if (!controller.signal.aborted) console.error("[kindy-editor:mentionPicker]", error);
      });
      return;
    }
    const q = tok.query.toLowerCase();
    items = getUsers()
      .filter((u) => userDisplayName(u).toLowerCase().includes(q))
      .slice(0, 6);
    tokenStart = tok.start;
    active = 0;
    render();
  };

  const pick = (u: UserInfo): void => {
    if (tokenStart < 0) return;
    const v = ta.value;
    const caret = ta.selectionStart;
    const before = v.slice(0, tokenStart);
    const insert = `@${userDisplayName(u)} `;
    ta.value = before + insert + v.slice(caret);
    const pos = (before + insert).length;
    ta.setSelectionRange(pos, pos);
    chosen.set(u.id, u);
    close();
    ta.focus();
    ta.dispatchEvent(new Event("input")); // re-enable the composer's submit button
  };

  const onInput = (): void => update();
  // Capture phase so an open menu pre-empts the composer's own Enter handler.
  const onKeydown = (e: KeyboardEvent): void => {
    if (!menu) return;
    if (items.length === 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = (active + 1) % items.length;
      render();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = (active - 1 + items.length) % items.length;
      render();
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      pick(items[active]!);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };
  const onBlur = (): void => {
    setTimeout(close, 120); // allow a click on a menu row to land before closing
  };

  ta.addEventListener("input", onInput);
  ta.addEventListener("keydown", onKeydown, true);
  ta.addEventListener("blur", onBlur);
  view?.addEventListener("resize", placeMenu);
  view?.addEventListener("scroll", placeMenu, true);

  return {
    getMentions: () => [...chosen.values()].filter((u) => ta.value.includes(`@${userDisplayName(u)}`)),
    destroy: () => {
      close();
      ta.removeEventListener("input", onInput);
      ta.removeEventListener("keydown", onKeydown, true);
      ta.removeEventListener("blur", onBlur);
      view?.removeEventListener("resize", placeMenu);
      view?.removeEventListener("scroll", placeMenu, true);
      ta.removeAttribute?.("aria-autocomplete");
      ta.removeAttribute?.("aria-haspopup");
      ta.removeAttribute?.("aria-expanded");
    },
  };
}
