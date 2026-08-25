import { describe, expect, it } from 'vitest'
import { OoxmlParser } from '../ooxml-parser'
import * as fflate from 'fflate'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMinimalDocx(parts: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder()
  const files: Record<string, Uint8Array> = {}

  // [Content_Types].xml
  const contentTypes = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '  <Default Extension="xml" ContentType="application/xml"/>',
    '  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>',
    '  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>',
    '  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>',
    '  <Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
    '  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>',
    '  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>',
    '  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>',
    '</Types>',
  ].join('\n')
  files['[Content_Types].xml'] = encoder.encode(contentTypes)

  // _rels/.rels
  const rels = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>',
  ].join('\n')
  files['_rels/.rels'] = encoder.encode(rels)

  // word/_rels/document.xml.rels
  const docRels = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    '  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    '  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>',
    '  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>',
    '  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>',
    '  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>',
    '  <Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>',
    '</Relationships>',
  ].join('\n')
  files['word/_rels/document.xml.rels'] = encoder.encode(docRels)

  // word/styles.xml (minimal)
  const styles = parts.styles || [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:docDefaults>',
    '    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="SimSun"/></w:rPr></w:rPrDefault>',
    '    <w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240"/></w:pPr></w:pPrDefault>',
    '  </w:docDefaults>',
    '  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>',
    '</w:styles>',
  ].join('\n')
  files['word/styles.xml'] = encoder.encode(styles)

  // word/document.xml
  files['word/document.xml'] = encoder.encode(parts.document || [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    '  <w:p><w:r><w:t>Hello World</w:t></w:r></w:p>',
    '</w:body>',
    '</w:document>',
  ].join('\n'))

  // word/numbering.xml
  files['word/numbering.xml'] = encoder.encode(parts.numbering || [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '</w:numbering>',
  ].join('\n'))

  // word/settings.xml
  files['word/settings.xml'] = encoder.encode(parts.settings || [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
  ].join('\n'))

  // word/fontTable.xml
  files['word/fontTable.xml'] = encoder.encode(parts.fontTable || [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:font w:name="Times New Roman"><w:panose1 w:val="02020603050405020304"/></w:font>',
    '</w:fonts>',
  ].join('\n'))

  // word/theme/theme1.xml
  files['word/theme/theme1.xml'] = encoder.encode(parts.theme || [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
    '  <a:themeElements>',
    '    <a:clrScheme name="Office">',
    '      <a:dk1><a:srgbClr val="000000"/></a:dk1>',
    '      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>',
    '      <a:dk2><a:srgbClr val="44546A"/></a:dk2>',
    '      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>',
    '      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>',
    '      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>',
    '      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>',
    '      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>',
    '      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>',
    '      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>',
    '      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>',
    '      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>',
    '    </a:clrScheme>',
    '    <a:fontScheme name="Office">',
    '      <a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface="Microsoft YaHei"/></a:majorFont>',
    '      <a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/></a:minorFont>',
    '    </a:fontScheme>',
    '    <a:fmtScheme name="Office"/>',
    '  </a:themeElements>',
    '</a:theme>',
  ].join('\n'))

  // word/header1.xml
  files['word/header1.xml'] = encoder.encode(parts.header || [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:p><w:r><w:t>Header</w:t></w:r></w:p>',
    '</w:hdr>',
  ].join('\n'))

  // word/footer1.xml
  files['word/footer1.xml'] = encoder.encode(parts.footer || [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:p><w:r><w:t>Footer</w:t></w:r></w:p>',
    '</w:ftr>',
  ].join('\n'))

  // word/comments.xml
  files['word/comments.xml'] = encoder.encode(parts.comments || [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '</w:comments>',
  ].join('\n'))

  // Create ZIP
  const zipData: Record<string, Uint8Array> = {}
  for (const [name, content] of Object.entries(files)) {
    zipData[name] = content
  }

  return fflate.zipSync(zipData)
}

// ─── Tests: Basic Parsing ────────────────────────────────────────────────────

const parseDocx = async (parts: Record<string, string>) => {
  const docx = createMinimalDocx(parts)
  const parser = new OoxmlParser()
  return parser.parse(docx)
}

