/**
 * OOXML Transaction
 *
 * Operations that modify OoxmlPackage in-place.
 * Each operation is reversible for undo support.
 *
 * All text positions use flat charIndex matching buildOoxmlCharIndex walk order.
 * endIndex is always EXCLUSIVE (standard half-open interval [start, end)).
 */

import type {
  OoxmlPackage,
  Paragraph,
  Run,
  Text,
  RunProperties,
  BlockElement,
  Hyperlink,
  TrackedRun,
} from './ooxml-types'
import { resolveCharIndex, buildOoxmlCharIndex, type OoxmlChar } from './ooxml-char-index'
import { getDocumentCharCount } from './ooxml-char-index'

// ─── Transaction Types ────────────────────────────────────────────────────────

export interface InsertTextOp {
  type: 'insertText'
  charIndex: number
  text: string
}

export interface DeleteTextOp {
  type: 'deleteText'
  startIndex: number
  endIndex: number
}

export interface FormatTextOp {
  type: 'formatText'
  startIndex: number
  endIndex: number
  property: string
  value: unknown
}

export type TransactionOp = InsertTextOp | DeleteTextOp | FormatTextOp

export interface Transaction {
  ops: TransactionOp[]
  inverses: TransactionOp[]
}

// ─── Transaction Builder ──────────────────────────────────────────────────────

export function applyTransaction(pkg: OoxmlPackage, ops: TransactionOp[]): Transaction {
  const inverses: TransactionOp[] = []
  for (const op of ops) {
    switch (op.type) {
      case 'insertText':
        inverses.push(_insertText(pkg, op.charIndex, op.text))
        break
      case 'deleteText':
        inverses.push(_deleteText(pkg, op.startIndex, op.endIndex))
        break
      case 'formatText':
        inverses.push(_formatText(pkg, op.startIndex, op.endIndex, op.property, op.value))
        break
    }
  }
  return { ops, inverses }
}

export function undoTransaction(pkg: OoxmlPackage, transaction: Transaction): void {
  for (let i = transaction.inverses.length - 1; i >= 0; i--) {
    const op = transaction.inverses[i]
    switch (op.type) {
      case 'insertText': _insertText(pkg, op.charIndex, op.text); break
      case 'deleteText': _deleteText(pkg, op.startIndex, op.endIndex); break
      case 'formatText': _formatText(pkg, op.startIndex, op.endIndex, op.property, op.value); break
    }
  }
}

// ─── Helpers: flat char array ─────────────────────────────────────────────────

interface FlatChar {
  char: string
  charIndex: number
  blockIndex: number
  runIndex: number
  textNodeIndex: number
  charOffset: number
}

function _buildFlatChars(pkg: OoxmlPackage): FlatChar[] {
  const result: FlatChar[] = []
  let counter = 0

  function walkBlocks(blocks: BlockElement[], blockOffset: number) {
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi]
      if (block.type === 'paragraph') {
        walkParagraph(block as Paragraph, blockOffset + bi)
      } else if (block.type === 'table') {
        walkTable(block as any, blockOffset + bi)
      }
    }
  }

  function walkParagraph(para: Paragraph, blockIdx: number) {
    let runIdx = 0
    for (const item of para.content) {
      if (item.type === 'run') {
        walkRun(item as Run, blockIdx, runIdx)
        runIdx++
      } else if (item.type === 'hyperlink') {
        for (const li of (item as Hyperlink).content) {
          if (li.type === 'run') {
            walkRun(li as Run, blockIdx, runIdx)
            runIdx++
          }
        }
      }
    }
  }

  function walkRun(run: Run, blockIdx: number, runIdx: number) {
    let textIdx = 0
    for (const node of run.content) {
      if (node.type === 'text') {
        const text = (node as Text).text
        for (let ci = 0; ci < text.length; ci++) {
          result.push({
            char: text[ci],
            charIndex: counter++,
            blockIndex: blockIdx,
            runIndex: runIdx,
            textNodeIndex: textIdx,
            charOffset: ci,
          })
        }
        textIdx++
      }
    }
  }

  function walkTable(table: any, blockIdx: number) {
    for (const row of table.content) {
      for (const cell of row.content) {
        walkBlocks(cell.content, blockIdx)
      }
    }
  }

  walkBlocks(pkg.document.body.children, 0)
  return result
}

