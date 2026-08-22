import type { CollaborationAdapter, CollaborationSession } from './types'

export interface YjsProviderLike {
  connect?(): void
  disconnect?(): void
  destroy?(): void
  awareness?: { getStates?(): Map<unknown, unknown> }
}

export interface YjsCollaborationAdapterOptions {
  providerFactory(context: { documentId: string; user?: { id?: string; name?: string; color?: string }; editor: unknown }): YjsProviderLike | Promise<YjsProviderLike>
}

/**
 * Host-provided Yjs provider boundary. The SDK deliberately does not create a
 * WebSocket connection or ship a collaboration server.
 */
export class YjsCollaborationAdapter implements CollaborationAdapter {
  constructor(private readonly options: YjsCollaborationAdapterOptions) {}

  async connect(context: Parameters<CollaborationAdapter['connect']>[0]): Promise<CollaborationSession> {
    const provider = await this.options.providerFactory({ documentId: context.documentId, user: context.user, editor: context.editor })
    provider.connect?.()
    return {
      disconnect() { provider.disconnect?.(); provider.destroy?.() },
      getUsers: () => provider.awareness?.getStates ? [...provider.awareness.getStates().values()] : [],
    }
  }
}

export const createYjsCollaborationAdapter = (options: YjsCollaborationAdapterOptions) => new YjsCollaborationAdapter(options)