describe('OoxmlParser — basic parsing', () => {
  it('parses a minimal DOCX file', async () => {
    const result = await parseDocx({})

    expect(result).toBeDefined()
    expect(result.document).toBeDefined()
    expect(result.document.body).toBeDefined()
  })

  it('parses document body content', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:r><w:t>Hello World</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    expect(result.document.body.children).toHaveLength(1)
    const para = result.document.body.children[0] as any
    expect(para.type).toBe('paragraph')
  })

  it('parses multiple paragraphs', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:r><w:t>Para 1</w:t></w:r></w:p>',
        '  <w:p><w:r><w:t>Para 2</w:t></w:r></w:p>',
        '  <w:p><w:r><w:t>Para 3</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    expect(result.document.body.children).toHaveLength(3)
  })
})

// ─── Tests: Runs and Text ────────────────────────────────────────────────────

describe('OoxmlParser — runs and text', () => {
  it('parses text content', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:r><w:t>Hello World</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    const run = para.content[0]
    expect(run.type).toBe('run')
    expect(run.content[0].type).toBe('text')
    expect(run.content[0].text).toBe('Hello World')
  })

  it('parses bold run properties', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    const run = para.content[0]
    expect(run.rPr).toBeDefined()
    expect(run.rPr.b).toBe(true)
  })

  it('parses italic run properties', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Italic</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    const run = para.content[0]
    expect(run.rPr.i).toBe(true)
  })

  it('parses font size', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:t>Size 14pt</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    const run = para.content[0]
    expect(run.rPr.sz).toBe(28) // half-points
  })

  it('parses underline', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>Underline</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    const run = para.content[0]
    expect(run.rPr.u).toBe('single')
  })
})

// ─── Tests: Paragraph Properties ─────────────────────────────────────────────

describe('OoxmlParser — paragraph properties', () => {
  it('parses alignment', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>Centered</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    expect(para.pPr.jc).toBe('center')
  })

  it('parses spacing', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:pPr><w:spacing w:before="200" w:after="100" w:line="276"/></w:pPr><w:r><w:t>Spaced</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    expect(para.pPr.spacing.before).toBe(200)
    expect(para.pPr.spacing.after).toBe(100)
    expect(para.pPr.spacing.line).toBe(276)
  })

  it('parses indentation', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:pPr><w:ind w:left="720" w:right="720" w:firstLine="480"/></w:pPr><w:r><w:t>Indented</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    expect(para.pPr.ind.left).toBe(720)
    expect(para.pPr.ind.right).toBe(720)
    expect(para.pPr.ind.firstLine).toBe(480)
  })

  it('parses numbering properties', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Item 1</w:t></w:r></w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    expect(para.pPr.numPr).toBeDefined()
    expect(para.pPr.numPr.numId).toBe(1)
    expect(para.pPr.numPr.ilvl).toBe(0)
  })
})

// ─── Tests: Tables ───────────────────────────────────────────────────────────

describe('OoxmlParser — tables', () => {
  it('parses a simple table', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:tbl>',
        '    <w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr>',
        '    <w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid>',
        '    <w:tr>',
        '      <w:tc><w:p><w:r><w:t>Cell 1</w:t></w:r></w:p></w:tc>',
        '      <w:tc><w:p><w:r><w:t>Cell 2</w:t></w:r></w:p></w:tc>',
        '    </w:tr>',
        '    <w:tr>',
        '      <w:tc><w:p><w:r><w:t>Cell 3</w:t></w:r></w:p></w:tc>',
        '      <w:tc><w:p><w:r><w:t>Cell 4</w:t></w:r></w:p></w:tc>',
        '    </w:tr>',
        '  </w:tbl>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const table = result.document.body.children[0] as any
    expect(table.type).toBe('table')
    expect(table.tblPr?.tblStyle).toBe('TableGrid')
    expect(table.content).toHaveLength(2) // 2 rows
    expect(table.content[0].content).toHaveLength(2) // 2 cells per row
  })

  it('parses nested tables', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:tbl>',
        '    <w:tblGrid><w:gridCol w:w="8000"/></w:tblGrid>',
        '    <w:tr>',
        '      <w:tc>',
        '        <w:tbl>',
        '          <w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid>',
        '          <w:tr>',
        '            <w:tc><w:p><w:r><w:t>Nested 1</w:t></w:r></w:p></w:tc>',
        '            <w:tc><w:p><w:r><w:t>Nested 2</w:t></w:r></w:p></w:tc>',
        '          </w:tr>',
        '        </w:tbl>',
        '      </w:tc>',
        '    </w:tr>',
        '  </w:tbl>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const outerTable = result.document.body.children[0] as any
    expect(outerTable.type).toBe('table')
    const outerCell = outerTable.content[0].content[0]
    const innerTable = outerCell.content[0]
    expect(innerTable.type).toBe('table')
    expect(innerTable.content[0].content).toHaveLength(2) // 2 cells
  })
})