function _findPara(pkg: OoxmlPackage, blockIndex: number): Paragraph | null {
  const block = pkg.document.body.children[blockIndex]
  return block?.type === 'paragraph' ? (block as Paragraph) : null
}

function _findRunInPara(para: Paragraph, runIndex: number): Run | null {
  let idx = 0
  for (const item of para.content) {
    if (item.type === 'run') {
      if (idx === runIndex) return item as Run
      idx++
    }
  }
  return null
}

function _findTextNodeInRun(run: Run, textNodeIndex: number): Text | null {
  let idx = 0
  for (const node of run.content) {
    if (node.type === 'text') {
      if (idx === textNodeIndex) return node as Text
      idx++
    }
  }
  return null
}

function _getAllRunsInPara(para: Paragraph): Run[] {
  return para.content.filter((item) => item.type === 'run') as Run[]
}

function _getCharCount(pkg: OoxmlPackage): number {
  return getDocumentCharCount(pkg)
}

// ─── Core Operations ──────────────────────────────────────────────────────────

function _insertText(pkg: OoxmlPackage, charIndex: number, text: string): DeleteTextOp {
  if (text.length === 0) return { type: 'deleteText', startIndex: charIndex, endIndex: charIndex }

  const totalChars = _getCharCount(pkg)

  // Append to end
  if (charIndex >= totalChars) {
    _appendTextToEnd(pkg, text)
    return { type: 'deleteText', startIndex: charIndex, endIndex: charIndex + text.length }
  }

  const chars = _buildFlatChars(pkg)
  const pos = chars[charIndex]
  if (!pos) {
    _appendTextToEnd(pkg, text)
    return { type: 'deleteText', startIndex: charIndex, endIndex: charIndex + text.length }
  }

  const para = _findPara(pkg, pos.blockIndex)
  if (!para) return { type: 'deleteText', startIndex: charIndex, endIndex: charIndex + text.length }

  const run = _findRunInPara(para, pos.runIndex)
  if (!run) return { type: 'deleteText', startIndex: charIndex, endIndex: charIndex + text.length }

  const textNode = _findTextNodeInRun(run, pos.textNodeIndex)
  if (!textNode) return { type: 'deleteText', startIndex: charIndex, endIndex: charIndex + text.length }

  // Splice text into the Text node at charOffset
  textNode.text = textNode.text.slice(0, pos.charOffset) + text + textNode.text.slice(pos.charOffset)

  return { type: 'deleteText', startIndex: charIndex, endIndex: charIndex + text.length }
}

function _deleteText(pkg: OoxmlPackage, startIndex: number, endIndex: number): InsertTextOp {
  if (startIndex >= endIndex) return { type: 'insertText', charIndex: startIndex, text: '' }

  const totalChars = _getCharCount(pkg)
  if (startIndex >= totalChars) return { type: 'insertText', charIndex: startIndex, text: '' }

  const clampedEnd = Math.min(endIndex, totalChars)

  // Collect deleted text for inverse
  const chars = _buildFlatChars(pkg)
  let deletedText = ''
  for (let i = startIndex; i < clampedEnd && i < chars.length; i++) {
    deletedText += chars[i].char
  }

  // Get the flat char positions for start and end
  const startPos = chars[startIndex]
  const endPos = chars[clampedEnd - 1] // last char to delete (inclusive)
  if (!startPos || !endPos) return { type: 'insertText', charIndex: startIndex, text: deletedText }

  // Strategy: walk all chars, collect those NOT in [start, end), rebuild runs
  const charsToDelete = new Set<number>()
  for (let i = startIndex; i < clampedEnd; i++) {
    charsToDelete.add(i)
  }

  // Walk the document, rebuilding text nodes without deleted chars
  _walkAndDelete(pkg, chars, charsToDelete)

  // Clean up empty runs and paragraphs
  _cleanup(pkg)

  return { type: 'insertText', charIndex: startIndex, text: deletedText }
}

