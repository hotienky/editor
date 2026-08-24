/**
 * Document Model Schema Definition
 *
 * Framework-agnostic schema that describes the document structure.
 * This is the single source of truth for all node types, mark types,
 * and their relationships. ProseMirror schema is generated from this.
 *
 * Architecture: Layer 1 — Document Model
 */

// ─── Node Type Categories ────────────────────────────────────────────────────

export const NodeGroup = {
  BLOCK: 'block',
  INLINE: 'inline',
  LIST: 'list',
  TABLE: 'table',
  TOP: '',
}

// ─── Node Type Definitions ───────────────────────────────────────────────────

/**
 * Each node type defines:
 * - name: unique identifier
 * - group: block | inline | list | table | '' (top-level)
 * - content: content spec (e.g., 'inline*', 'block+', 'listItem+')
 * - attributes: { name: { default, type } }
 * - atom: boolean (leaf node, no editable content)
 * - inline: boolean
 * - defining: boolean (input rules work inside)
 * - isolating: boolean (content separated from outside)
 * - draggable: boolean
 * - code: boolean (code block behavior)
 * - whitespace: 'pre' | 'normal'
 * - marks: string (allowed marks, e.g., '_')
 * - parseHTML: array of parse rules
 * - renderHTML: render function
 */
export const NodeTypes = {
  // ─── Document Root ───────────────────────────────────────────────────────
  doc: {
    name: 'doc',
    group: NodeGroup.TOP,
    content: 'heading? block+ footnotes?',
    topNode: true,
  },

  // ─── Text Content Blocks ─────────────────────────────────────────────────
  paragraph: {
    name: 'paragraph',
    group: NodeGroup.BLOCK,
    content: 'inline*',
    attributes: {
      textAlign: { default: undefined },
      lineHeight: { default: '1.75' },
      indent: { default: null },
      indentUnit: { default: null },
      margin: { default: null },
      wordWrap: { default: 'normal' },
      docxLayout: { default: null },
    },
  },

  heading: {
    name: 'heading',
    group: NodeGroup.BLOCK,
    content: 'inline*',
    attributes: {
      level: { default: 1, type: 'number' },
      textAlign: { default: undefined },
      lineHeight: { default: '1.75' },
      indent: { default: null },
      indentUnit: { default: null },
      margin: { default: null },
      wordWrap: { default: 'normal' },
      docxLayout: { default: null },
    },
  },

  docxTab: {
    name: 'docxTab',
    group: NodeGroup.INLINE,
    inline: true,
    atom: true,
    attributes: {
      alignment: { default: 'left' },
      position: { default: 1.27, type: 'number' },
      positionTwip: { default: null, type: 'number' },
      leader: { default: 'none' },
      index: { default: 0, type: 'number' },
    },
  },

  blockquote: {
    name: 'blockquote',
    group: NodeGroup.BLOCK,
    content: 'block+',
  },

  codeBlock: {
    name: 'codeBlock',
    group: NodeGroup.BLOCK,
    content: 'text*',
    code: true,
    whitespace: 'pre',
    attributes: {
      language: { default: 'plaintext' },
      theme: { default: 'light' },
      textWrap: { default: true },
    },
  },

  // ─── List Nodes ──────────────────────────────────────────────────────────
  bulletList: {
    name: 'bulletList',
    group: `${NodeGroup.BLOCK} ${NodeGroup.LIST}`,
    content: 'listItem+',
    attributes: {
      listType: { default: 'disc' },
    },
  },

  orderedList: {
    name: 'orderedList',
    group: `${NodeGroup.BLOCK} ${NodeGroup.LIST}`,
    content: 'listItem+',
    attributes: {
      start: { default: 1, type: 'number' },
      listType: { default: 'decimal' },
      type: { default: null },
    },
  },

  taskList: {
    name: 'taskList',
    group: `${NodeGroup.BLOCK} ${NodeGroup.LIST}`,
    content: 'taskItem+',
  },

  listItem: {
    name: 'listItem',
    content: 'paragraph block*',
    defining: true,
    attributes: {
      indent: { default: null },
      indentUnit: { default: null },
    },
  },

  taskItem: {
    name: 'taskItem',
    content: 'paragraph block*',
    defining: true,
    attributes: {
      checked: { default: false },
      indent: { default: null },
      indentUnit: { default: null },
    },
  },

  // ─── Details ─────────────────────────────────────────────────────────────
  details: {
    name: 'details',
    group: NodeGroup.BLOCK,
    content: 'detailsSummary detailsContent',
    defining: true,
    isolating: true,
    attributes: {
      open: { default: false },
    },
  },

  detailsSummary: {
    name: 'detailsSummary',
    content: 'text*',
    defining: true,
    selectable: false,
    isolating: true,
  },

  detailsContent: {
    name: 'detailsContent',
    content: 'block+',
    defining: true,
    selectable: false,
    isolating: true,
  },

  // ─── Table Nodes ─────────────────────────────────────────────────────────
  table: {
    name: 'table',
    group: NodeGroup.BLOCK,
    content: 'tableRow+',
    isolating: true,
  },

  tableRow: {
    name: 'tableRow',
    content: '(tableCell | tableHeader)*',
    tableRole: 'row',
  },

  tableCell: {
    name: 'tableCell',
    content: 'block+',
    tableRole: 'cell',
    attributes: {
      colspan: { default: 1, type: 'number' },
      rowspan: { default: 1, type: 'number' },
      colwidth: { default: null },
      align: { default: null },
      background: { default: null },
      color: { default: null },
    },
  },

  tableHeader: {
    name: 'tableHeader',
    content: 'block+',
    tableRole: 'header_cell',
    isolating: true,
    attributes: {
      colspan: { default: 1, type: 'number' },
      rowspan: { default: 1, type: 'number' },
      colwidth: { default: null },
      align: { default: null },
      background: { default: null },
      color: { default: null },
    },
  },

  // ─── Media Nodes ─────────────────────────────────────────────────────────
  image: {
    name: 'image',
    group: NodeGroup.BLOCK,
    content: 'inline*',
    defining: true,
    isolating: true,
    atom: false,
    attributes: {
      vnode: { default: true },
      type: { default: 'image' },
      name: { default: null },
      size: { default: null },
      id: { default: null },
      src: { default: null },
      config: { default: null },
      content: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
      left: { default: 0 },
      top: { default: 0 },
      angle: { default: null },
      draggable: { default: false },
      rotatable: { default: false },
      equalProportion: { default: true },
      flipX: { default: false },
      flipY: { default: false },
      uploaded: { default: false },
      error: { default: false },
      previewType: { default: 'image' },
      showTitle: { default: false },
      inline: { default: false },
      nodeAlign: { default: 'center' },
      margin: { default: null },
    },
  },

  inlineImage: {
    name: 'inlineImage',
    group: NodeGroup.INLINE,
    inline: true,
    atom: false,
    attributes: {
      vnode: { default: true },
      type: { default: 'image' },
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: 150 },
      height: { default: 80 },
      inline: { default: true },
      equalProportion: { default: false },
      nodeAlign: { default: 'center' },
    },
  },

  video: {
    name: 'video',
    group: NodeGroup.BLOCK,
    atom: true,
    attributes: {
      vnode: { default: true },
      file: { default: null },
      id: { default: null },
      name: { default: null },
      size: { default: null },
      src: { default: null },
      width: { default: null },
      height: { default: 200 },
      uploaded: { default: false },
      previewType: { default: 'video' },
      nodeAlign: { default: 'center' },
      margin: { default: null },
    },
  },

  audio: {
    name: 'audio',
    group: NodeGroup.BLOCK,
    atom: true,
    attributes: {
      vnode: { default: true },
      file: { default: null },
      id: { default: null },
      name: { default: null },
      size: { default: null },
      src: { default: null },
      uploaded: { default: false },
      previewType: { default: 'audio' },
      nodeAlign: { default: 'center' },
      margin: { default: null },
    },
  },

  file: {
    name: 'file',
    group: NodeGroup.BLOCK,
    atom: true,
    attributes: {
      vnode: { default: true },
      file: { default: null },
      id: { default: null },
      url: { default: null },
      name: { default: null },
      type: { default: null },
      size: { default: null },
      uploaded: { default: false },
      previewType: { default: null },
      width: { default: null },
      height: { default: 200 },
      fitWidth: { default: false },
      nodeAlign: { default: 'center' },
      margin: { default: null },
    },
  },

  // ─── Layout Nodes ────────────────────────────────────────────────────────
  callout: {
    name: 'callout',
    group: NodeGroup.BLOCK,
    content: 'paragraph+',
    defining: true,
    exitable: true,
    selectable: false,
    attributes: {
      type: { default: 'primary' },
      icon: { default: '⭐️' },
      backgroundColor: { default: 'rgb(217, 231, 255)' },
      margin: { default: null },
    },
  },

  column: {
    name: 'column',
    group: NodeGroup.BLOCK,
    content: 'block+',
    attributes: {
      colWidth: { default: 200 },
    },
  },

  columnContainer: {
    name: 'columnContainer',
    group: NodeGroup.BLOCK,
    content: 'column+',
  },

  textBox: {
    name: 'textBox',
    group: NodeGroup.BLOCK,
    content: 'inline*',
    draggable: false,
    attributes: {
      vnode: { default: true },
      width: { default: 200 },
      height: { default: 30 },
      angle: { default: null },
      left: { default: 0 },
      top: { default: 0 },
      rotatable: { default: true },
      borderWidth: { default: 1 },
      borderColor: { default: '#000' },
      borderStyle: { default: 'solid' },
      backgroundColor: { default: 'transparent' },
      writingMode: { default: 'horizontal-tb' },
    },
  },

  // ─── Inline Nodes ────────────────────────────────────────────────────────
  hardBreak: {
    name: 'hardBreak',
    group: NodeGroup.INLINE,
    inline: true,
    atom: true,
  },

  datetime: {
    name: 'datetime',
    group: NodeGroup.INLINE,
    inline: true,
    atom: true,
    selectable: false,
    attributes: {
      type: { default: 'datetime' },
      date: { default: null },
      text: { default: '[Date]' },
      format: { default: null },
      withTime: { default: false },
      capitalize: { default: false },
    },
  },

  optionBox: {
    name: 'optionBox',
    group: NodeGroup.INLINE,
    inline: true,
    atom: true,
    attributes: {
      target: { default: 'checkbox' },
      items: { default: [] },
      checkAll: { default: false },
      checked: { default: true },
      updated: { default: false },
    },
  },

  mention: {
    name: 'mention',
    group: NodeGroup.INLINE,
    inline: true,
    atom: true,
    selectable: false,
    attributes: {
      id: { default: null },
      label: { default: null },
      mentionSuggestionChar: { default: '@' },
      bio: { default: null },
    },
  },

  tag: {
    name: 'tag',
    group: NodeGroup.INLINE,
    inline: true,
    atom: true,
    attributes: {
      type: { default: 'default' },
      text: { default: '[Tag]' },
      color: { default: '#999' },
      backgroundColor: { default: 'rgba(0, 0, 0, 0.05)' },
    },
  },

  // ─── Block Media ─────────────────────────────────────────────────────────
  horizontalRule: {
    name: 'horizontalRule',
    group: NodeGroup.BLOCK,
    attributes: {
      dataType: { default: 'single' },
      color: { default: undefined },
    },
  },

  iframe: {
    name: 'iframe',
    group: NodeGroup.BLOCK,
    atom: true,
    attributes: {
      vnode: { default: true },
      type: { default: 0 },
      src: { default: null },
      width: { default: null },
      height: { default: 200 },
      clickable: { default: false },
      nodeAlign: { default: 'center' },
      margin: { default: null },
    },
  },

  echarts: {
    name: 'echarts',
    group: NodeGroup.BLOCK,
    atom: true,
    attributes: {
      vnode: { default: true },
      id: { default: null },
      name: { default: null },
      width: { default: null },
      height: { default: 300 },
      mode: { default: 1 },
      chartOptions: { default: null },
      chartConfig: { default: null },
      src: { default: '' },
      describe: { default: null },
      nodeAlign: { default: 'center' },
      margin: { default: null },
    },
  },

  toc: {
    name: 'toc',
    group: NodeGroup.BLOCK,
    atom: true,
    attributes: {
      vnode: { default: true },
    },
  },

  // ─── Math ────────────────────────────────────────────────────────────────
  blockMath: {
    name: 'blockMath',
    group: NodeGroup.BLOCK,
    atom: true,
    attributes: {
      latex: { default: '' },
    },
  },

  inlineMath: {
    name: 'inlineMath',
    group: NodeGroup.INLINE,
    inline: true,
    atom: true,
    attributes: {
      latex: { default: '' },
    },
  },

  // ─── Footnotes ───────────────────────────────────────────────────────────
  footnoteReference: {
    name: 'footnoteReference',
    group: NodeGroup.INLINE,
    inline: true,
    content: 'text*',
    atom: true,
    draggable: true,
    attributes: {
      referenceNumber: { default: 0 },
      caption: { default: '' },
    },
  },

  footnote: {
    name: 'footnote',
    content: 'paragraph+',
    isolating: true,
    defining: true,
    draggable: false,
    attributes: {
      id: { default: null },
      dataFnId: { default: null },
    },
  },

  footnotes: {
    name: 'footnotes',
    group: '',
    content: 'footnote*',
    isolating: true,
    defining: true,
    draggable: false,
  },
}

