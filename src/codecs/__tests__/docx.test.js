import { describe, expect, it } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { createEmptyDocumentState } from '../../core/state'
import { exportDocx, importDocx, inspectDocx, ooxmlToDocumentState } from '../docx'

const pixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

describe('DOCX codec', () => {
  it('exports a real OOXML package and imports supported text', async () => {
    const state = createEmptyDocumentState({
      content: { type: 'doc', content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'HỢP ĐỒNG' }] },
        { type: 'paragraph', attrs: { textAlign: 'justify', lineHeight: 1.5 }, content: [{
          type: 'text', text: 'Nội dung tiếng Việt',
          marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { fontFamily: 'Times New Roman', fontSize: '13pt', color: '#C00000' } }],
        }] },
        { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bên A' }] }] }] }] },
      ] },
    })
    const exported = await exportDocx(state)
    const archive = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    expect(archive['word/document.xml']).toBeTruthy()
    expect(strFromU8(archive['word/document.xml'])).toContain('Nội dung tiếng Việt')
    expect(await inspectDocx(exported.blob)).toMatchObject({ report: { supported: true } })
    const imported = await importDocx(exported.blob, { mode: 'best-effort' })
    expect(JSON.stringify(imported.state.content)).toContain('Nội dung tiếng Việt')
    const [, importedParagraph] = imported.state.content.content
    const [importedText] = importedParagraph.content
    expect(importedText.marks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'bold' }),
      expect.objectContaining({ type: 'textStyle', attrs: expect.objectContaining({ fontFamily: 'Times New Roman', fontSize: '13pt', color: '#C00000' }) }),
    ]))
  })

  it('rejects fake HTML renamed as DOCX', async () => {
    await expect(inspectDocx(new Blob(['<html>not docx</html>']))).rejects.toMatchObject({ code: 'DOCX_INVALID' })
  })

  it('rejects suspicious ZIP compression ratios before conversion', async () => {
    const bomb = zipSync({
      '[Content_Types].xml': strToU8('<Types>wordprocessingml.document</Types>'),
      'word/document.xml': strToU8('<w:document><w:body/></w:document>'),
      'word/media/repeated.bin': new Uint8Array(2 * 1024 * 1024),
    })
    await expect(inspectDocx(new Blob([bomb]))).rejects.toMatchObject({ code: 'DOCX_INVALID' })
  })

  it('rejects media assets above the configured per-asset memory budget', async () => {
    const archive = zipSync({
      '[Content_Types].xml': strToU8('<Types>wordprocessingml.document</Types>'),
      'word/document.xml': strToU8('<w:document><w:body/></w:document>'),
      'word/media/large.png': Uint8Array.from({ length: 128 }, (_, index) => index),
    })
    await expect(inspectDocx(new Blob([archive]), {
      maxSingleMediaBytes: 64,
      maxCompressionRatio: 1_000,
    })).rejects.toMatchObject({ code: 'DOCX_INVALID' })
  })

  it('is strict by default for unsupported nodes', async () => {
    const state = createEmptyDocumentState({ content: { type: 'doc', content: [{ type: 'signatureBlock' }] } })
    await expect(exportDocx(state)).rejects.toMatchObject({ code: 'DOCX_UNSUPPORTED' })
    const result = await exportDocx(state, { mode: 'best-effort' })
    expect(result.report.issues[0].code).toBe('UNSUPPORTED_NODE')
  })

  it('round-trips images, page settings, manual page breaks and merged table cells', async () => {
    const state = createEmptyDocumentState({
      page: {
        size: { width: 21.5, height: 33.5 },
        orientation: 'portrait',
        margin: { top: 2, right: 1.8, bottom: 2.2, left: 2.4 },
      },
      content: { type: 'doc', content: [
        { type: 'paragraph', content: [
          { type: 'text', text: 'Logo ' },
          { type: 'inlineImage', attrs: { src: pixelPng, width: 32, height: 24, alt: 'Logo Kindy' } },
        ] },
        { type: 'pageBreak' },
        { type: 'table', content: [
          { type: 'tableRow', content: [
            { type: 'tableCell', attrs: { colspan: 1, rowspan: 2 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Gộp dọc' }] }] },
            { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B1' }] }] },
          ] },
          { type: 'tableRow', content: [
            { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B2' }] }] },
          ] },
        ] },
      ] },
    })

    const exported = await exportDocx(state)
    const imported = await importDocx(exported.blob, { mode: 'best-effort' })
    const topLevel = imported.state.content.content
    const image = topLevel[0].content.find((node) => node.type === 'inlineImage')
    expect(image.attrs.src).toMatch(/^data:image\/png;base64,/)
    expect(image.attrs).toMatchObject({ width: 32, height: 24 })
    expect(imported.state.assets).toEqual([
      expect.objectContaining({ kind: 'image', mimeType: 'image/png', size: expect.any(Number) }),
    ])
    expect(topLevel.some((node) => node.type === 'pageBreak')).toBe(true)
    expect(topLevel.flatMap((node) => node.content || []).some((node) => node.type === 'pageBreak')).toBe(false)
    expect(imported.state.page.size.width).toBeCloseTo(21.5, 1)
    expect(imported.state.page.size.height).toBeCloseTo(33.5, 1)
    const table = topLevel.find((node) => node.type === 'table')
    expect(table.content[0].content[0].attrs.rowspan).toBe(2)
    expect(table.content[1].content).toHaveLength(1)
  })

  it('round-trips edit-produced text highlighting and table cell formatting', async () => {
    const state = createEmptyDocumentState({
      content: { type: 'doc', content: [
        { type: 'paragraph', attrs: { textAlign: 'right', lineHeight: 1.5 }, content: [{
          type: 'text',
          text: 'Nội dung đã sửa',
          marks: [{ type: 'textStyle', attrs: { color: '#C00000', backgroundColor: '#FFF2CC', fontFamily: 'Times New Roman', fontSize: '13pt' } }],
        }] },
        { type: 'table', content: [{ type: 'tableRow', content: [
          { type: 'tableCell', attrs: { colspan: 1, rowspan: 1, verticalAlign: 'top', background: '#D9EAF7' }, content: [
            { type: 'paragraph', attrs: { textAlign: 'left' }, content: [{ type: 'text', text: 'Bên A' }] },
          ] },
          { type: 'tableCell', attrs: { colspan: 1, rowspan: 1, verticalAlign: 'bottom', background: '#FFF2CC' }, content: [
            { type: 'paragraph', attrs: { textAlign: 'right' }, content: [{ type: 'text', text: 'Bên B' }] },
          ] },
        ] }] },
      ] },
    })

    const exported = await exportDocx(state)
    const archive = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    const documentXml = strFromU8(archive['word/document.xml'])
    expect(documentXml).toContain('w:fill="FFF2CC"')
    expect(documentXml).toContain('w:fill="D9EAF7"')
    expect(documentXml).toContain('w:vAlign w:val="top"')
    expect(documentXml).toContain('w:vAlign w:val="bottom"')
    expect(documentXml).toContain('w:tblGrid')
    expect(documentXml).toContain('w:tcW')

    const imported = await importDocx(exported.blob, { mode: 'strict' })
    const [paragraph, table] = imported.state.content.content
    expect(paragraph.content[0].marks.find((mark) => mark.type === 'textStyle')?.attrs).toMatchObject({
      color: '#C00000',
      backgroundColor: '#FFF2CC',
      fontFamily: 'Times New Roman',
      fontSize: '13pt',
    })
    expect(table.content[0].content[0].attrs).toMatchObject({ verticalAlign: 'top', background: '#D9EAF7' })
    expect(table.content[0].content[1].attrs).toMatchObject({ verticalAlign: 'bottom', background: '#FFF2CC' })
    expect(table.content[0].content[1].content[0].attrs.textAlign).toBe('right')
  })

  it('round-trips nested lists, paragraph geometry and hyperlinks in the v2.0 profile', async () => {
    const state = createEmptyDocumentState({
      content: { type: 'doc', content: [
        { type: 'paragraph', attrs: { textAlign: 'right', lineHeight: 1.25, indent: 1.2 }, content: [
          { type: 'text', text: 'Cổng tài liệu', marks: [{ type: 'link', attrs: { href: 'https://example.com/documents' } }] },
        ] },
        { type: 'orderedList', attrs: { start: 1 }, content: [
          { type: 'listItem', content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Điều 1' }] },
            { type: 'orderedList', attrs: { start: 1 }, content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Khoản 1.1' }] }] },
            ] },
          ] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Điều 2' }] }] },
        ] },
      ] },
    })

    const exported = await exportDocx(state)
    const archive = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    const documentXml = strFromU8(archive['word/document.xml'])
    expect(documentXml).toContain('hyperlink')
    expect(documentXml).toContain('w:ilvl w:val="1"')

    const imported = await importDocx(exported.blob, { mode: 'best-effort' })
    const [paragraph, list] = imported.state.content.content
    expect(paragraph.attrs).toMatchObject({ textAlign: 'right', lineHeight: 1.25 })
    expect(paragraph.attrs.indent).toBeCloseTo(1.2, 1)
    expect(paragraph.content[0].marks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'link', attrs: { href: 'https://example.com/documents' } }),
    ]))
    expect(list.type).toBe('orderedList')
    expect(list.content[0].content[1]).toMatchObject({
      type: 'orderedList',
      content: [expect.objectContaining({ type: 'listItem' })],
    })
    expect(JSON.stringify(list)).toContain('Khoản 1.1')
  })

  it('round-trips ruler geometry and soft line breaks through WordprocessingML', async () => {
    const state = createEmptyDocumentState({
      content: { type: 'doc', content: [{
        type: 'paragraph',
        attrs: {
          docxLayout: {
            left: 1.27,
            right: 0.63,
            firstLine: 0.8,
            tabStops: [{ position: 3.17, alignment: 'center', leader: 'dot' }],
          },
        },
        content: [
          { type: 'text', text: 'Dòng thứ nhất' },
          { type: 'hardBreak' },
          { type: 'text', text: 'Dòng thứ hai' },
        ],
      }] },
    })

    const exported = await exportDocx(state)
    const archive = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    const documentXml = strFromU8(archive['word/document.xml'])
    expect(documentXml).toContain('<w:ind')
    expect(documentXml).toContain('<w:tabs>')
    expect(documentXml).toContain('<w:br')

    const imported = await importDocx(exported.blob, { mode: 'strict' })
    const [paragraph] = imported.state.content.content
    expect(paragraph.attrs.docxLayout.leftTwip).toBe(720)
    expect(paragraph.attrs.docxLayout.rightTwip).toBeCloseTo(357, 0)
    expect(paragraph.attrs.docxLayout.firstLineTwip).toBeCloseTo(453, 0)
    expect(paragraph.attrs.docxLayout.tabStops[0]).toMatchObject({
      alignment: 'center',
      leader: 'dot',
    })
    expect(paragraph.content.map((node) => node.type)).toEqual(['text', 'hardBreak', 'text'])
  })

  it('resolves inherited Word paragraph styles and preserves centered signature tab stops', async () => {
    const state = ooxmlToDocumentState({
      contentTypes: 'wordprocessingml.document',
      stylesXml: `
        <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults>
          <w:style w:type="paragraph" w:styleId="Noidungthuong">
            <w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/><w:sz w:val="22"/></w:rPr>
          </w:style>
          <w:style w:type="paragraph" w:styleId="Chuky">
            <w:basedOn w:val="Noidungthuong"/>
            <w:pPr><w:tabs><w:tab w:val="center" w:pos="1800"/><w:tab w:val="center" w:pos="7560"/></w:tabs></w:pPr>
            <w:rPr><w:b/></w:rPr>
          </w:style>
        </w:styles>`,
      documentXml: `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:pPr><w:pStyle w:val="Chuky"/></w:pPr>
              <w:r><w:tab/><w:t>ĐẠI DIỆN BÊN A</w:t></w:r>
              <w:r><w:tab/><w:t>ĐẠI DIỆN BÊN B</w:t></w:r>
            </w:p>
            <w:sectPr/>
          </w:body>
        </w:document>`,
      media: {},
    })

    const [signature] = state.content.content
    expect(signature.attrs.docxLayout.tabStops).toEqual([
      expect.objectContaining({ alignment: 'center', position: expect.closeTo(3.17, 2) }),
      expect.objectContaining({ alignment: 'center', position: expect.closeTo(13.33, 2) }),
    ])
    expect(signature.content.map((node) => node.type)).toEqual(['docxTab', 'text', 'docxTab', 'text'])
    expect(signature.content[0].attrs).toMatchObject({ alignment: 'center', index: 0 })
    expect(signature.content[2].attrs).toMatchObject({ alignment: 'center', index: 1 })
    expect(signature.content[1].marks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'bold' }),
      expect.objectContaining({ type: 'textStyle', attrs: expect.objectContaining({ fontFamily: 'Segoe UI', fontSize: '11pt' }) }),
    ]))

    const exported = await exportDocx(state)
    const archive = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    const xml = strFromU8(archive['word/document.xml'])
    expect(xml).toContain('<w:tabs>')
    expect(xml).toContain('w:val="center"')
    expect(xml.match(/<w:tab\/>/g)).toHaveLength(2)
  })

  it('imports legacy VML Word images instead of treating them as embedded objects', () => {
    const state = ooxmlToDocumentState({
      contentTypes: 'wordprocessingml.document',
      numberingXml: undefined,
      relationshipsXml: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId5" Target="media/legacy.png" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"/></Relationships>',
      documentXml: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml"><w:body><w:p><w:r><w:pict><v:shape style="width:24pt;height:18pt"><v:imagedata r:id="rId5" o:title="Legacy logo" xmlns:o="urn:schemas-microsoft-com:office:office"/></v:shape></w:pict></w:r></w:p><w:sectPr/></w:body></w:document>',
      media: { 'word/media/legacy.png': Uint8Array.from([137, 80, 78, 71]) },
    })
    const [paragraph] = state.content.content
    const [image] = paragraph.content
    expect(image.type).toBe('inlineImage')
    expect(image.attrs).toMatchObject({ width: 32, height: 24, alt: 'Legacy logo' })
    expect(state.assets[0]).toMatchObject({ fileName: 'legacy.png', mimeType: 'image/png' })
  })

  it('imports the renderable fallback image from mc:AlternateContent', () => {
    const state = ooxmlToDocumentState({
      contentTypes: 'wordprocessingml.document',
      numberingXml: undefined,
      relationshipsXml: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdVector" Target="media/logo.emf" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"/><Relationship Id="rIdFallback" Target="media/logo.png" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"/></Relationships>',
      documentXml: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:v="urn:schemas-microsoft-com:vml"><w:body><w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:inline><wp:extent cx="304800" cy="228600"/><wp:docPr id="1" name="Logo chính" descr="Logo hợp đồng"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdVector"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></mc:Choice><mc:Fallback><w:pict><v:shape style="width:24pt;height:18pt"><v:imagedata r:id="rIdFallback"/></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r></w:p><w:sectPr/></w:body></w:document>',
      media: {
        'word/media/logo.emf': Uint8Array.from([1, 0, 0, 0]),
        'word/media/logo.png': Uint8Array.from([137, 80, 78, 71]),
      },
    })
    const [image] = state.content.content[0].content
    expect(image.type).toBe('inlineImage')
    expect(image.attrs).toMatchObject({ width: 32, height: 24, alt: 'Logo hợp đồng', name: 'logo.png' })
    expect(image.attrs.src).toMatch(/^data:image\/png;base64,/)
    expect(state.assets).toEqual([
      expect.objectContaining({ fileName: 'logo.png', mimeType: 'image/png' }),
    ])
  })

  it('rejects image formats the DOCX serializer cannot safely write in strict mode', async () => {
    const state = createEmptyDocumentState({
      content: { type: 'doc', content: [{
        type: 'paragraph',
        content: [{ type: 'inlineImage', attrs: { src: 'data:image/webp;base64,UklGRg==', width: 20, height: 20 } }],
      }] },
    })
    await expect(exportDocx(state)).rejects.toMatchObject({ code: 'DOCX_UNSUPPORTED' })
    const result = await exportDocx(state, { mode: 'best-effort' })
    expect(result.report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'IMAGE_FORMAT_UNVERIFIED' }),
    ]))
  })

  it('normalizes landscape OOXML dimensions to canonical portrait size plus orientation', () => {
    const state = ooxmlToDocumentState({
      contentTypes: 'wordprocessingml.document',
      documentXml: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p/><w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/></w:sectPr></w:body></w:document>',
      media: {},
    })
    expect(state.page.orientation).toBe('landscape')
    expect(state.page.size.width).toBeCloseTo(21, 1)
    expect(state.page.size.height).toBeCloseTo(29.7, 1)
  })

  it('round-trips v2.1 sections, header variants, header images and page-number start', async () => {
    const headerContent = (text, withImage = false) => ({ type: 'doc', content: [{
      type: 'paragraph',
      content: [
        ...(withImage ? [{ type: 'inlineImage', attrs: { src: pixelPng, width: 16, height: 16, alt: 'Header logo' } }] : []),
        { type: 'text', text },
      ],
    }] })
    const first = {
      id: 'section-cover',
      size: { width: 21, height: 29.7 },
      orientation: 'portrait',
      margin: { top: 2, right: 2, bottom: 2, left: 2 },
      header: {
        enabled: true,
        content: headerContent('Header mặc định', true),
        firstContent: headerContent('Header trang đầu'),
        evenContent: headerContent('Header trang chẵn'),
        differentFirstPage: true,
        differentOddEven: true,
      },
      footer: { enabled: true, text: 'Trang ' },
    }
    const second = {
      id: 'section-landscape',
      size: { width: 21, height: 29.7 },
      orientation: 'landscape',
      margin: { top: 1.5, right: 1.2, bottom: 1.5, left: 1.2 },
      pageNumberStart: 5,
      header: { enabled: true, content: headerContent('Header ngang') },
      footer: { enabled: false, text: '' },
    }
    const state = createEmptyDocumentState({
      page: { ...first, sections: [first, second] },
      content: { type: 'doc', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Trang bìa' }] },
        { type: 'sectionBreak', attrs: { id: 'break-1', type: 'nextPage', page: second } },
        { type: 'paragraph', content: [{ type: 'text', text: 'Phụ lục ngang' }] },
      ] },
    })

    const exported = await exportDocx(state, { profile: 'kindy-docx-v2.1' })
    expect(exported.report).toMatchObject({ profile: 'kindy-docx-v2.1', issues: [] })
    const archive = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    expect(Object.keys(archive).filter((name) => /^word\/header\d+\.xml$/.test(name)).length).toBeGreaterThanOrEqual(2)
    expect(strFromU8(archive['word/document.xml']).match(/<w:sectPr\b/g)).toHaveLength(2)

    const imported = await importDocx(exported.blob, { profile: 'kindy-docx-v2.1', mode: 'strict' })
    expect(imported.report.issues).toEqual([])
    expect(imported.report.issues.map((issue) => issue.code)).not.toEqual(expect.arrayContaining(['MULTIPLE_SECTIONS', 'HEADER_FOOTER_PROFILE']))
    expect(imported.state.page.sections).toHaveLength(2)
    expect(imported.state.page.sections[0]).toMatchObject({ orientation: 'portrait' })
    expect(imported.state.page.sections[0].header.text).toContain('Header mặc định')
    expect(imported.state.page.sections[0].header.firstText).toContain('Header trang đầu')
    expect(imported.state.page.sections[0].header.evenText).toContain('Header trang chẵn')
    expect(JSON.stringify(imported.state.page.sections[0].header.content)).toContain('data:image/png;base64,')
    expect(imported.state.page.sections[1]).toMatchObject({ orientation: 'landscape', pageNumberStart: 5 })
    expect(imported.state.content.content.some((node) => node.type === 'sectionBreak')).toBe(true)
  })

  it('round-trips v2.2 inserted and deleted text revisions', async () => {
    const state = createEmptyDocumentState({
      content: { type: 'doc', content: [{ type: 'paragraph', content: [
        { type: 'text', text: 'Giữ nguyên. ' },
        { type: 'text', text: 'Nội dung thêm', marks: [{ type: 'trackChange', attrs: { id: 'change-insert', type: 'insert', author: 'Nguyễn A', timestamp: 1_700_000_000_000 } }] },
        { type: 'text', text: 'Nội dung xóa', marks: [{ type: 'trackChange', attrs: { id: 'change-delete', type: 'delete', author: 'Trần B', timestamp: 1_700_000_100_000 } }] },
      ] }] },
    })

    const exported = await exportDocx(state, { profile: 'kindy-docx-v2.2' })
    const archive = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    const documentXml = strFromU8(archive['word/document.xml'])
    expect(documentXml).toContain('<w:ins')
    expect(documentXml).toContain('<w:del')
    expect(documentXml).toContain('w:author="Nguyễn A"')

    const imported = await importDocx(exported.blob, { profile: 'kindy-docx-v2.2', mode: 'strict' })
    const texts = imported.state.content.content[0].content
    expect(texts.find((node) => node.text === 'Nội dung thêm').marks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'trackChange', attrs: expect.objectContaining({ type: 'insert', author: 'Nguyễn A' }) }),
    ]))
    expect(texts.find((node) => node.text === 'Nội dung xóa').marks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'trackChange', attrs: expect.objectContaining({ type: 'delete', author: 'Trần B' }) }),
    ]))
  })

  it('round-trips v2.2 comment ranges and thread metadata', async () => {
    const thread = {
      id: 'comment-contract-clause', user: 'Lê Pháp chế', userId: 'legal-1',
      color: 'rgba(255, 213, 79, 0.4)', text: 'Kiểm tra lại thời hạn thanh toán.',
      replies: [{ id: 'reply-legal-1', user: 'Nguyễn Kinh doanh', userId: 'sales-1', text: 'Đã cập nhật theo phụ lục.', createdAt: 1_700_000_100_000 }],
      resolved: true, createdAt: 1_700_000_000_000, resolvedAt: 1_700_000_200_000,
    }
    const state = createEmptyDocumentState({
      content: { type: 'doc', content: [{ type: 'paragraph', content: [
        { type: 'text', text: 'Thanh toán trong 30 ngày', marks: [{ type: 'comment', attrs: { id: thread.id, user: thread.user, color: thread.color, thread: JSON.stringify(thread) } }] },
        { type: 'text', text: ' kể từ ngày nhận hóa đơn.' },
      ] }] },
    })

    const exported = await exportDocx(state, { profile: 'kindy-docx-v2.2' })
    const archive = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    expect(strFromU8(archive['word/document.xml'])).toContain('commentRangeStart')
    expect(strFromU8(archive['word/comments.xml'])).toContain('Kiểm tra lại thời hạn thanh toán.')
    expect(strFromU8(archive['word/commentsExtended.xml'])).toContain('paraIdParent')

    const imported = await importDocx(exported.blob, { profile: 'kindy-docx-v2.2', mode: 'strict' })
    const [commented] = imported.state.content.content[0].content
    const comment = commented.marks.find((mark) => mark.type === 'comment')
    expect(comment.attrs).toMatchObject({ user: 'Lê Pháp chế' })
    expect(JSON.parse(comment.attrs.thread)).toMatchObject({
      user: 'Lê Pháp chế', text: 'Kiểm tra lại thời hạn thanh toán.', resolved: true,
      replies: [expect.objectContaining({ user: 'Nguyễn Kinh doanh', text: 'Đã cập nhật theo phụ lục.' })],
    })
  })

  it('preserves unrecognized and raw OOXML package parts losslessly across round-trip', async () => {
    const baseState = createEmptyDocumentState({
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tài liệu chứa chart và macro.' }] }] },
    })
    const initialExport = await exportDocx(baseState)
    const entries = unzipSync(new Uint8Array(await initialExport.blob.arrayBuffer()))

    // Simulate an incoming complex document containing a chart XML and a custom docProp
    entries['word/charts/chart1.xml'] = strToU8('<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart/></c:chartSpace>')
    entries['docProps/custom.xml'] = strToU8('<op:Properties xmlns:op="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties"/>')

    const complexBlob = new Blob([zipSync(entries)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const imported = await importDocx(complexBlob)

    expect(imported.state.unsupportedParts).toBeDefined()
    expect(imported.state.unsupportedParts['word/charts/chart1.xml']).toBeDefined()
    expect(imported.state.unsupportedParts['docProps/custom.xml']).toBeDefined()

    // Export again after user edits
    const reExported = await exportDocx(imported.state)
    const reArchive = unzipSync(new Uint8Array(await reExported.blob.arrayBuffer()))

    expect(reArchive['word/charts/chart1.xml']).toBeDefined()
    expect(strFromU8(reArchive['word/charts/chart1.xml'])).toContain('<c:chartSpace')
    expect(reArchive['docProps/custom.xml']).toBeDefined()
    expect(strFromU8(reArchive['docProps/custom.xml'])).toContain('<op:Properties')
  })
})
