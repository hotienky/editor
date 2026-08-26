// Per-part relationship tables (.rels). Each part that references others (the
// document, each header/footer) owns one; ids are local to the part.

import { el, XML_DECL } from "./xmlWrite";

const BASE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const REL = {
  hyperlink: `${BASE}/hyperlink`,
  image: `${BASE}/image`,
  header: `${BASE}/header`,
  footer: `${BASE}/footer`,
  styles: `${BASE}/styles`,
  numbering: `${BASE}/numbering`,
  footnotes: `${BASE}/footnotes`,
  endnotes: `${BASE}/endnotes`,
  settings: `${BASE}/settings`,
  theme: `${BASE}/theme`,
  comments: `${BASE}/comments`,
  commentsExtended: "http://schemas.microsoft.com/office/2011/relationships/commentsExtended",
  commentsIds: "http://schemas.microsoft.com/office/2016/09/relationships/commentsIds",
  officeDocument: `${BASE}/officeDocument`,
} as const;

export interface Rel {
  id: string;
  type: string;
  target: string;
  external?: boolean;
}

export class RelManager {
  private readonly rels: Rel[] = [];
  private n = 0;

  add(type: string, target: string, external?: boolean): string {
    const id = `rId${++this.n}`;
    this.rels.push(external ? { id, type, target, external } : { id, type, target });
    return id;
  }

  list(): readonly Rel[] {
    return this.rels;
  }

  isEmpty(): boolean {
    return this.rels.length === 0;
  }
}

export function relsXml(rels: readonly Rel[]): string {
  const entries = rels
    .map((r) =>
      el("Relationship", {
        Id: r.id,
        Type: r.type,
        Target: r.target,
        TargetMode: r.external ? "External" : undefined,
      }),
    )
    .join("");
  return (
    XML_DECL +
    el("Relationships", { xmlns: "http://schemas.openxmlformats.org/package/2006/relationships" }, entries)
  );
}