// ─── Tests: Styles ───────────────────────────────────────────────────────────

describe('OoxmlParser — styles', () => {
  it('parses paragraph styles', async () => {
    const result = await parseDocx({
      styles: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '  <w:docDefaults>',
        '    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr></w:rPrDefault>',
        '    <w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240"/></w:pPr></w:pPrDefault>',
        '  </w:docDefaults>',
        '  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>',
        '  <w:style w:type="paragraph" w:styleId="Heading1">',
        '    <w:name w:val="heading 1"/>',
        '    <w:basedOn w:val="Normal"/>',
        '    <w:pPr><w:spacing w:before="240"/></w:pPr>',
        '    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>',
        '  </w:style>',
        '</w:styles>',
      ].join('\n'),
    })

    expect(result.styles).toBeDefined()
    expect(result.styles.styles.size).toBe(2) // Normal + Heading1
    const heading1 = result.styles.styles.get('Heading1')
    expect(heading1).toBeDefined()
    expect(heading1?.basedOn).toBe('Normal')
  })

  it('parses character styles', async () => {
    const result = await parseDocx({
      styles: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '  <w:style w:type="character" w:styleId="BoldRed">',
        '    <w:name w:val="Bold Red"/>',
        '    <w:rPr><w:b/><w:color w:val="FF0000"/></w:rPr>',
        '  </w:style>',
        '</w:styles>',
      ].join('\n'),
    })

    const boldRed = result.styles.styles.get('BoldRed')
    expect(boldRed).toBeDefined()
    expect(boldRed?.type).toBe('character')
    expect(boldRed?.rPr?.b).toBe(true)
    expect(boldRed?.rPr?.color).toBe('FF0000')
  })
})

// ─── Tests: Numbering ────────────────────────────────────────────────────────

describe('OoxmlParser — numbering', () => {
  it('parses abstract numbering definitions', async () => {
    const result = await parseDocx({
      numbering: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '  <w:abstractNum w:abstractNumId="0">',
        '    <w:lvl w:ilvl="0">',
        '      <w:start w:val="1"/>',
        '      <w:numFmt w:val="decimal"/>',
        '      <w:lvlText w:val="%1."/>',
        '    </w:lvl>',
        '    <w:lvl w:ilvl="1">',
        '      <w:start w:val="1"/>',
        '      <w:numFmt w:val="lowerLetter"/>',
        '      <w:lvlText w:val="%2)"/>',
        '    </w:lvl>',
        '  </w:abstractNum>',
        '  <w:num w:numId="1">',
        '    <w:abstractNumId w:val="0"/>',
        '  </w:num>',
        '</w:numbering>',
      ].join('\n'),
    })

    expect(result.numbering).toBeDefined()
    const abstractNum = result.numbering.abstractNums.get(0)
    expect(abstractNum).toBeDefined()
    expect(abstractNum?.levels).toHaveLength(2)

    const num = result.numbering.nums.get(1)
    expect(num).toBeDefined()
    expect(num?.abstractNumId).toBe(0)
  })

  it('parses level overrides', async () => {
    const result = await parseDocx({
      numbering: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '  <w:abstractNum w:abstractNumId="0">',
        '    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/></w:lvl>',
        '  </w:abstractNum>',
        '  <w:num w:numId="1">',
        '    <w:abstractNumId w:val="0"/>',
        '    <w:lvlOverride w:ilvl="0"><w:startOverride w:val="5"/></w:lvlOverride>',
        '  </w:num>',
        '</w:numbering>',
      ].join('\n'),
    })

    const num = result.numbering.nums.get(1)
    expect(num?.levelOverride).toHaveLength(1)
    expect(num?.levelOverride?.[0].startOverride).toBe(5)
  })
})

