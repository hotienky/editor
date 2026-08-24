import { describe, it, expect, afterEach } from 'vitest'
import JSZip from 'jszip'
import { createTestEditor } from '../../factories/editor'
import {
  convertDocxToHTML,
  convertDocxToElementList,
  convertDocxToEditorData,
  convertEditorDataToDocx,
  extractDocxHeaderFooter,
  parseHeaderFooterXml
} from '../../../src/editor/utils/docx'

describe('Word (DOC/DOCX) Import & Conversion', () => {
  let ctx: ReturnType<typeof createTestEditor>
  afterEach(() => ctx?.destroy())

  it('convertDocxToHTML converts text fallback on plain text or non-zip buffer', async () => {
    const text = 'Hello world from document\nSecond line'
    const encoder = new TextEncoder()
    const buffer = encoder.encode(text)

    const html = await convertDocxToHTML(buffer)
    expect(html).toContain('Hello world from document')
    expect(html).toContain('Second line')
  })

  it('convertDocxToElementList converts buffer to canvas-editor elements', async () => {
    const text = 'Test heading content\nParagraph 2'
    const encoder = new TextEncoder()
    const buffer = encoder.encode(text)

    const elements = await convertDocxToElementList(buffer, { innerWidth: 794 })
    expect(elements.length).toBeGreaterThan(0)
    const combinedText = elements.map(e => e.value).join('')
    expect(combinedText).toContain('Test heading content')
  })

  it('parseHeaderFooterXml parses Word header and footer XML correctly', () => {
    const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:p>
        <w:pPr>
          <w:jc w:val="right"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:color w:val="FF0000"/>
          </w:rPr>
          <w:t>Header Company Name</w:t>
        </w:r>
      </w:p>
    </w:hdr>`

    const elements = parseHeaderFooterXml(headerXml)
    expect(elements.length).toBeGreaterThan(0)
    const textEl = elements.find(e => e.value === 'Header Company Name')
    expect(textEl).toBeDefined()
    expect(textEl?.bold).toBe(true)
    expect(textEl?.color).toBe('#FF0000')
    expect(textEl?.rowFlex).toBe('right')
  })

  it('extractDocxHeaderFooter and convertDocxToEditorData extracts header, main, and footer', async () => {
    const zip = new JSZip()
    // Add header
    zip.file(
      'word/header1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:p><w:r><w:t>Test Header Title</w:t></w:r></w:p>
      </w:hdr>`
    )
    // Add footer
    zip.file(
      'word/footer1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:p><w:r><w:t>Test Footer Page 1</w:t></w:r></w:p>
      </w:ftr>`
    )
    // Add document
    zip.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Main Body Text</w:t></w:r></w:p>
        </w:body>
      </w:document>`
    )
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`
    )

    const buffer = await zip.generateAsync({ type: 'arraybuffer' })

    const headerFooter = await extractDocxHeaderFooter(buffer)
    expect(headerFooter.header).toBeDefined()
    expect(headerFooter.header?.some(e => e.value.includes('Test Header Title'))).toBe(true)
    expect(headerFooter.footer).toBeDefined()
    expect(headerFooter.footer?.some(e => e.value.includes('Test Footer Page 1'))).toBe(true)

    const editorData = await convertDocxToEditorData(buffer)
    expect(editorData.main).toBeDefined()
    expect(editorData.header).toBeDefined()
    expect(editorData.footer).toBeDefined()
  })

  it('executeImportDocx imports content into editor instance with header and footer', async () => {
    ctx = createTestEditor()
    const zip = new JSZip()
    zip.file(
      'word/header1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:p><w:r><w:t>Header from docx</w:t></w:r></w:p>
      </w:hdr>`
    )
    zip.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Imported document main text</w:t></w:r></w:p>
        </w:body>
      </w:document>`
    )
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`
    )

    const buffer = await zip.generateAsync({ type: 'arraybuffer' })
    const result = await ctx.editor.command.executeImportDocx(buffer)

    expect(result.main).toBeDefined()
    expect(ctx.editor.command.getText().main).toContain('Imported document main text')
    expect(ctx.editor.command.getText().header).toContain('Header from docx')
  })

  it('convertEditorDataToDocx exports styled document with formatting, tables, lists, header and footer', async () => {
    const editorData = {
      header: [
        { value: 'Header Title Text', bold: true, color: '#0055FF' }
      ],
      main: [
        { value: 'Main Heading', level: 'first' as any, bold: true },
        { value: '\n' },
        { value: 'This is ', bold: false },
        { value: 'bold text', bold: true, color: '#FF0000' },
        { value: ' and ' },
        { value: 'italic text', italic: true, underline: true },
        { value: '\n' },
        { value: 'List Item 1', listType: 'ul' as any, listStyle: 'dash' as any },
        { value: '\n' },
        { value: 'List Item 2', listType: 'ul' as any, listStyle: 'dash' as any },
        { value: '\n' },
        {
          type: 'table' as any,
          value: '',
          colgroup: [{ width: 200 }, { width: 300 }],
          trList: [
            {
              height: 40,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  backgroundColor: '#F0F0F0',
                  value: [{ value: 'Cell 1' }]
                },
                {
                  colspan: 1,
                  rowspan: 1,
                  value: [{ value: 'Cell 2', bold: true }]
                }
              ]
            }
          ]
        }
      ],
      footer: [
        { value: 'Page 1 of Footer' }
      ]
    }

    const blob = await convertEditorDataToDocx(editorData)
    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(0)

    const arrayBuffer = await blob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    expect(zip.file('word/document.xml')).toBeDefined()
    expect(zip.file('word/styles.xml')).toBeDefined()
    expect(zip.file('word/header1.xml')).toBeDefined()
    expect(zip.file('word/footer1.xml')).toBeDefined()
    expect(zip.file('[Content_Types].xml')).toBeDefined()
    expect(zip.file('word/_rels/document.xml.rels')).toBeDefined()

    const docXml = await zip.file('word/document.xml')!.async('string')
    expect(docXml).toContain('Main Heading')
    expect(docXml).toContain('bold text')
    expect(docXml).toContain('FF0000')
    expect(docXml).toContain('List Item 1')
    expect(docXml).toContain('Cell 1')
    expect(docXml).toContain('Cell 2')

    const headerXml = await zip.file('word/header1.xml')!.async('string')
    expect(headerXml).toContain('Header Title Text')

    const footerXml = await zip.file('word/footer1.xml')!.async('string')
    expect(footerXml).toContain('Page 1 of Footer')
  })

  it('executeExportDocx and getDocx work on editor instance', async () => {
    ctx = createTestEditor({
      data: [{ value: 'Canvas Editor Export DOCX Test', bold: true }]
    })

    const docxBlob = await ctx.editor.command.getDocx()
    expect(docxBlob).toBeDefined()
    expect(docxBlob.size).toBeGreaterThan(0)

    const arrayBuffer = await docxBlob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const docXml = await zip.file('word/document.xml')!.async('string')
    expect(docXml).toContain('Canvas Editor Export DOCX Test')
  })

  it('exports footer with dynamic page number fields {pageNo} and {pageCount}', async () => {
    const editorData = {
      main: [{ value: 'Document content' }],
      footer: [
        {
          value: 'Trang {pageNo} / {pageCount}',
          rowFlex: 'right' as any,
          size: 10,
          color: '#666666'
        }
      ]
    }

    const blob = await convertEditorDataToDocx(editorData)
    const arrayBuffer = await blob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const footerXml = await zip.file('word/footer1.xml')!.async('string')

    expect(footerXml).toContain('w:jc w:val="right"')
    expect(footerXml).toContain('w:instr="PAGE"')
    expect(footerXml).toContain('w:instr="NUMPAGES"')
    expect(footerXml).toContain('Trang ')
    expect(footerXml).toContain(' / ')
  })
})
