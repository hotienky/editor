// Versioned public events shared by the browser editor, host integrations, and
// the collaboration backend. Keep this module DOM-free: consumers may import it
// in Node to validate/project events before storing them in an audit/outbox log.

import type { Change, ChangeOrigin, UserInfo } from "./change";
import type { Op } from "./model/ops";
import type { DocSelection } from "./model/position";
import type { ReviewOp } from "./review/ops";

export const EDITOR_EVENT_SCHEMA_VERSION = "1.0" as const;

export type EditorEventSource = "local" | "remote" | "api" | "ai" | "undo" | "redo" | "import" | "system";
export type EditorEventDetail = "metadata" | "operations" | "full";
export type EditorEventTransactionStatus = "optimistic" | "committed" | "rejected";

export interface EditorEventDocumentRef {
  /** Null while the document is offline and has not been published. */
  id: string | null;
  /** Version the event was produced against. */
  baseVersion: number;
  /** Canonical server version, when known. */
  version?: number;
}

export interface EditorEventTransactionRef {
  /** Stable client-minted id. Also used as the collaboration idempotency key. */
  id: string;
  correlationId?: string;
  causationId?: string;
  status: EditorEventTransactionStatus;
}

export interface EditorEventEnvelope<TType extends string = string, TData = unknown> {
  schemaVersion: typeof EDITOR_EVENT_SCHEMA_VERSION;
  id: string;
  type: TType;
  occurredAt: string;
  source: EditorEventSource;
  actor?: UserInfo;
  document: EditorEventDocumentRef;
  transaction?: EditorEventTransactionRef;
  data: TData;
  metadata?: Record<string, unknown>;
}

export interface DocumentChangeEventData {
  origin: ChangeOrigin;
  /** Higher-level command intent when one was supplied by the command layer. */
  intent?: string;
  operationCount: number;
  affectedBlockIds: string[];
  /** Included at detail=operations/full. */
  operations?: Op[];
  /** Included at detail=full. */
  selectionBefore?: DocSelection | null;
  /** Included at detail=full, or when explicitly needed by a host. */
  selectionAfter?: DocSelection | null;
  /** Canonical change supplied by the server on commit/remote delivery. */
  change?: Change;
}

export interface ReviewOperationEventData {
  operation: ReviewOp;
  remote: boolean;
}

export interface PublicEditorEventDataMap {
  "editor.ready": { mode: "edit" | "suggest" | "view" };
  "editor.destroyed": Record<string, never>;
  "editor.mode.changed": { mode: "edit" | "suggest" | "view"; previousMode?: "edit" | "suggest" | "view" };
  "editor.error": { scope: string; message: string; recoverable: boolean; code?: string };

  "document.open.started": { method: "docx" | "api" };
  "document.open.completed": { method: "docx" | "api"; durationMs: number };
  "document.open.failed": { method: "docx" | "api"; durationMs: number; message: string };
  "document.import.started": { format: "docx"; fileName?: string };
  "document.import.completed": { format: "docx"; fileName?: string; durationMs: number; warningCount: number };
  "document.import.failed": { format: "docx"; fileName?: string; durationMs: number; message: string };
  "document.export.started": { format: "docx" | "pdf"; trigger: "api" | "toolbar" };
  "document.export.completed": { format: "docx" | "pdf"; trigger: "api" | "toolbar"; durationMs: number; byteLength: number; warningCount: number };
  "document.export.failed": { format: "docx" | "pdf"; trigger: "api" | "toolbar"; durationMs: number; message: string };
  "document.change.applied": DocumentChangeEventData;
  "document.change.committed": DocumentChangeEventData;
  "document.change.rejected": DocumentChangeEventData & { reason: string };
  "document.remoteChange.applied": DocumentChangeEventData;
  "document.shared": { docId: string; url: string; reused: boolean };