// ─── Tests: Headers and Footers ──────────────────────────────────────────────

describe('OoxmlParser — headers and footers', () => {
  it('parses headers', async () => {
    const result = await parseDocx({
      header: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '  <w:p><w:r><w:t>My Header</w:t></w:r></w:p>',
        '</w:hdr>',
      ].join('\n'),
    })

    expect(result.headers.size).toBe(1)
    const header = result.headers.get('header1.xml')
    expect(header).toBeDefined()
  })

  it('parses footers', async () => {
    const result = await parseDocx({
      footer: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '  <w:p><w:r><w:t>My Footer</w:t></w:r></w:p>',
        '</w:ftr>',
      ].join('\n'),
    })

    expect(result.footers.size).toBe(1)
    const footer = result.footers.get('footer1.xml')
    expect(footer).toBeDefined()
  })
})

// ─── Tests: Theme ────────────────────────────────────────────────────────────

describe('OoxmlParser — theme', () => {
  it('parses theme fonts', async () => {
    const result = await parseDocx({})

    expect(result.theme).toBeDefined()
    expect(result.theme!.themeElements.fontScheme.majorFont.latin?.typeface).toBe('Calibri Light')
    expect(result.theme!.themeElements.fontScheme.minorFont.latin?.typeface).toBe('Calibri')
  })

  it('parses theme colors', async () => {
    const result = await parseDocx({})

    expect(result.theme).toBeDefined()
    expect(result.theme!.themeElements.clrScheme.accent1).toBe('4472C4')
    expect(result.theme!.themeElements.clrScheme.dark1).toBe('000000')
  })
})

// ─── Tests: Hyperlinks ───────────────────────────────────────────────────────

describe('OoxmlParser — hyperlinks', () => {
  it('parses hyperlinks', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p>',
        '    <w:hyperlink w:history="1" w:tooltip="Click here" w:anchor="top">',
        '      <w:r><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr><w:t>Link</w:t></w:r>',
        '    </w:hyperlink>',
        '  </w:p>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    const para = result.document.body.children[0] as any
    const hyperlink = para.content[0]
    expect(hyperlink.type).toBe('hyperlink')
    expect(hyperlink.tooltip).toBe('Click here')
    expect(hyperlink.anchor).toBe('top')
  })
})

// ─── Tests: Section Properties ───────────────────────────────────────────────

describe('OoxmlParser — section properties', () => {
  it('parses section properties from document body', async () => {
    const result = await parseDocx({
      document: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>',
        '  <w:p><w:r><w:t>Content</w:t></w:r></w:p>',
        '  <w:sectPr>',
        '    <w:pgSz w:w="12240" w:h="15840"/>',
        '    <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/>',
        '    <w:cols w:num="2"/>',
        '  </w:sectPr>',
        '</w:body>',
        '</w:document>',
      ].join('\n'),
    })

    expect(result.document.body.sectPr).toBeDefined()
    expect(result.document.body.sectPr?.pgSz?.w).toBe(12240)
    expect(result.document.body.sectPr?.pgSz?.h).toBe(15840)
    expect(result.document.body.sectPr?.cols?.num).toBe(2)
  })
})

// ─── Tests: Error Handling ───────────────────────────────────────────────────

describe('OoxmlParser — error handling', () => {
  it('throws on invalid ZIP data', async () => {
    const invalidData = new Uint8Array([1, 2, 3, 4, 5])
    const parser = new OoxmlParser()

    await expect(parser.parse(invalidData)).rejects.toThrow()
  })

  it('handles missing document.xml gracefully', async () => {
    // Create a ZIP with no document.xml
    const encoder = new TextEncoder()
    const contentTypes = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '  <Default Extension="xml" ContentType="application/xml"/>',
      '</Types>',
    ].join('\n')

    const zipData: Record<string, Uint8Array> = {
      '[Content_Types].xml': encoder.encode(contentTypes),
      '_rels/.rels': encoder.encode([
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
        '</Relationships>',
      ].join('\n')),
    }

    const invalidDocx = fflate.zipSync(zipData)
    const parser = new OoxmlParser()

    const result = await parser.parse(invalidDocx)
    expect(result.document.body.children).toHaveLength(0)
  })
})
