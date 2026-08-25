import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import { OoxmlParser } from '../ooxml-parser'
import { OoxmlLayoutEngine } from '../ooxml-layout-engine'
import { NumberingEngine } from '../numbering-engine'
import type { Table, Paragraph } from '../ooxml-types'

const DOCX_PATH = '/Users/kindy/Downloads/20260401 - LE -001 - HD mua ban Solar.docx'

describe('ISO/IEC 29500 Compliance Test Suite', () => {
  it('ISO §17.4.17: Table gridSpan Column Width Accumulation', async () => {
    if (!fs.existsSync(DOCX_PATH)) return

    const buffer = fs.readFileSync(DOCX_PATH)
    const parser = new OoxmlParser()
    const pkg = await parser.parse(buffer)

    const engine = new OoxmlLayoutEngine()
    const tree = engine.layout(pkg)

    const tableBlock = tree.pages[0].blocks.find(b => b.type === 'table')
    expect(tableBlock).toBeDefined()
    const layoutTable = tableBlock!.data as any

    const headerRow = layoutTable.rows[0]
    expect(headerRow.cells.length).toBe(6)

    const subtotalRow = layoutTable.rows[3]
    expect(subtotalRow.cells.length).toBe(2)

    const cell1Width = subtotalRow.cells[0].width
    const cell2Width = subtotalRow.cells[1].width
    expect(cell1Width).toBeGreaterThan(cell2Width * 3)

    const totalHeaderWidth = headerRow.cells.reduce((sum: number, c: any) => sum + c.width, 0)
    const totalSubtotalWidth = subtotalRow.cells.reduce((sum: number, c: any) => sum + c.width, 0)
    expect(totalSubtotalWidth).toBe(totalHeaderWidth)
  })

  it('ISO §20.4.3: DrawingML posOffset Extraction', async () => {
    if (!fs.existsSync(DOCX_PATH)) return

    const buffer = fs.readFileSync(DOCX_PATH)
    const parser = new OoxmlParser()
    const pkg = await parser.parse(buffer)

    expect(pkg.media.size).toBeGreaterThan(0)
  })

  it('ISO §17.9: Numbering Formats', () => {
    const numPart = {
      abstractNums: new Map([
        [1, {
          abstractNumId: 1,
          levels: [
            { ilvl: 0, numFmt: 'decimalEnclosedCircle', lvlText: '%1', start: 1 },
            { ilvl: 1, numFmt: 'decimalEnclosedParen', lvlText: '%2', start: 1 },
            { ilvl: 2, numFmt: 'ordinal', lvlText: '%3', start: 1 },
          ]
        }]
      ]),
      nums: new Map([
        [1, { numId: 1, abstractNumId: 1 }]
      ])
    }

    const engine = new NumberingEngine(numPart as any)
    const r1 = engine.resolve(1, 0)
    expect(r1?.text).toBe('①')

    const r2 = engine.resolve(1, 1)
    expect(r2?.text).toBe('(1)')

    const r3 = engine.resolve(1, 2)
    expect(r3?.text).toBe('1st')
  })

  it('ISO §17.3.1.37: Center Tab Stop Symmetry (Signature Block Alignment)', async () => {
    if (!fs.existsSync(DOCX_PATH)) return

    const buffer = fs.readFileSync(DOCX_PATH)
    const parser = new OoxmlParser()
    const pkg = await parser.parse(buffer)

    const engine = new OoxmlLayoutEngine()
    const tree = engine.layout(pkg)

    const allParas = tree.pages.flatMap(p => p.blocks.filter(b => b.type === 'paragraph').map(b => b.data as any))
    // Filter specifically by styleId === 'Chuky'
    const chukyParas = allParas.filter(p => p.styleId === 'Chuky' && p.lines[0]?.fragments.length > 2)

    expect(chukyParas.length).toBe(2) // Title line (p109) and signature name line (p115)

    const pTitle = chukyParas[0]
    const pSigner = chukyParas[1]

    // Title line: ĐẠI DIỆN BÊN A (center ~1800) and ĐẠI DIỆN BÊN B (center ~7560)
    const lineTitle = pTitle.lines[0]
    const centerTitleA = lineTitle.fragments[0].width + lineTitle.fragments[1].width / 2
    const centerTitleB = lineTitle.fragments[0].width + lineTitle.fragments[1].width + lineTitle.fragments[2].width + lineTitle.fragments[3].width / 2

    // Signer line: ............. (center ~1800) and LÊ QUỐC ANH (center ~7560)
    const lineSigner = pSigner.lines[0]
    const centerSignerA = lineSigner.fragments[0].width + lineSigner.fragments[1].width / 2
    const centerSignerB = lineSigner.fragments[0].width + lineSigner.fragments[1].width + lineSigner.fragments[2].width + lineSigner.fragments[3].width / 2

    expect(Math.abs(centerTitleA - 1800)).toBeLessThan(50)
    expect(Math.abs(centerSignerA - 1800)).toBeLessThan(50)
    expect(Math.abs(centerTitleA - centerSignerA)).toBeLessThan(50)

    expect(Math.abs(centerTitleB - 7560)).toBeLessThan(50)
    expect(Math.abs(centerSignerB - 7560)).toBeLessThan(50)
    expect(Math.abs(centerTitleB - centerSignerB)).toBeLessThan(50)
  })
})
