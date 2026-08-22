/**
 * @kindy/document — KindyDoc Canonical Document AST Schema
 *
 * Core Principle: "Everything is a Document Node."
 * Zero DOM / Framework Dependencies.
 */

export type NodeType = 'document' | 'section' | 'paragraph' | 'heading' | 'table' | 'image' | 'text' | 'pageBreak';

export interface NodeAttributes {
  [key: string]: any;
}

export abstract class KindyNode {
  public id: string;
  public type: NodeType;
  public parent: KindyNode | null = null;
  public children: KindyNode[] = [];
  public attributes: NodeAttributes = {};

  constructor(type: NodeType, attributes: NodeAttributes = {}, id?: string) {
    this.id = id || `kindy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.type = type;
    this.attributes = attributes;
  }

  public addChild(node: KindyNode): void {
    node.parent = this;
    this.children.push(node);
  }

  public removeChild(id: string): boolean {
    const index = this.children.findIndex((child) => child.id === id);
    if (index !== -1) {
      this.children[index].parent = null;
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      attributes: this.attributes,
      children: this.children.map((child) => child.toJSON()),
    };
  }
}

export class KindyDocumentNode extends KindyNode {
  constructor(attributes: NodeAttributes = {}, id?: string) {
    super('document', attributes, id);
  }

  public static fromJSON(json: Record<string, any>): KindyDocumentNode {
    const doc = new KindyDocumentNode(json.attributes || {}, json.id);
    if (Array.isArray(json.children)) {
      json.children.forEach((childJson: Record<string, any>) => {
        if (childJson.type === 'section') {
          const section = new KindySectionNode(childJson.attributes || {}, childJson.id);
          if (Array.isArray(childJson.children)) {
            childJson.children.forEach((pJson: Record<string, any>) => {
              const p = new KindyParagraphNode(pJson.attributes || {}, pJson.id);
              if (Array.isArray(pJson.children)) {
                pJson.children.forEach((tJson: Record<string, any>) => {
                  const t = new KindyTextNode(tJson.text || '', tJson.attributes || {}, tJson.id);
                  p.addChild(t);
                });
              }
              section.addChild(p);
            });
          }
          doc.addChild(section);
        }
      });
    }
    return doc;
  }
}

export class KindySectionNode extends KindyNode {
  constructor(attributes: NodeAttributes = {}) {
    super('section', attributes);
  }
}

export class KindyParagraphNode extends KindyNode {
  constructor(attributes: NodeAttributes = {}) {
    super('paragraph', attributes);
  }
}

export class KindyTextNode extends KindyNode {
  public text: string;

  constructor(text: string, attributes: NodeAttributes = {}) {
    super('text', attributes);
    this.text = text;
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      text: this.text,
    };
  }
}


