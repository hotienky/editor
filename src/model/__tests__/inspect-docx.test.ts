import { describe, it } from 'vitest'
import { readFileSync } from 'fs'
import { OoxmlParser } from '../ooxml-parser'

function inspectDocx(path: string) {
  const parser = new OoxmlParser()
  const buf = readFileSync(path)
  return parser.parse(new Uint8Array(buf))
}

describe('Inspect DOCX files', () => {
  it('inspect LE Solar contract', async () => {
    const pkg = await inspectDocx('/Users/kindy/Downloads/20260401 - LE -001 - HD mua ban Solar.docx')
    const children = pkg.document.body.children
    console.log('=== 20260401 - LE -001 - HD mua ban Solar.docx ===')
    console.log('Total children:', children.length)

    // Print styles
    console.log('\n=== STYLES ===')
    for (const [id, style] of pkg.styles.styles) {
      const basedOn = style.basedOn ? ` basedOn=${style.basedOn}` : ''
      const next = style.next ? ` next=${style.next}` : ''
      const pStyle = style.pPr?.pStyle ? ` pStyle=${style.pPr.pStyle}` : ''
      const numPr = style.pPr?.numPr ? ` numPr(numId=${style.pPr.numPr.numId},ilvl=${style.pPr.numPr.ilvl})` : ''
      console.log(`  ${id} (${style.type})${basedOn}${next}${numPr} name="${style.name || ''}"`)
    }

    // Print numbering
    console.log('\n=== NUMBERING ===')
    for (const [numId, num] of pkg.numbering.nums) {
      const abs = pkg.numbering.abstractNums.get(num.abstractNumId)
      console.log(`  numId=${numId} → abstractNumId=${num.abstractNumId}`)
      if (abs) {
        for (const lvl of abs.levels) {
          console.log(`    ilvl=${lvl.ilvl} numFmt=${lvl.numFmt} lvlText="${lvl.lvlText}" start=${lvl.start}`)
          if (lvl.pPr?.ind) console.log(`      ind: left=${lvl.pPr.ind.left} hanging=${lvl.pPr.ind.hanging} firstLine=${lvl.pPr.ind.firstLine}`)
        }
      }
    }

    // Print paragraphs 60-100 (around Điều 6 area)
    console.log('\n=== PARAGRAPHS (60-100) ===')
    for (let i = 60; i < Math.min(100, children.length); i++) {
      const child = children[i]
      if (child.type === 'paragraph') {
        const p = child as any
        let text = ''
        for (const item of p.content) {
          if (item.type === 'run') {
            for (const node of item.content) {
              if (node.type === 'text') text += node.text
            }
          } else if (item.type === 'hyperlink') {
            for (const run of item.content) {
              if (run.type === 'run') {
                for (const node of run.content) {
                  if (node.type === 'text') text += node.text
                }
              }
            }
          }
        }
        const style = p.pPr?.pStyle || '-'
        const numPr = p.pPr?.numPr ? `num(${p.pPr.numPr.numId}:${p.pPr.numPr.ilvl})` : '-'
        const ind = p.pPr?.ind ? `ind(L=${p.pPr.ind.left},FL=${p.pPr.ind.firstLine},H=${p.pPr.ind.hanging})` : ''
        const sp = p.pPr?.spacing ? `sp(B=${p.pPr.spacing.before},A=${p.pPr.spacing.after},L=${p.pPr.spacing.line})` : ''
        console.log(`[${i}] style=${style} numPr=${numPr} ${ind} ${sp}`)
        console.log(`    "${text.substring(0, 200)}"`)
      }
    }
  })
})
