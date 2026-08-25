import { describe, expect, it } from 'vitest'
import { OoxmlParser } from '../ooxml-parser'
import { OoxmlSerializer } from '../ooxml-serializer'
import { RevisionStore, CommentStore } from '../revision-store'
import {
  insertTextTracked,
  deleteTextTracked,
  formatTextTracked,
  applyTransaction,
} from '../ooxml-transaction'
import { buildOoxmlCharIndex } from '../ooxml-char-index'
import type {
  OoxmlPackage,
  Paragraph,
  Run,
  TrackedRun,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference,
  DeletedText,
} from '../ooxml-types'
import * as fflate from 'fflate'

// ─── Test DOCX with Track Changes ────────────────────────────────────────────

function createDocxWithTrackChanges(): Uint8Array {
  const encoder = new TextEncoder()
  const files: Record<string, Uint8Array> = {}

  files['[Content_Types].xml'] = encoder.encode([
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
    '  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>',
    '</Types>',
  ].join('\n'))

  files['_rels/.rels'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>',
  ].join('\n'))

  files['word/_rels/document.xml.rels'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    '  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    '  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>',
    '  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>',
    '  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>',
    '</Relationships>',
  ].join('\n'))

  files['word/styles.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:docDefaults>',
    '    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr></w:rPrDefault>',
    '    <w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240"/></w:pPr></w:pPrDefault>',
    '  </w:docDefaults>',
    '  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>',
    '</w:styles>',
  ].join('\n'))

  // Document with track changes: w:ins, w:del, comment ranges, rPrChange
  files['word/document.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    // Paragraph with w:ins (inserted text)
    '  <w:p>',
    '    <w:r><w:t>Before </w:t></w:r>',
    '    <w:ins w:id="1" w:author="Alice" w:date="2024-01-01T00:00:00Z">',
    '      <w:r><w:t>inserted</w:t></w:r>',
    '    </w:ins>',
    '    <w:r><w:t> After</w:t></w:r>',
    '  </w:p>',
    // Paragraph with w:del (deleted text)
    '  <w:p>',
    '    <w:r><w:t>Keep </w:t></w:r>',
    '    <w:del w:id="2" w:author="Bob" w:date="2024-01-02T00:00:00Z">',
    '      <w:r><w:delText>removed</w:delText></w:r>',
    '    </w:del>',
    '    <w:r><w:t> this</w:t></w:r>',
    '  </w:p>',
    // Paragraph with comment ranges
    '  <w:p>',
    '    <w:commentRangeStart w:id="10"/>',
    '    <w:r><w:t>commented text</w:t></w:r>',
    '    <w:commentRangeEnd w:id="10"/>',
    '    <w:r><w:commentReference w:id="10"/></w:r>',
    '  </w:p>',
    // Paragraph with rPrChange
    '  <w:p>',
    '    <w:r>',
    '      <w:rPr>',
    '        <w:b/>',
    '        <w:rPrChange w:id="3" w:author="Charlie" w:date="2024-01-03T00:00:00Z">',
    '          <w:rPr><w:i/></w:rPr>',
    '        </w:rPrChange>',
    '      </w:rPr>',
    '      <w:t>format change</w:t>',
    '    </w:r>',
    '  </w:p>',
    '</w:body>',
    '</w:document>',
  ].join('\n'))

  files['word/numbering.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
  ].join('\n'))

  files['word/settings.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:trackRevisions/>',
    '</w:settings>',
  ].join('\n'))

  files['word/fontTable.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
  ].join('\n'))

  files['word/theme/theme1.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
    '  <a:themeElements>',
    '    <a:clrScheme name="Office">',
    '      <a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>',
    '      <a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>',
    '      <a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>',
    '      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>',
    '      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>',
    '      <a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>',
    '    </a:clrScheme>',
    '    <a:fontScheme name="Office">',
    '      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>',
    '      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>',
    '    </a:fontScheme>',
    '    <a:fmtScheme name="Office"/>',
    '  </a:themeElements>',
    '</a:theme>',
  ].join('\n'))

  files['word/comments.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:comment w:id="10" w:author="Alice" w:date="2024-01-01T00:00:00Z">',
    '    <w:p><w:r><w:t>This is a comment.</w:t></w:r></w:p>',
    '  </w:comment>',
    '</w:comments>',
  ].join('\n'))

  return fflate.zipSync(Object.fromEntries(
    Object.entries(files).map(([k, v]) => [k, v])
  ))
}

