/**
 * OOXML Char Index
 *
 * Maps flat charIndex (used by selection/input) to OoxmlPackage element positions.
 * Walk order matches the layout engine's _flattenRuns() to ensure consistent indexing.
 */

import type {
  OoxmlPackage,
  Paragraph,
  Run,
  Text,
  Table,
  TableRow,
  TableCell,
  BlockElement,
  Hyperlink,
  TrackedRun,
} from './ooxml-types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OoxmlChar {
  char: string
  charIndex: number
  /** Index in body.children[] */
  blockIndex: number
  /** Index of Run within paragraph content[] */
  runIndex: number
  /** Index of Text node within run.content[] */
  textNodeIndex: number
  /** Character offset within Text.text */
  charOffset: number
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Build a flat character index over OoxmlPackage.
 * Walk order: body.children → paragraph.content (Runs) → run.content (Texts) → chars
 * This matches the layout engine's _flattenRuns() ordering.
 */
export function buildOoxmlCharIndex(pkg: OoxmlPackage): OoxmlChar[] {
  const index: OoxmlChar[] = []
  let charCounter = 0

  _walkBlocks(pkg.document.body.children, pkg, index, charCounter, 0)

  return index
}

function _walkBlocks(
  blocks: BlockElement[],
  pkg: OoxmlPackage,
  index: OoxmlChar[],
  counter: number,
  blockOffset: number,
): number {
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi]
    if (block.type === 'paragraph') {
      counter = _walkParagraph(block as Paragraph, index, counter, blockOffset + bi)
    } else if (block.type === 'table') {
      counter = _walkTable(block as Table, pkg, index, counter, blockOffset + bi)
    }
    // SdtBlock, AltChunk: skip for now
  }
  return counter
}

function _walkParagraph(
  para: Paragraph,
  index: OoxmlChar[],
  counter: number,
  blockIndex: number,
): number {
  let runIdx = 0
  for (const item of para.content) {
    if (item.type === 'run') {
      counter = _walkRun(item as Run, index, counter, blockIndex, runIdx)
      runIdx++
    } else if (item.type === 'hyperlink') {
      const link = item as Hyperlink
      let linkRunIdx = 0
      for (const linkItem of link.content) {
        if (linkItem.type === 'run') {
          counter = _walkRun(linkItem as Run, index, counter, blockIndex, runIdx + linkRunIdx)
          linkRunIdx++
        }
      }
      runIdx += linkRunIdx
    } else if (item.type === 'ins' || item.type === 'del') {
      // Walk into tracked changes — index the contained runs
      const tracked = item as TrackedRun
      for (const run of tracked.content) {
        counter = _walkRun(run, index, counter, blockIndex, runIdx)
        runIdx++
      }
    }
    // commentRangeStart, commentRangeEnd: no text chars, skip
  }
  return counter
}

function _walkRun(
  run: Run,
  index: OoxmlChar[],
  counter: number,
  blockIndex: number,
  runIndex: number,
): number {
  let textNodeIdx = 0
  for (const node of run.content) {
    if (node.type === 'text' || node.type === 'delText') {
      const text = (node as Text).text
      for (let ci = 0; ci < text.length; ci++) {
        index.push({
          char: text[ci],
          charIndex: counter++,
          blockIndex,
          runIndex,
          textNodeIndex: textNodeIdx,
          charOffset: ci,
        })
      }
      textNodeIdx++
    }
    // Break, Tab, Symbol, Drawing: skip (no text chars)
  }
  return counter
}

function _walkTable(
  table: Table,
  pkg: OoxmlPackage,
  index: OoxmlChar[],
  counter: number,
  blockIndex: number,
): number {
  for (const row of table.content) {
    for (const cell of row.content) {
      counter = _walkBlocks(cell.content, pkg, index, counter, blockIndex)
    }
  }
  return counter
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Resolve a flat charIndex to an OoxmlChar position.
 * Returns null if charIndex is out of range.
 */
export function resolveCharIndex(
  pkg: OoxmlPackage,
  charIndex: number,
): OoxmlChar | null {
  const index = buildOoxmlCharIndex(pkg)
  if (charIndex < 0 || charIndex >= index.length) return null
  return index[charIndex]
}

/**
 * Get the total character count in the document.
 */
export function getDocumentCharCount(pkg: OoxmlPackage): number {
  let count = 0

  function walkBlocks(blocks: BlockElement[]) {
    for (const block of blocks) {
      if (block.type === 'paragraph') {
        walkParagraph(block as Paragraph)
      } else if (block.type === 'table') {
        walkTable(block as Table)
      }
    }
  }

  function walkParagraph(para: Paragraph) {
    for (const item of para.content) {
      if (item.type === 'run') {
        walkRun(item as Run)
      } else if (item.type === 'hyperlink') {
        for (const linkItem of (item as Hyperlink).content) {
          if (linkItem.type === 'run') walkRun(linkItem as Run)
        }
      }
    }
  }

  function walkRun(run: Run) {
    for (const node of run.content) {
      if (node.type === 'text') {
        count += (node as Text).text.length
      }
    }
  }

  function walkTable(table: Table) {
    for (const row of table.content) {
      for (const cell of row.content) {
        walkBlocks(cell.content)
      }
    }
  }

  walkBlocks(pkg.document.body.children)
  return count
}
