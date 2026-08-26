import type { Comment, CommentThread, UserInfo } from "@kindy/shared";
import type { EditMode } from "../editor/state";

export type MentionPickerContext = "new-comment" | "reply" | "edit-comment";

export interface MentionPickerRequest {
  query: string;
  anchorRect: DOMRectReadOnly;
  context: MentionPickerContext;
  documentId: string | null;
  threadId?: string;
  selectedUserIds: string[];
  signal: AbortSignal;
}

/** Host-owned mention UI. Resolve one selected user, or null when cancelled. */
export type MentionPicker = (request: MentionPickerRequest) => Promise<UserInfo | null>;

export type ReviewAction =
  | "comment.create"
  | "comment.reply"
  | "comment.edit"
  | "comment.delete"
  | "thread.resolve"
  | "thread.reopen";

export interface ReviewActionContext {
  documentId: string | null;
  mode: EditMode;
  actor?: UserInfo;
  thread?: CommentThread;
  comment?: Comment;
}

/** UI + client-side enforcement hook. The collaboration backend remains the
 * authoritative permission boundary and must validate the same operation. */
export interface ReviewAccess {
  can(action: ReviewAction, context: ReviewActionContext): boolean;
}

/** Built-in policy used when the host does not supply `reviewAccess`. */
export function defaultReviewAccessCan(action: ReviewAction, context: ReviewActionContext): boolean {
  if (context.mode === "view") return false;
  if (action === "comment.edit" || action === "comment.delete") {
    return !!context.comment && !context.comment.deletedAt && context.comment.author.id === context.actor?.id;
  }
  return true;
}
