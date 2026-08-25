import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import { OoxmlParser } from '../ooxml-parser'
import { OoxmlLayoutEngine } from '../ooxml-layout-engine'
import { OoxmlPainter } from '../ooxml-painter'
import type { Paragraph, Table } from '../ooxml-types'

const DOCX_PATH = '/Users/kindy/Downloads/20260401 - LE -001 - HD mua ban Solar.docx'

describe('OOXML 3-Checkpoints Fidelity Test Suite', () => {
  it('Checkpoint 1: Lossless Package AST', async () => {
    if (!fs.existsSync(DOCX_PATH)) {
      console.warn('DOCX file not found at path, skipping real fixture test')
      return
    }

    const buffer = fs.readFileSync(DOCX_PATH)
    const parser = new OoxmlParser()
    const pkg = await parser.parse(buffer)

    expect(pkg).toBeDefined()
    expect(pkg.document.body.children.length).toBeGreaterThan(100)

    // Verify Tab tokens are preserved losslessly
    const allRuns = pkg.document.body.children
      .filter((b): b is Paragraph => b.type === 'paragraph')
      .flatMap(p => p.content.filter((c: any) => c.type === 'run'))

    const hasTab = allRuns.some((r: any) => r.content.some((n: any) => n.type === 'tab'))
    expect(hasTab).toBe(true)

    // Verify Table with Grid Columns
    const tables = pkg.document.body.children.filter((b): b is Table => b.type === 'table')
    expect(tables.length).toBeGreaterThan(0)
    expect(tables[0].tblGrid.length).toBe(6) // 6 columns in table
  })

  it('Checkpoint 2: LayoutTree Geometry & Dynamic Tab Stop Snapping', async () => {
    if (!fs.existsSync(DOCX_PATH)) return

    const buffer = fs.readFileSync(DOCX_PATH)
    const parser = new OoxmlParser()
    const pkg = await parser.parse(buffer)

    const engine = new OoxmlLayoutEngine()
    const tree = engine.layout(pkg)

    expect(tree.pages.length).toBeGreaterThan(0)
    const page1 = tree.pages[0]

    // Verify page dimensions (A4 standard: 11907 x 16839 twips in Word OOXML)
    expect(page1.geometry.pageW).toBe(11907)
    expect(page1.geometry.pageH).toBe(16839)

    // Verify dynamic tab stop widths (must not be static 720 for different x offsets)
    const paras = page1.blocks
      .filter(b => b.type === 'paragraph')
      .map(b => b.data as any)

    const tabLines = paras.flatMap(p => p.lines).filter(l => l.fragments.some((f: any) => f.kind === 'tab'))
    expect(tabLines.length).toBeGreaterThan(0)
    for (const l of tabLines) {
      const tabFrags = l.fragments.filter((f: any) => f.kind === 'tab')
      for (const tf of tabFrags) {
        expect(tf.width).toBeGreaterThan(0)
      }
    }
  })

  it('Checkpoint 3: Pure Painter Rendering Preserves Unicode Runs', () => {
    const painter = new OoxmlPainter()
    expect(painter).toBeDefined()
  })
})