  "review.operation.applied": ReviewOperationEventData;
  "review.suggestion.created": { suggestionId: string; kind: string; remote: boolean };
  "review.suggestion.removed": { suggestionId: string; remote: boolean };
  "review.thread.created": { threadId: string; remote: boolean };
  "review.thread.removed": { threadId: string; remote: boolean };
  "review.comment.added": { threadId: string; commentId: string; remote: boolean };
  "review.comment.edited": { threadId: string; commentId: string; remote: boolean };
  "review.comment.removed": { threadId: string; commentId: string; remote: boolean };
  "review.thread.status.changed": { threadId: string; status: "open" | "resolved"; remote: boolean };

  "collaboration.connecting": { docId: string };
  "collaboration.connected": { docId: string; version: number };
  "collaboration.disconnected": { docId: string; reason?: string };
  "collaboration.user.joined": { siteId: string; user?: UserInfo };
  "collaboration.user.left": { siteId: string; user?: UserInfo };
  "collaboration.presence.changed": { participants: Array<{ siteId: string; user?: UserInfo }> };
  "selection.changed": { selection: DocSelection | null };
  "custom": { name: string; payload?: unknown };
}

export type PublicEditorEventType = keyof PublicEditorEventDataMap;
export type PublicEditorEvent<K extends PublicEditorEventType = PublicEditorEventType> = {
  [P in K]: EditorEventEnvelope<P, PublicEditorEventDataMap[P]>;
}[K];

/** Best-effort projection used for event filtering/indexing without inspecting
 * operation payloads. Unknown future operations safely produce no block id. */
export function affectedBlockIds(ops: readonly Op[]): string[] {
  const ids = new Set<string>();
  for (const op of ops) {
    switch (op.type) {
      case "insertText":
      case "insertRuns":
      case "splitParagraph":
        ids.add(op.at.blockId);
        if (op.type === "splitParagraph") ids.add(op.newBlockId);
        break;
      case "mergeParagraphs":
        ids.add(op.firstBlockId);
        break;
      case "insertBlock":
        ids.add(op.block.id);
        break;
      case "setTableRow":
      case "setTableStructure":
      case "setTableStyleRef":
      case "insertTableRow":
      case "removeTableRow":
      case "setRowHeight":
      case "insertTableColumn":
      case "removeTableColumn":
        ids.add(op.tableId);
        break;
      case "deleteRange":
      case "setRuns":
      case "setParaStyle":
      case "removeBlock":
      case "setImageProps":
      case "setEquation":
      case "setEquationAlign":
      case "setTableColFractions":
      case "setTableWidthMode":
      case "setTablePreferredWidth":
      case "setTableAlign":
      case "setTableProps":
        ids.add(op.blockId);
        break;
      default:
        break;
    }
  }
  return [...ids];
}

export type SemanticReviewEvent = {
  [K in keyof PublicEditorEventDataMap]: K extends `review.${string}`
    ? { type: K; data: PublicEditorEventDataMap[K] }
    : never;
}[keyof PublicEditorEventDataMap];

/** Expand a low-level ReviewOp into stable semantic events. The generic
 * review.operation.applied event is always first for audit consumers. */
export function projectReviewEvents(op: ReviewOp, remote: boolean): SemanticReviewEvent[] {
  const base = { type: "review.operation.applied", data: { operation: op, remote } } as const;
  switch (op.type) {
    case "addSuggestion":
      return [base, { type: "review.suggestion.created", data: { suggestionId: op.s.id, kind: op.s.kind, remote } }];
    case "removeSuggestion":
      return [base, { type: "review.suggestion.removed", data: { suggestionId: op.id, remote } }];
    case "growSuggestion":
      return [base];
    case "addThread":
      return [base, { type: "review.thread.created", data: { threadId: op.t.id, remote } }];
    case "removeThread":
      return [base, { type: "review.thread.removed", data: { threadId: op.id, remote } }];
    case "addComment":
      return [base, { type: "review.comment.added", data: { threadId: op.threadId, commentId: op.c.id, remote } }];
    case "removeComment":
      return [base, { type: "review.comment.removed", data: { threadId: op.threadId, commentId: op.commentId, remote } }];
    case "editComment":
      return [base, { type: "review.comment.edited", data: { threadId: op.threadId, commentId: op.commentId, remote } }];
    case "setThreadStatus":
      return [base, { type: "review.thread.status.changed", data: { threadId: op.threadId, status: op.status, remote } }];
  }
}
