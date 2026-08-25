/**
 * RevisionStore
 *
 * Manages tracked changes (revisions) in an OoxmlPackage.
 * Provides accept/reject operations and revision lifecycle management.
 *
 * OOXML revision model:
 * - w:ins / w:del wrap Run elements with id, author, date
 * - Accepting a w:ins → keep the runs (remove wrapper)
 * - Accepting a w:del → remove the runs entirely
 * - Rejecting a w:ins → remove the runs entirely
 * - Rejecting a w:del → keep the runs (remove wrapper)
 */

import type {
  OoxmlPackage,
  Paragraph,
  Run,
  TrackedRun,
} from './ooxml-types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Revision {
  id: number
  type: 'ins' | 'del'
  author: string
  date: string
  /** Reference to the TrackedRun node in the document */
  node: TrackedRun
  /** Parent paragraph reference */
  paragraph: Paragraph
}

export interface CommentThread {
  id: number
  author: string
  date: string
  text: string
  done?: boolean
  replies: CommentReply[]
}

export interface CommentReply {
  id: number
  author: string
  date: string
  text: string
}

export type RevisionViewMode = 'all' | 'none' | 'last'

// ─── RevisionStore ───────────────────────────────────────────────────────────

export class RevisionStore {
  private _pkg: OoxmlPackage
  private _revisions: Map<number, Revision> = new Map()
  private _nextId: number = 1
  private _author: string = 'Author'
  private _viewMode: RevisionViewMode = 'all'
  private _onChange: (() => void) | null = null

  constructor(pkg: OoxmlPackage) {
    this._pkg = pkg
    this._scanDocument()
  }

  /** Set the current author name for new revisions */
  setAuthor(author: string): void {
    this._author = author
  }

  /** Get the current author name */
  getAuthor(): string {
    return this._author
  }

  /** Set revision view mode */
  setViewMode(mode: RevisionViewMode): void {
    this._viewMode = mode
  }

  /** Get current view mode */
  getViewMode(): RevisionViewMode {
    return this._viewMode
  }

  /** Register a change listener */
  onChange(cb: () => void): void {
    this._onChange = cb
  }

  /** Get all tracked revisions */
  getRevisions(): Revision[] {
    return Array.from(this._revisions.values())
  }

  /** Get a revision by ID */
  getRevision(id: number): Revision | undefined {
    return this._revisions.get(id)
  }

  /** Get the next available revision ID */
  nextId(): number {
    return this._nextId++
  }

  /** Register a TrackedRun node as a revision */
  registerRevision(tracked: TrackedRun, paragraph: Paragraph): void {
    const rev: Revision = {
      id: tracked.id,
      type: tracked.type,
      author: tracked.author,
      date: tracked.date,
      node: tracked,
      paragraph,
    }
    this._revisions.set(tracked.id, rev)
    if (tracked.id >= this._nextId) {
      this._nextId = tracked.id + 1
    }
  }

  /**
   * Accept a revision:
   * - w:ins → unwrap runs (keep content)
   * - w:del → remove runs (delete content)
   */
  acceptRevision(id: number): boolean {
    const rev = this._revisions.get(id)
    if (!rev) return false

    const { paragraph, node } = rev
    const idx = paragraph.content.indexOf(node as any)
    if (idx === -1) return false

    if (node.type === 'ins') {
      // Accept insert: replace TrackedRun with its contained Runs
      paragraph.content.splice(idx, 1, ...node.content)
    } else {
      // Accept delete: remove the TrackedRun entirely
      paragraph.content.splice(idx, 1)
    }

    this._revisions.delete(id)
    this._onChange?.()
    return true
  }

  /**
   * Reject a revision:
   * - w:ins → remove runs (undo insert)
   * - w:del → unwrap runs (restore content)
   */
  rejectRevision(id: number): boolean {
    const rev = this._revisions.get(id)
    if (!rev) return false

    const { paragraph, node } = rev
    const idx = paragraph.content.indexOf(node as any)
    if (idx === -1) return false

    if (node.type === 'ins') {
      // Reject insert: remove the TrackedRun entirely
      paragraph.content.splice(idx, 1)
    } else {
      // Reject delete: replace TrackedRun with its contained Runs (restore)
      paragraph.content.splice(idx, 1, ...node.content)
    }

    this._revisions.delete(id)
    this._onChange?.()
    return true
  }

