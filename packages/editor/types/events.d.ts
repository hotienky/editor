import type { DocSelection, EditMode, UserInfo } from ".";

export declare const EDITOR_EVENT_SCHEMA_VERSION: "1.0";
export type EditorEventSource = "local" | "remote" | "api" | "ai" | "undo" | "redo" | "import" | "system";
export type EditorEventDetail = "metadata" | "operations" | "full";
export type EditorEventTransactionStatus = "optimistic" | "committed" | "rejected";
export type PublicOperation = { type: string; [key: string]: unknown };

export interface PublicChange {
  id: string;
  docId: string;
  baseVersion: number;
  seq?: number;
  siteId: string;
  userId?: string;
  origin: "typing" | "command" | "paste" | "undo" | "redo";
  ts: number;
  ops: PublicOperation[];
  selectionAfter?: DocSelection | null;
}

export interface EditorEventEnvelope<TType extends string = string, TData = unknown> {
  schemaVersion: "1.0";
  id: string;
  type: TType;
  occurredAt: string;
  source: EditorEventSource;
  actor?: UserInfo;
  document: { id: string | null; baseVersion: number; version?: number };
  transaction?: {
    id: string;
    correlationId?: string;
    causationId?: string;
    status: EditorEventTransactionStatus;
  };
  data: TData;
  metadata?: Record<string, unknown>;
}

export interface DocumentChangeEventData {
  origin: PublicChange["origin"];
  intent?: string;
  operationCount: number;
  affectedBlockIds: string[];
  operations?: PublicOperation[];
  selectionBefore?: DocSelection | null;
  selectionAfter?: DocSelection | null;
  change?: PublicChange;
}

export interface PublicEditorEventDataMap {
  "editor.ready": { mode: EditMode };
  "editor.destroyed": Record<string, never>;
  "editor.mode.changed": { mode: EditMode; previousMode?: EditMode };
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
  "review.operation.applied": { operation: { type: string; [key: string]: unknown }; remote: boolean };
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
export type EditorEventSink = (event: PublicEditorEvent) => void | Promise<void>;
export type EditorEventRedactor = (event: PublicEditorEvent) => PublicEditorEvent | null;

export interface EditorEventsOptions {
  detail?: EditorEventDetail;
  includeSelection?: boolean;
  sink?: EditorEventSink;
  redact?: EditorEventRedactor;
  onError?: (error: unknown, event: PublicEditorEvent) => void;
}

export declare class EditorEvents {
  readonly detail: EditorEventDetail;
  readonly includeSelection: boolean;
  constructor(options?: EditorEventsOptions);
  on<K extends PublicEditorEventType>(type: K, handler: (event: PublicEditorEvent<K>) => void, options?: { signal?: AbortSignal }): () => void;
  onAny(handler: (event: PublicEditorEvent) => void, options?: { signal?: AbortSignal }): () => void;
  off<K extends PublicEditorEventType>(type: K, handler: (event: PublicEditorEvent<K>) => void): void;
  dispatch(event: PublicEditorEvent): void;
  destroy(): void;
}

export interface HttpEventSinkOptions {
  endpoint: string;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  batchSize?: number;
  flushIntervalMs?: number;
  maxAttempts?: number;
  fetch?: typeof fetch;
  onDeliveryError?: (error: unknown, events: PublicEditorEvent[]) => void;
}
export interface HttpEventSink extends EditorEventSink {
  flush(): Promise<void>;
  destroy(): Promise<void>;
}
export declare function createHttpEventSink(options: HttpEventSinkOptions): HttpEventSink;
export declare function affectedBlockIds(ops: readonly PublicOperation[]): string[];