// ─── Mark Type Definitions ─────────────────────────────────────────────────

export const MarkTypes = {
  bold: {
    name: 'bold',
    renderHTML: { tag: 'b' },
  },

  italic: {
    name: 'italic',
    renderHTML: { tag: 'em' },
  },

  strike: {
    name: 'strike',
    renderHTML: { tag: 's' },
  },

  underline: {
    name: 'underline',
    renderHTML: { tag: 'u' },
  },

  code: {
    name: 'code',
    renderHTML: { tag: 'code' },
  },

  link: {
    name: 'link',
    attributes: {
      href: { default: null },
      target: { default: null },
      rel: { default: 'noopener noreferrer' },
      class: { default: null },
    },
  },

  subscript: {
    name: 'subscript',
    renderHTML: { tag: 'sub' },
  },

  superscript: {
    name: 'superscript',
    renderHTML: { tag: 'sup' },
  },

  textStyle: {
    name: 'textStyle',
    attributes: {
      color: { default: null },
      fontSize: { default: null },
    },
  },

  comment: {
    name: 'comment',
    priority: 1000,
    spanning: false,
    inclusive: false,
    keepOnSplit: false,
    attributes: {
      id: { default: null },
      user: { default: '' },
      color: { default: 'rgba(255, 213, 79, 0.4)' },
      thread: { default: null },
    },
  },

  bookmark: {
    name: 'bookmark',
    priority: 1000,
    keepOnSplit: false,
    exitable: true,
    attributes: {
      bookmarkName: { default: 'bookmarkName' },
    },
  },

  letterSpacing: {
    name: 'letterSpacing',
    attributes: {
      spacing: { default: null },
    },
  },
}