  /** Accept all revisions */
  acceptAll(): number {
    const ids = Array.from(this._revisions.keys())
    let count = 0
    for (const id of ids) {
      if (this.acceptRevision(id)) count++
    }
    return count
  }

  /** Reject all revisions */
  rejectAll(): number {
    const ids = Array.from(this._revisions.keys())
    let count = 0
    for (const id of ids) {
      if (this.rejectRevision(id)) count++
    }
    return count
  }

  /** Scan the document body for existing tracked runs */
  private _scanDocument(): void {
    const body = this._pkg.document.body
    for (const block of body.children) {
      if (block.type === 'paragraph') {
        this._scanParagraph(block as Paragraph)
      } else if (block.type === 'table') {
        this._scanTable(block as any)
      }
    }
  }

  private _scanTable(table: { content: Array<{ content: Array<{ content: Paragraph[] }> }> }): void {
    for (const row of table.content) {
      for (const cell of row.content) {
        for (const block of cell.content) {
          if (block.type === 'paragraph') {
            this._scanParagraph(block)
          }
        }
      }
    }
  }

  private _scanParagraph(para: Paragraph): void {
    for (const item of para.content) {
      if (item.type === 'ins' || item.type === 'del') {
        this.registerRevision(item as TrackedRun, para)
      }
    }
  }
}

// ─── CommentStore ────────────────────────────────────────────────────────────

/**
 * CommentStore
 *
 * Manages comments and comment threading.
 * Links comments to document positions via commentRangeStart/End markers.
 */
export class CommentStore {
  private _pkg: OoxmlPackage
  private _threads: Map<number, CommentThreadData> = new Map()
  private _nextId: number = 100 // start above revision IDs
  private _author: string = 'Author'
  private _onChange: (() => void) | null = null

  constructor(pkg: OoxmlPackage) {
    this._pkg = pkg
    this._scanComments()
  }

  /** Set the current author name */
  setAuthor(author: string): void {
    this._author = author
  }

  /** Get the current author name */
  getAuthor(): string {
    return this._author
  }

  /** Register a change listener */
  onChange(cb: () => void): void {
    this._onChange = cb
  }

  /** Get all comment threads */
  getThreads(): CommentThreadData[] {
    return Array.from(this._threads.values())
  }

  /** Get a comment thread by ID */
  getThread(id: number): CommentThreadData | undefined {
    return this._threads.get(id)
  }

  /** Get the next available comment ID */
  nextId(): number {
    return this._nextId++
  }

  /** Add a new comment at a position (defined by rangeStart/rangeEnd char indices) */
  addComment(text: string, rangeStartId?: number, rangeEndId?: number): CommentThreadData {
    const id = this.nextId()
    const thread: CommentThreadData = {
      id,
      author: this._author,
      date: new Date().toISOString(),
      text,
      done: false,
      replies: [],
      rangeStartId,
      rangeEndId,
    }
    this._threads.set(id, thread)
    this._onChange?.()
    return thread
  }

  /** Reply to a comment thread */
  reply(threadId: number, text: string): CommentReply | null {
    const thread = this._threads.get(threadId)
    if (!thread) return null

    const reply: CommentReply = {
      id: this.nextId(),
      author: this._author,
      date: new Date().toISOString(),
      text,
    }
    thread.replies.push(reply)
    this._onChange?.()
    return reply
  }

  /** Mark a comment thread as done */
  markDone(threadId: number, done: boolean): boolean {
    const thread = this._threads.get(threadId)
    if (!thread) return false
    thread.done = done
    this._onChange?.()
    return true
  }

  /** Delete a comment thread */
  delete(threadId: number): boolean {
    const result = this._threads.delete(threadId)
    if (result) this._onChange?.()
    return result
  }

  /** Scan comments.xml for existing comments */
  private _scanComments(): void {
    const commentsPart = this._pkg.comments
    if (!commentsPart) return

    for (const thread of commentsPart.comments) {
      const text = thread.content.map((c) => c.text).join('\n')
      const commentThread: CommentThreadData = {
        id: parseInt(thread.id, 10),
        author: thread.author,
        date: thread.date || '',
        text,
        done: false,
        replies: [],
      }
      this._threads.set(commentThread.id, commentThread)
      if (commentThread.id >= this._nextId) {
        this._nextId = commentThread.id + 1
      }
    }
  }
}

export interface CommentThreadData {
  id: number
  author: string
  date: string
  text: string
  done?: boolean
  replies: CommentReply[]
  rangeStartId?: number
  rangeEndId?: number
}
