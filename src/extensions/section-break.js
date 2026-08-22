import { mergeAttributes, Node } from '@tiptap/core'

const sectionId = () => `section-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`

/** Stable semantic section boundary. Pagination remains a browser preview. */
export default Node.create({
  name: 'sectionBreak',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      id: { default: null },
      type: { default: 'nextPage' },
      page: { default: null },
    }
  },
  parseHTML() { return [{ tag: 'div[data-kindy-section-break]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'kindy-section-break', 'data-kindy-section-break': HTMLAttributes.id || '' })]
  },
  addCommands() {
    return {
      setSectionBreak: (attrs = {}) => ({ commands }) => commands.insertContent({ type: this.name, attrs: { id: attrs.id || sectionId(), type: attrs.type || 'nextPage', page: attrs.page || null } }),
    }
  },
})