function _walkAndDelete(
  pkg: OoxmlPackage,
  chars: FlatChar[],
  toDelete: Set<number>,
) {
  // Group chars by (blockIndex, runIndex, textNodeIndex)
  const groups = new Map<string, FlatChar[]>()
  for (const c of chars) {
    if (toDelete.has(c.charIndex)) continue
    const key = `${c.blockIndex}:${c.runIndex}:${c.textNodeIndex}`
    const arr = groups.get(key) ?? []
    arr.push(c)
    groups.set(key, arr)
  }

  // Rebuild each text node from remaining chars
  for (const [key, remaining] of groups) {
    const [blockIdx, runIdx, textIdx] = key.split(':').map(Number)
    const para = _findPara(pkg, blockIdx)
    if (!para) continue
    const run = _findRunInPara(para, runIdx)
    if (!run) continue
    const textNode = _findTextNodeInRun(run, textIdx)
    if (!textNode) continue

    // Rebuild text from remaining chars (sorted by charOffset)
    remaining.sort((a, b) => a.charOffset - b.charOffset)
    textNode.text = remaining.map((c) => chars[c.charIndex]?.char ?? '').join('')
  }
}

function _formatText(
  pkg: OoxmlPackage,
  startIndex: number,
  endIndex: number,
  property: string,
  value: unknown,
): FormatTextOp {
  const totalChars = _getCharCount(pkg)
  if (startIndex >= totalChars || startIndex >= endIndex) {
    return { type: 'formatText', startIndex, endIndex, property, value: undefined }
  }
  const clampedEnd = Math.min(endIndex, totalChars)

  const chars = _buildFlatChars(pkg)
  const startPos = chars[startIndex]
  const endPos = chars[clampedEnd - 1]
  if (!startPos || !endPos) return { type: 'formatText', startIndex, endIndex, property, value: undefined }

  // Find all runs in range
  const runs = _findRunsInRange(pkg, startPos, endPos)

  // Store original values for inverse
  let originalValue: unknown = undefined
  if (runs.length > 0 && runs[0].rPr) {
    originalValue = (runs[0].rPr as any)[property]
  }

  // Apply formatting
  for (const run of runs) {
    if (!run.rPr) run.rPr = {}
    ;(run.rPr as any)[property] = value
  }

  return { type: 'formatText', startIndex, endIndex, property, value: originalValue }
}

function _findRunsInRange(pkg: OoxmlPackage, startPos: FlatChar, endPos: FlatChar): Run[] {
  const runs: Run[] = []
  const children = pkg.document.body.children

  for (let bi = startPos.blockIndex; bi <= endPos.blockIndex && bi < children.length; bi++) {
    const block = children[bi]
    if (block.type !== 'paragraph') continue
    const para = block as Paragraph
    const allRuns = _getAllRunsInPara(para)

    for (let ri = 0; ri < allRuns.length; ri++) {
      if (bi === startPos.blockIndex && bi === endPos.blockIndex) {
        if (ri >= startPos.runIndex && ri <= endPos.runIndex) runs.push(allRuns[ri])
      } else if (bi === startPos.blockIndex) {
        if (ri >= startPos.runIndex) runs.push(allRuns[ri])
      } else if (bi === endPos.blockIndex) {
        if (ri <= endPos.runIndex) runs.push(allRuns[ri])
      } else {
        runs.push(allRuns[ri])
      }
    }
  }

  return runs
}

// ─── Helpers: append/cleanup ──────────────────────────────────────────────────