function makePkg(): OoxmlPackage {
  return {
    document: {
      body: {
        children: [{
          type: 'paragraph',
          content: [{ type: 'run', content: [{ type: 'text', text: 'Hello World' }] }],
        }],
        sectPr: undefined,
      },
    },
    styles: {
      docDefaults: { rPrDefault: {}, pPrDefault: {} },
      styles: new Map(),
    },
    numbering: { abstractNums: new Map(), nums: new Map() },
    settings: {},
    fontTable: { fonts: new Map() },
    theme: null,
    headers: new Map(),
    footers: new Map(),
    comments: null,
    footnotes: null,
    endnotes: null,
    contentTypes: { defaults: new Map(), overrides: new Map() },
    relationships: [],
    media: new Map(),
  }
}

// ─── Tests: Track Changes Parsing ────────────────────────────────────────────

describe('Phase 4 — Track Changes Parsing', () => {
  it('parses w:ins elements', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const para = pkg.document.body.children[0] as Paragraph
    const ins = para.content.find((c) => c.type === 'ins') as TrackedRun | undefined
    expect(ins).toBeDefined()
    expect(ins!.type).toBe('ins')
    expect(ins!.id).toBe(1)
    expect(ins!.author).toBe('Alice')
    expect(ins!.date).toBe('2024-01-01T00:00:00Z')
    expect(ins!.content).toHaveLength(1)
    expect(ins!.content[0].type).toBe('run')
  })

  it('parses w:del elements', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const para = pkg.document.body.children[1] as Paragraph
    const del = para.content.find((c) => c.type === 'del') as TrackedRun | undefined
    expect(del).toBeDefined()
    expect(del!.type).toBe('del')
    expect(del!.id).toBe(2)
    expect(del!.author).toBe('Bob')
    expect(del!.content).toHaveLength(1)
    // The deleted text should use delText type
    const delRun = del!.content[0]
    expect(delRun.content[0].type).toBe('delText')
  })

  it('parses commentRangeStart/End', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const para = pkg.document.body.children[2] as Paragraph
    const rangeStart = para.content.find((c) => c.type === 'commentRangeStart') as CommentRangeStart | undefined
    const rangeEnd = para.content.find((c) => c.type === 'commentRangeEnd') as CommentRangeEnd | undefined
    expect(rangeStart).toBeDefined()
    expect(rangeStart!.id).toBe(10)
    expect(rangeEnd).toBeDefined()
    expect(rangeEnd!.id).toBe(10)
  })

  it('parses commentReference in run', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const para = pkg.document.body.children[2] as Paragraph
    // commentReference is in its own <w:r> element
    const runs = para.content.filter((c) => c.type === 'run') as Run[]
    const refRun = runs.find((r) => r.content.some((c) => c.type === 'commentReference'))
    expect(refRun).toBeDefined()
    const ref = refRun!.content.find((c) => c.type === 'commentReference') as CommentReference
    expect(ref.id).toBe(10)
  })

  it('parses rPrChange', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const para = pkg.document.body.children[3] as Paragraph
    const run = para.content[0] as Run
    expect(run.rPr?.rPrChange).toBeDefined()
    expect(run.rPr!.rPrChange!.id).toBe(3)
    expect(run.rPr!.rPrChange!.author).toBe('Charlie')
  })

  it('parses delText as DeletedText type', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const para = pkg.document.body.children[1] as Paragraph
    const del = para.content.find((c) => c.type === 'del') as TrackedRun
    const delText = del.content[0].content[0] as DeletedText
    expect(delText.type).toBe('delText')
    expect(delText.text).toBe('removed')
  })

  it('parses trackRevisions setting', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)
    expect(pkg.settings.trackRevisions).toBe(true)
  })
})

// ─── Tests: Track Changes Serialization ──────────────────────────────────────

