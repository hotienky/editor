/**
 * @kindy/core — KindyDoc Editor Controller Engine
 *
 * Core Principle: Framework-agnostic Document Operating System instance.
 */

import { KindyDocumentNode } from '../document/index.ts';
import { Command, Transaction } from '../transaction/index.ts';

export class KindyEngine {
  private document: KindyDocumentNode;
  private history: Transaction[] = [];

  constructor(doc?: KindyDocumentNode) {
    this.document = doc || new KindyDocumentNode();
  }

  public getDocument(): KindyDocumentNode {
    return this.document;
  }

  public execute(command: Command): Transaction {
    const operations = command.execute(this.document);
    const tx = new Transaction();
    operations.forEach((op) => tx.addOperation(op));
    this.history.push(tx);
    return tx;
  }

  public toJSON(): Record<string, any> {
    return this.document.toJSON();
  }
}

// Backward Compatibility Alias
export { KindyEngine as KindyDocEngine };
