/**
 * Deterministic long-document fixture used by the demo and performance tests.
 * It intentionally uses semantic ProseMirror nodes instead of one huge text
 * node, because that better represents imported contracts.
 */
export function createLongDocumentFixture(options = {}) {
  const pages = Math.max(1, Math.floor(options.pages || 100))
  const paragraphsPerPage = Math.max(1, Math.floor(options.paragraphsPerPage || 8))
  const variant = ['text', 'table', 'image', 'review', 'mixed', 'section'].includes(options.variant)
    ? options.variant
    : 'text'
  const content = []
  const pixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

  const table = (page) => ({
    type: 'table',
    content: Array.from({ length: 4 }, (_, row) => ({
      type: 'tableRow',
      content: Array.from({ length: 4 }, (_, column) => ({
        type: row === 0 ? 'tableHeader' : 'tableCell',
        attrs: { colspan: 1, rowspan: 1 },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: row === 0 ? `Cột ${column + 1}` : `Dữ liệu ${page}.${row}.${column + 1}` }] }],
      })),
    })),
  })

  const imageParagraph = (page) => ({
    type: 'paragraph',
    content: [
      { type: 'text', text: `Logo/con dấu trang ${page}: ` },
      { type: 'inlineImage', attrs: { id: `fixture-image-${page}`, src: pixelPng, width: 96, height: 48, alt: `Ảnh ${page}`, inline: true, uploaded: true } },
    ],
  })

  for (let page = 1; page <= pages; page += 1) {
    content.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: `Điều ${page}. Nội dung kiểm thử trang ${page}` }],
    })
    for (let paragraph = 1; paragraph <= paragraphsPerPage; paragraph += 1) {
      const textNode = {
        type: 'text',
        text: `Khoản ${page}.${paragraph}. Đây là dữ liệu kiểm thử hiệu năng Kindy Editor với văn bản Unicode tiếng Việt, định dạng hợp đồng và nhiều block độc lập. Nội dung được lặp có kiểm soát để đo mount, typing, pagination và autosave trên cùng một corpus.`,
      }
      if (variant === 'review' || (variant === 'mixed' && paragraph % 3 === 0)) {
        const thread = {
          id: `fixture-comment-${page}-${paragraph}`, user: 'Reviewer', userId: 'reviewer',
          color: 'rgba(255, 213, 79, 0.4)', text: 'Kiểm tra nội dung', replies: [],
          resolved: false, createdAt: 1_700_000_000_000 + page, resolvedAt: null,
        }
        textNode.marks = paragraph % 2 === 0
          ? [{ type: 'comment', attrs: { id: thread.id, user: thread.user, color: thread.color, thread: JSON.stringify(thread) } }]
          : [{ type: 'trackChange', attrs: { id: `fixture-change-${page}-${paragraph}`, type: 'insert', author: 'Reviewer', timestamp: thread.createdAt } }]
      }
      content.push({
        type: 'paragraph',
        attrs: { textAlign: 'justify', lineHeight: 1.5 },
        content: [textNode],
      })
    }
    if (variant === 'table' || (variant === 'mixed' && page % 2 === 0)) content.push(table(page))
    if (variant === 'image' || (variant === 'mixed' && page % 2 !== 0)) content.push(imageParagraph(page))
    if (page < pages) {
      const startsLandscapeSection = variant === 'section' && page === Math.floor(pages / 2)
      content.push(startsLandscapeSection
        ? {
            type: 'sectionBreak',
            attrs: {
              id: 'fixture-section-break',
              type: 'nextPage',
              page: {
                id: 'fixture-landscape',
                size: { width: 21, height: 29.7 },
                orientation: 'landscape',
                margin: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
                pageNumberStart: 5,
                header: { enabled: true, text: 'Phụ lục ngang' },
                footer: { enabled: true, text: 'Trang ' },
              },
            },
          }
        : { type: 'pageBreak' })
    }
  }

  return {
    schemaVersion: '2.0',
    content: { type: 'doc', content },
    page: {
      size: { width: 21, height: 29.7 },
      orientation: 'portrait',
      margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      background: '#ffffff',
      header: { enabled: false, text: '' },
      footer: { enabled: false, text: '' },
      sections: variant === 'section' ? [
        {
          id: 'fixture-portrait',
          size: { width: 21, height: 29.7 },
          orientation: 'portrait',
          margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
          pageNumberStart: 1,
          header: { enabled: true, text: 'Hợp đồng' },
          footer: { enabled: true, text: 'Trang ' },
        },
        {
          id: 'fixture-landscape',
          size: { width: 21, height: 29.7 },
          orientation: 'landscape',
          margin: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
          pageNumberStart: 5,
          header: { enabled: true, text: 'Phụ lục ngang' },
          footer: { enabled: true, text: 'Trang ' },
        },
      ] : [],
    },
    assets: variant === 'image' || variant === 'mixed'
      ? [{ id: 'fixture-pixel', kind: 'image', mimeType: 'image/png', fileName: 'fixture.png', size: 68 }]
      : [],
  }
}

export function countFixtureNodes(value) {
  let nodes = 0
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    nodes += 1
    if (Array.isArray(node.content)) node.content.forEach(visit)
  }
  visit(value?.content)
  return nodes
}
