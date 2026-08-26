import type {
  EditorEventDetail,
  PublicEditorEvent,
  PublicEditorEventDataMap,
  PublicEditorEventType,
} from "@kindy/shared";

export type EditorEventSink = (event: PublicEditorEvent) => void | Promise<void>;
export type EditorEventRedactor = (event: PublicEditorEvent) => PublicEditorEvent | null;
export type EditorEventErrorHandler = (error: unknown, event: PublicEditorEvent) => void;

export interface EditorEventsOptions {
  /** Payload depth. metadata omits raw ops/selections; operations adds ops;
   * full also includes selections and canonical Change objects. */
  detail?: EditorEventDetail;
  /** High-frequency selection.changed is disabled by default. */
  includeSelection?: boolean;
  /** Optional delivery target (HTTP adapter, analytics bus, audit bridge, ...). */
  sink?: EditorEventSink;
  /** Last chance to redact or drop an event before listeners and sink see it. */
  redact?: EditorEventRedactor;
  /** Listener/sink exceptions are isolated and reported here. */
  onError?: EditorEventErrorHandler;
}

export interface EditorEventSubscriptionOptions {
  /** Automatically unsubscribe when this signal is aborted. */
  signal?: AbortSignal;
}

export type EditorEventHandler<K extends PublicEditorEventType> = (
  event: PublicEditorEvent<K>,
) => void;
export type AnyEditorEventHandler = (event: PublicEditorEvent) => void;

/** Typed per-editor event dispatcher. It intentionally has no global singleton,
 * so several editors on the same page cannot leak events into one another. */
export class EditorEvents {
  readonly detail: EditorEventDetail;
  readonly includeSelection: boolean;
  private readonly handlers = new Map<PublicEditorEventType, Set<AnyEditorEventHandler>>();
  private readonly anyHandlers = new Set<AnyEditorEventHandler>();
  private readonly sink: EditorEventSink | undefined;
  private readonly redact: EditorEventRedactor | undefined;
  private readonly onError: EditorEventErrorHandler;
  private disposed = false;

  constructor(options: EditorEventsOptions = {}) {
    this.detail = options.detail ?? "metadata";
    this.includeSelection = options.includeSelection ?? false;
    this.sink = options.sink;
    this.redact = options.redact;
    this.onError = options.onError ?? ((error) => console.error("[kindy-editor:event]", error));
  }

  on<K extends PublicEditorEventType>(
    type: K,
    handler: EditorEventHandler<K>,
    options: EditorEventSubscriptionOptions = {},
  ): () => void {
    if (this.disposed || options.signal?.aborted) return () => {};
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler as AnyEditorEventHandler);
    const off = (): void => {
      set?.delete(handler as AnyEditorEventHandler);
      if (set?.size === 0) this.handlers.delete(type);
    };
    options.signal?.addEventListener("abort", off, { once: true });
    return off;
  }

  onAny(handler: AnyEditorEventHandler, options: EditorEventSubscriptionOptions = {}): () => void {
    if (this.disposed || options.signal?.aborted) return () => {};
    this.anyHandlers.add(handler);
    const off = (): void => {
      this.anyHandlers.delete(handler);
    };
    options.signal?.addEventListener("abort", off, { once: true });
    return off;
  }

  off<K extends PublicEditorEventType>(type: K, handler: EditorEventHandler<K>): void {
    this.handlers.get(type)?.delete(handler as AnyEditorEventHandler);
  }

  /** Called by the editor runtime after state is already consistent. Public only
   * for custom bridges; normal integrations subscribe with on/onAny. */
  dispatch(event: PublicEditorEvent): void {
    if (this.disposed) return;
    const delivered = this.redact ? this.redact(event) : event;
    if (!delivered) return;
    for (const handler of this.handlers.get(delivered.type) ?? []) this.safeCall(handler, delivered);
    for (const handler of this.anyHandlers) this.safeCall(handler, delivered);
    if (this.sink) {
      try {
        void Promise.resolve(this.sink(delivered)).catch((error) => this.reportError(error, delivered));
      } catch (error) {
        this.reportError(error, delivered);
      }
    }
  }

  destroy(): void {
    this.disposed = true;
    this.handlers.clear();
    this.anyHandlers.clear();
  }

  private safeCall(handler: AnyEditorEventHandler, event: PublicEditorEvent): void {
    try {
      handler(event);
    } catch (error) {
      this.reportError(error, event);
    }
  }

  private reportError(error: unknown, event: PublicEditorEvent): void {
    try {
      this.onError(error, event);
    } catch (reportingError) {
      console.error("[kindy-editor:event:onError]", reportingError);
    }
  }
}

/** Compile-time helper for host code that wants a named data type. */
export type EditorEventData<K extends PublicEditorEventType> = PublicEditorEventDataMap[K];
