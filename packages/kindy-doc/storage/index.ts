/**
 * @kindy/storage — KindyDoc Document Storage & Snapshot Engine
 *
 * Stores canonical Document AST Trees, operation logs, metadata, and comments.
 * Framework-independent: No HTML blobs stored.
 */

import { KindyDocumentNode } from '../document/index.ts';

export interface DocumentSnapshot {
  version: string;
  timestamp: number;
  metadata: {
    title: string;
    author?: string;
    created: number;
    updated: number;
  };
  ast: Record<string, any>;
  comments: Array<{
    id: string;
    text: string;
    user: string;
    createdAt: number;
    resolved: boolean;
  }>;
  suggestions: Array<{
    id: string;
    type: 'insertion' | 'deletion';
    text: string;
    user: string;
    status: 'pending' | 'accepted' | 'rejected';
  }>;
}

export class KindyStorageEngine {
  private currentSnapshot: DocumentSnapshot | null = null;

  public saveSnapshot(
    doc: KindyDocumentNode,
    options?: {
      title?: string;
      author?: string;
      comments?: any[];
      suggestions?: any[];
    }
  ): DocumentSnapshot {
    const now = Date.now();
    const snapshot: DocumentSnapshot = {
      version: '2.0.0',
      timestamp: now,
      metadata: {
        title: options?.title || 'Tài liệu không tên (Google Docs)',
        author: options?.author || 'Người dùng',
        created: this.currentSnapshot?.metadata.created || now,
        updated: now,
      },
      ast: doc.toJSON(),
      comments: options?.comments || [],
      suggestions: options?.suggestions || [],
    };
    this.currentSnapshot = snapshot;
    return snapshot;
  }

  public loadSnapshot(snapshot: DocumentSnapshot): {
    doc: KindyDocumentNode;
    comments: any[];
    suggestions: any[];
    metadata: DocumentSnapshot['metadata'];
  } {
    this.currentSnapshot = snapshot;
    const doc = KindyDocumentNode.fromJSON(snapshot.ast);
    return {
      doc,
      comments: snapshot.comments || [],
      suggestions: snapshot.suggestions || [],
      metadata: snapshot.metadata,
    };
  }

  public exportToJSON(): string {
    if (!this.currentSnapshot) {
      throw new Error('No active snapshot to export');
    }
    return JSON.stringify(this.currentSnapshot, null, 2);
  }

  public importFromJSON(jsonString: string): DocumentSnapshot {
    const parsed = JSON.parse(jsonString) as DocumentSnapshot;
    this.currentSnapshot = parsed;
    return parsed;
  }
}