describe('Phase 4 — Track Changes Serialization', () => {
  it('serializes w:ins elements', () => {
    const pkg = makePkg()
    pkg.document.body.children = [{
      type: 'paragraph',
      content: [
        { type: 'run', content: [{ type: 'text', text: 'Before ' }] },
        {
          type: 'ins',
          id: 1,
          author: 'Alice',
          date: '2024-01-01T00:00:00Z',
          content: [{ type: 'run', content: [{ type: 'text', text: 'added' }] }],
        } as any,
        { type: 'run', content: [{ type: 'text', text: ' After' }] },
      ],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('serializes w:del elements', () => {
    const pkg = makePkg()
    pkg.document.body.children = [{
      type: 'paragraph',
      content: [
        {
          type: 'del',
          id: 2,
          author: 'Bob',
          date: '2024-01-02T00:00:00Z',
          content: [{ type: 'run', content: [{ type: 'delText', text: 'removed' }] }],
        } as any,
      ],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('serializes comment ranges', () => {
    const pkg = makePkg()
    pkg.document.body.children = [{
      type: 'paragraph',
      content: [
        { type: 'commentRangeStart', id: 10 } as any,
        { type: 'run', content: [{ type: 'text', text: 'text' }] },
        { type: 'commentRangeEnd', id: 10 } as any,
      ],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('serializes delText', () => {
    const pkg = makePkg()
    pkg.document.body.children = [{
      type: 'paragraph',
      content: [{
        type: 'run',
        content: [{ type: 'delText', text: 'deleted' }],
      }],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('round-trips track changes through parse → serialize → parse', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg1 = await parser.parse(docx)

    const serializer = new OoxmlSerializer(pkg1)
    const blob = serializer.serialize()

    const arrayBuffer = await blob.arrayBuffer()
    const pkg2 = await parser.parse(new Uint8Array(arrayBuffer))

    // Verify ins survived round-trip
    const para1 = pkg2.document.body.children[0] as Paragraph
    const ins = para1.content.find((c) => c.type === 'ins') as TrackedRun
    expect(ins).toBeDefined()
    expect(ins.author).toBe('Alice')

    // Verify del survived round-trip
    const para2 = pkg2.document.body.children[1] as Paragraph
    const del = para2.content.find((c) => c.type === 'del') as TrackedRun
    expect(del).toBeDefined()
    expect(del.author).toBe('Bob')
  })
})

// ─── Tests: RevisionStore ────────────────────────────────────────────────────

describe('Phase 4 — RevisionStore', () => {
  it('scans document for existing revisions', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new RevisionStore(pkg)
    const revisions = store.getRevisions()
    expect(revisions.length).toBe(2) // ins id=1, del id=2
  })

  it('accepts an insert revision', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new RevisionStore(pkg)
    const result = store.acceptRevision(1) // accept ins id=1
    expect(result).toBe(true)

    // The ins should be replaced with its contained runs
    const para = pkg.document.body.children[0] as Paragraph
    const ins = para.content.find((c) => c.type === 'ins')
    expect(ins).toBeUndefined()
    // The text "inserted" should now be a regular run
    const text = para.content.map((c) => {
      if (c.type === 'run') return (c as Run).content.map((n) => n.type === 'text' ? (n as any).text : '').join('')
      return ''
    }).join('')
    expect(text).toContain('inserted')
  })

  it('accepts a delete revision', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new RevisionStore(pkg)
    const result = store.acceptRevision(2) // accept del id=2
    expect(result).toBe(true)

    // The del should be removed entirely
    const para = pkg.document.body.children[1] as Paragraph
    const del = para.content.find((c) => c.type === 'del')
    expect(del).toBeUndefined()
  })

  it('rejects an insert revision', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new RevisionStore(pkg)
    const result = store.rejectRevision(1) // reject ins id=1
    expect(result).toBe(true)

    // The ins should be removed entirely
    const para = pkg.document.body.children[0] as Paragraph
    const ins = para.content.find((c) => c.type === 'ins')
    expect(ins).toBeUndefined()
  })

  it('rejects a delete revision', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new RevisionStore(pkg)
    const result = store.rejectRevision(2) // reject del id=2
    expect(result).toBe(true)

    // The del should be replaced with its contained runs (restored)
    const para = pkg.document.body.children[1] as Paragraph
    const del = para.content.find((c) => c.type === 'del')
    expect(del).toBeUndefined()
  })

  it('accepts all revisions', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new RevisionStore(pkg)
    const count = store.acceptAll()
    expect(count).toBe(2)
    expect(store.getRevisions()).toHaveLength(0)
  })

  it('rejects all revisions', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new RevisionStore(pkg)
    const count = store.rejectAll()
    expect(count).toBe(2)
    expect(store.getRevisions()).toHaveLength(0)
  })

  it('registers new revision with correct next ID', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new RevisionStore(pkg)
    expect(store.nextId()).toBeGreaterThanOrEqual(3) // existing IDs are 1, 2
  })
})

// ─── Tests: CommentStore ─────────────────────────────────────────────────────

describe('Phase 4 — CommentStore', () => {
  it('scans existing comments', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new CommentStore(pkg)
    const threads = store.getThreads()
    expect(threads.length).toBe(1)
    expect(threads[0].id).toBe(10)
    expect(threads[0].author).toBe('Alice')
    expect(threads[0].text).toContain('This is a comment')
  })

  it('adds a new comment', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new CommentStore(pkg)
    const thread = store.addComment('New comment')
    expect(thread.id).toBeGreaterThan(10)
    expect(thread.text).toBe('New comment')
    expect(store.getThreads().length).toBe(2)
  })

  it('replies to a comment', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new CommentStore(pkg)
    const reply = store.reply(10, 'Reply text')
    expect(reply).not.toBeNull()
    expect(reply!.text).toBe('Reply text')

    const thread = store.getThread(10)
    expect(thread!.replies.length).toBe(1)
  })

  it('marks comment as done', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new CommentStore(pkg)
    const result = store.markDone(10, true)
    expect(result).toBe(true)
    expect(store.getThread(10)!.done).toBe(true)
  })

  it('deletes a comment', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const store = new CommentStore(pkg)
    const result = store.delete(10)
    expect(result).toBe(true)
    expect(store.getThreads()).toHaveLength(0)
  })
})

// ─── Tests: Revision-Aware Transactions ──────────────────────────────────────

describe('Phase 4 — Revision-Aware Transactions', () => {
  it('insertTextTracked without tracking creates normal insert', () => {
    const pkg = makePkg()
    const result = insertTextTracked(pkg, 5, ' World', {
      trackRevisions: false,
      author: 'Test',
      date: '',
      nextRevId: 1,
    })
    expect(result.ops).toHaveLength(1)
    expect(result.ops[0].type).toBe('insertText')
  })

  it('insertTextTracked with tracking creates w:ins', () => {
    const pkg = makePkg()
    const result = insertTextTracked(pkg, 5, ' World', {
      trackRevisions: true,
      author: 'Test',
      date: '2024-01-01',
      nextRevId: 1,
    })
    expect(result.ops).toHaveLength(1)
    const para = pkg.document.body.children[0] as Paragraph
    const ins = para.content.find((c) => c.type === 'ins') as TrackedRun
    expect(ins).toBeDefined()
    expect(ins.author).toBe('Test')
  })

  it('deleteTextTracked without tracking creates normal delete', () => {
    const pkg = makePkg()
    const result = deleteTextTracked(pkg, 0, 5, {
      trackRevisions: false,
      author: 'Test',
      date: '',
      nextRevId: 1,
    })
    expect(result.ops).toHaveLength(1)
    expect(result.ops[0].type).toBe('deleteText')
  })

  it('deleteTextTracked with tracking creates w:del', () => {
    const pkg = makePkg()
    const result = deleteTextTracked(pkg, 0, 5, {
      trackRevisions: true,
      author: 'Test',
      date: '2024-01-01',
      nextRevId: 2,
    })
    expect(result.ops).toHaveLength(1)
    const para = pkg.document.body.children[0] as Paragraph
    const del = para.content.find((c) => c.type === 'del') as TrackedRun
    expect(del).toBeDefined()
    expect(del.author).toBe('Test')
  })
})

// ─── Tests: Char Index with Tracked Changes ──────────────────────────────────

describe('Phase 4 — Char Index', () => {
  it('indexes text inside w:ins', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const index = buildOoxmlCharIndex(pkg)
    // "Before inserted After" — the ins text should be indexed
    const allText = index.map((c) => c.char).join('')
    expect(allText).toContain('inserted')
  })

  it('indexes text inside w:del runs', async () => {
    const docx = createDocxWithTrackChanges()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const index = buildOoxmlCharIndex(pkg)
    // The del contains "removed" as delText — it should be indexed
    const allText = index.map((c) => c.char).join('')
    expect(allText).toContain('removed')
  })

  it('skips comment range markers (no text chars)', async () => {
    const pkg = makePkg()
    pkg.document.body.children = [{
      type: 'paragraph',
      content: [
        { type: 'commentRangeStart', id: 1 } as any,
        { type: 'run', content: [{ type: 'text', text: 'AB' }] },
        { type: 'commentRangeEnd', id: 1 } as any,
      ],
    }]
    const index = buildOoxmlCharIndex(pkg)
    expect(index.map((c) => c.char).join('')).toBe('AB')
  })
})
