import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const CM_TO_PX = 96 / 2.54
const layoutPluginKey = new PluginKey('docxParagraphLayout')

const parseLayout = (element) => {
  const value = element.getAttribute('data-docx-layout')
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const layoutStyle = (layout) => {
  if (!layout || typeof layout !== 'object') return ''
  const styles = []
  if (Number(layout.left)) styles.push(`margin-left: ${Number(layout.left)}cm`)
  if (Number(layout.right)) styles.push(`margin-right: ${Number(layout.right)}cm`)
  if (Number(layout.firstLine)) styles.push(`text-indent: ${Number(layout.firstLine)}cm`)
  if (Number(layout.hanging)) styles.push(`text-indent: -${Number(layout.hanging)}cm`)
  if (layout.keepNext) styles.push('break-after: avoid-page')
  if (layout.keepLines) styles.push('break-inside: avoid')
  if (layout.pageBreakBefore) styles.push('break-before: page')
  return styles.join('; ')
}

const directTabs = (paragraph) =>
  [...paragraph.querySelectorAll('.kindy-docx-tab')]
    .filter((tab) => tab.closest('[data-docx-layout]') === paragraph)

const segmentWidth = (paragraph, start, end) => {
  const range = document.createRange()
  range.setStartAfter(start)
  if (end) range.setEndBefore(end)
  else range.setEnd(paragraph, paragraph.childNodes.length)
  return range.getBoundingClientRect().width
}

const positionTabs = (root) => {
  if (typeof document === 'undefined') return
  for (const paragraph of root.querySelectorAll('[data-docx-layout]')) {
    const tabs = directTabs(paragraph)
    if (!tabs.length) continue
    tabs.forEach((tab) => {
      tab.style.width = '0px'
      tab.style.borderBottom = ''
    })
    const paragraphRect = paragraph.getBoundingClientRect()
    const scale = paragraph.offsetWidth > 0
      ? paragraphRect.width / paragraph.offsetWidth
      : 1
    tabs.forEach((tab, index) => {
      const position = Number(tab.getAttribute('data-position'))
      if (!Number.isFinite(position)) return
      const alignment = tab.getAttribute('data-alignment') || 'left'
      const followingWidth = segmentWidth(paragraph, tab, tabs[index + 1])
      const current = tab.getBoundingClientRect().left - paragraphRect.left
      const target = position * CM_TO_PX * scale
      const alignmentOffset = alignment === 'center'
        ? followingWidth / 2
        : ['right', 'end', 'decimal'].includes(alignment)
          ? followingWidth
          : 0
      const renderedWidth = Math.max(0, target - current - alignmentOffset)
      tab.style.width = `${renderedWidth / Math.max(scale, 0.01)}px`
      if (tab.getAttribute('data-leader') === 'dot') {
        tab.style.borderBottom = '1px dotted currentColor'
      }
    })
  }
}

const createLayoutPlugin = () => new Plugin({
  key: layoutPluginKey,
  view(view) {
    let frame = 0
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        positionTabs(view.dom)
      })
    }
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(schedule)
      : null
    observer?.observe(view.dom)
    window.addEventListener('resize', schedule)
    schedule()
    return {
      update: schedule,
      destroy() {
        if (frame) cancelAnimationFrame(frame)
        observer?.disconnect()
        window.removeEventListener('resize', schedule)
      },
    }
  },
})

export const DocxTab = Node.create({
  name: 'docxTab',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      alignment: { default: 'left' },
      position: { default: 1.27 },
      leader: { default: 'none' },
      index: { default: 0 },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-docx-tab]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'aria-hidden': 'true',
      'class': 'kindy-docx-tab',
      'data-docx-tab': '',
      'data-alignment': HTMLAttributes.alignment,
      'data-position': HTMLAttributes.position,
      'data-leader': HTMLAttributes.leader,
    })]
  },
})

export const DocxParagraphLayout = Extension.create({
  name: 'docxParagraphLayout',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        docxLayout: {
          default: null,
          parseHTML: parseLayout,
          renderHTML: ({ docxLayout }) => {
            if (!docxLayout || typeof docxLayout !== 'object') return {}
            const style = layoutStyle(docxLayout)
            return {
              'data-docx-layout': JSON.stringify(docxLayout),
              ...(style ? { style } : {}),
            }
          },
        },
      },
    }]
  },
  addProseMirrorPlugins() {
    return [createLayoutPlugin()]
  },
})