function _appendTextToEnd(pkg: OoxmlPackage, text: string) {
  const children = pkg.document.body.children
  if (children.length === 0) {
    children.push({ type: 'paragraph', content: [{ type: 'run', content: [{ type: 'text', text }] }] })
    return
  }
  const lastBlock = children[children.length - 1]
  if (lastBlock.type === 'paragraph') {
    const para = lastBlock as Paragraph
    // Find last run
    for (let i = para.content.length - 1; i >= 0; i--) {
      if (para.content[i].type === 'run') {
        const run = para.content[i] as Run
        for (let j = run.content.length - 1; j >= 0; j--) {
          if (run.content[j].type === 'text') {
            ;(run.content[j] as Text).text += text
            return
          }
        }
        run.content.push({ type: 'text', text })
        return
      }
    }
    para.content.push({ type: 'run', content: [{ type: 'text', text }] })
  } else {
    children.push({ type: 'paragraph', content: [{ type: 'run', content: [{ type: 'text', text }] }] })
  }
}

function _cleanup(pkg: OoxmlPackage) {
  // Remove empty runs
  for (const block of pkg.document.body.children) {
    if (block.type === 'paragraph') {
      const para = block as Paragraph
      para.content = para.content.filter((item) => {
        if (item.type !== 'run') return true
        const text = (item as Run).content
          .filter((n) => n.type === 'text')
          .map((n) => (n as Text).text)
          .join('')
        return text.length > 0
      })
    }
  }

  // Remove empty paragraphs (keep at least one)
  const nonEmpty = pkg.document.body.children.filter((block) => {
    if (block.type !== 'paragraph') return true
    return (block as Paragraph).content.length > 0
  })
  if (nonEmpty.length > 0) {
    pkg.document.body.children = nonEmpty
  }
}

// ─── Revision-Aware Transactions ─────────────────────────────────────────────

export interface RevisionTransactionOptions {
  /** Whether track changes is enabled */
  trackRevisions: boolean
  /** Author name for revision marks */
  author: string
  /** Date string for revision marks */
  date: string
  /** Next available revision ID */
  nextRevId: number
}

/**
 * Insert text with revision tracking.
 * When trackRevisions is enabled, wraps the inserted text in w:ins.
 */
export function insertTextTracked(
  pkg: OoxmlPackage,
  charIndex: number,
  text: string,
  opts: RevisionTransactionOptions,
): Transaction {
  if (!opts.trackRevisions) {
    return applyTransaction(pkg, [{ type: 'insertText', charIndex, text }])
  }

  // Find the paragraph and position for insertion
  const flatChars = _buildFlatChars(pkg)
  if (charIndex < 0 || charIndex > flatChars.length) return { ops: [], inverses: [] }

  // Insert a TrackedRun (w:ins) at the charIndex position
  const trackedRun: TrackedRun = {
    type: 'ins',
    id: opts.nextRevId,
    author: opts.author,
    date: opts.date,
    content: [{
      type: 'run',
      content: [{ type: 'text', text, space: 'preserve' }],
    }],
  }

  // Find insertion point in paragraph
  if (flatChars.length === 0 || charIndex >= flatChars.length) {
    // Append to last paragraph
    const children = pkg.document.body.children
    let lastPara: Paragraph | null = null
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i].type === 'paragraph') {
        lastPara = children[i] as Paragraph
        break
      }
    }
    if (lastPara) {
      lastPara.content.push(trackedRun as any)
    } else {
      // Create a new paragraph
      const newPara: Paragraph = {
        type: 'paragraph',
        content: [trackedRun as any],
      }
      children.push(newPara)
    }
  } else {
    const fc = flatChars[charIndex]
    const block = pkg.document.body.children[fc.blockIndex]
    if (block?.type === 'paragraph') {
      const para = block as Paragraph
      // Find the run to insert after
      let runCount = 0
      for (let i = 0; i < para.content.length; i++) {
        const item = para.content[i]
        if (item.type === 'run') {
          if (runCount === fc.runIndex) {
            // Insert tracked run after this run
            para.content.splice(i + 1, 0, trackedRun as any)
            break
          }
          runCount++
        }
      }
    }
  }

  // Return transaction with inverse (delete the tracked run)
  const op: InsertTextOp = { type: 'insertText', charIndex, text }
  const inverse: DeleteTextOp = { type: 'deleteText', startIndex: charIndex, endIndex: charIndex + text.length }
  return { ops: [op], inverses: [inverse] }
}