// ─── Schema Builder ────────────────────────────────────────────────────────

/**
 * Generate ProseMirror-compatible schema from our framework-agnostic definitions.
 * This bridges the Document Model layer with the Editing Engine layer.
 *
 * @param {Object} options - Schema generation options
 * @param {string} options.structure - Document content structure (e.g., 'heading? block+')
 * @param {boolean} options.enableFootnotes - Whether to include footnotes
 * @returns {Object} ProseMirror schema spec
 */
export function buildProseMirrorSchema(options = {}) {
  const {
    structure = 'block+',
    enableFootnotes = true,
  } = options

  const nodes = {}
  const marks = {}

  // Build nodes
  for (const [key, def] of Object.entries(NodeTypes)) {
    const nodeSpec = { ...def }

    // Override doc content with provided structure
    if (key === 'doc') {
      nodeSpec.content = enableFootnotes
        ? `${structure} footnotes?`
        : structure
    }

    // Remove non-ProseMirror fields
    delete nodeSpec.renderHTML

    nodes[key] = nodeSpec
  }

  // Build marks
  for (const [key, def] of Object.entries(MarkTypes)) {
    const markSpec = { ...def }
    delete markSpec.renderHTML
    marks[key] = markSpec
  }

  return { nodes, marks }
}

/**
 * Get all node type names
 * @returns {string[]}
 */
export function getNodeNames() {
  return Object.keys(NodeTypes)
}

/**
 * Get all mark type names
 * @returns {string[]}
 */
export function getMarkNames() {
  return Object.keys(MarkTypes)
}

/**
 * Check if a node type exists
 * @param {string} name
 * @returns {boolean}
 */
export function hasNodeType(name) {
  return name in NodeTypes
}

/**
 * Check if a mark type exists
 * @param {string} name
 * @returns {boolean}
 */
export function hasMarkType(name) {
  return name in MarkTypes
}

/**
 * Get node type definition by name
 * @param {string} name
 * @returns {Object|null}
 */
export function getNodeType(name) {
  return NodeTypes[name] || null
}

/**
 * Get mark type definition by name
 * @param {string} name
 * @returns {Object|null}
 */
export function getMarkType(name) {
  return MarkTypes[name] || null
}

export default {
  NodeTypes,
  MarkTypes,
  NodeGroup,
  buildProseMirrorSchema,
  getNodeNames,
  getMarkNames,
  hasNodeType,
  hasMarkType,
  getNodeType,
  getMarkType,
}
