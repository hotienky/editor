export type DocumentLibraryEventMap = {
  ready: unknown
  opened: unknown
  changed: unknown
  'save-started': unknown
  saved: unknown
  'save-failed': unknown
  imported: unknown
  'compatibility-warning': unknown
  'version-restored': unknown
  printed: unknown
  error: unknown
}

export class TypedEventEmitter<Events extends Record<string, unknown> = DocumentLibraryEventMap> {
  private listeners = new Map<keyof Events, Set<(payload: unknown) => void>>()

  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void) {
    const listeners = this.listeners.get(event) || new Set()
    listeners.add(listener as (payload: unknown) => void)
    this.listeners.set(event, listeners)
    return () => listeners.delete(listener as (payload: unknown) => void)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    this.listeners.get(event)?.forEach((listener) => listener(payload))
  }

  clear() {
    this.listeners.clear()
  }
}
