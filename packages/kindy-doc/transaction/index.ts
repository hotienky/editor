/**
 * @kindy/transaction — KindyDoc Command & Transaction Engine
 *
 * Core Principle: "Nobody edits the tree directly. Everything goes through Transactions."
 */

import { KindyDocumentNode } from '../document/index.ts';

export interface Operation {
  op: 'insert' | 'delete' | 'update' | 'move';
  targetId: string;
  node?: Record<string, any>;
  attributes?: Record<string, any>;
  text?: string;
  offset?: number;
}

export abstract class Command {
  public abstract execute(doc: KindyDocumentNode): Operation[];
}

export class InsertTextCommand extends Command {
  public targetId: string;
  public text: string;
  public offset: number;

  constructor(targetId: string, text: string, offset: number = 0) {
    super();
    this.targetId = targetId;
    this.text = text;
    this.offset = offset;
  }

  public execute(doc: KindyDocumentNode): Operation[] {
    return [
      {
        op: 'insert',
        targetId: this.targetId,
        text: this.text,
        offset: this.offset,
      },
    ];
  }
}

export class Transaction {
  public operations: Operation[] = [];

  public addOperation(op: Operation): void {
    this.operations.push(op);
  }
}