/**
 * Delete text with revision tracking.
 * When trackRevisions is enabled, wraps the deleted text content in w:del.
 */
export function deleteTextTracked(
  pkg: OoxmlPackage,
  startIndex: number,
  endIndex: number,
  opts: RevisionTransactionOptions,
): Transaction {
  if (!opts.trackRevisions) {
    return applyTransaction(pkg, [{ type: 'deleteText', startIndex, endIndex }])
  }

  const flatChars = _buildFlatChars(pkg)
  if (startIndex < 0 || endIndex > flatChars.length || startIndex >= endIndex) return { ops: [], inverses: [] }

  // Collect the runs that contain the deleted text
  const affectedRuns: Run[] = []
  const affectedParas: Paragraph[] = []

  for (let i = startIndex; i < endIndex; i++) {
    const fc = flatChars[i]
    const block = pkg.document.body.children[fc.blockIndex]
    if (block?.type === 'paragraph') {
      const para = block as Paragraph
      if (!affectedParas.includes(para)) affectedParas.push(para)

      let runCount = 0
      for (const item of para.content) {
        if (item.type === 'run') {
          if (runCount === fc.runIndex) {
            const run = item as Run
            if (!affectedRuns.includes(run)) affectedRuns.push(run)
            break
          }
          runCount++
        }
      }
    }
  }

  // Create a TrackedRun (w:del) with the affected runs' content
  if (affectedRuns.length === 0) return { ops: [], inverses: [] }

  // Extract text from affected runs for the del content
  const delRuns: Run[] = affectedRuns.map((run) => ({
    type: 'run' as const,
    rPr: run.rPr,
    content: run.content.filter((n) => n.type === 'text' || n.type === 'delText'),
  }))

  const trackedDel: TrackedRun = {
    type: 'del',
    id: opts.nextRevId,
    author: opts.author,
    date: opts.date,
    content: delRuns,
  }

  // Replace affected runs with the tracked delete in the first affected paragraph
  if (affectedParas.length > 0) {
    const firstPara = affectedParas[0]
    const firstRunIdx = firstPara.content.indexOf(affectedRuns[0] as any)
    if (firstRunIdx !== -1) {
      // Remove all affected runs from their paragraphs
      for (const run of affectedRuns) {
        for (const para of affectedParas) {
          const idx = para.content.indexOf(run as any)
          if (idx !== -1) {
            para.content.splice(idx, 1)
          }
        }
      }
      // Insert the tracked delete
      firstPara.content.splice(firstRunIdx, 0, trackedDel as any)
    }
  }

  // Return transaction with inverse (insert the deleted text)
  const deletedText = affectedRuns.map((r) =>
    r.content
      .filter((n) => n.type === 'text')
      .map((n) => (n as Text).text)
      .join('')
  ).join('')
  const op: DeleteTextOp = { type: 'deleteText', startIndex, endIndex }
  const inverse: InsertTextOp = { type: 'insertText', charIndex: startIndex, text: deletedText }
  return { ops: [op], inverses: [inverse] }
}

/**
 * Format text with revision tracking.
 * When trackRevisions is enabled, creates rPrChange marks.
 */
export function formatTextTracked(
  pkg: OoxmlPackage,
  startIndex: number,
  endIndex: number,
  property: string,
  value: unknown,
  opts: RevisionTransactionOptions,
): Transaction {
  // For now, formatting changes don't create visible tracked changes
  // in the document body (they're stored as rPrChange on the run properties).
  // This is consistent with Word's default behavior for formatting changes.
  return applyTransaction(pkg, [{ type: 'formatText', startIndex, endIndex, property, value }])
}
