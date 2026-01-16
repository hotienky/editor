import { OrderedList } from '@tiptap/extension-list'

export default OrderedList.extend({
  content: 'listItem*',
  addAttributes() {
    return {
      ...this.parent?.(),
      listType: {
        default: 'decimal',
        parseHTML: (element) =>
          element.style.getPropertyValue('list-style-type') || 'decimal',
        renderHTML: ({ listType }) => {
          return {
            style: `list-style-type: ${listType}`,
            'data-type': listType,
          }
        },
      },
      start: {
        default: 1,
        parseHTML: (element) => {
          const start = element.getAttribute('data-start')
          return start ? Number(start) : 1
        },
        renderHTML: (attributes) => {
          if (attributes['data-start'] === 1) {
            return {}
          }
          return {
            'data-start': attributes.start,
          }
        },
      },
    }
  },
})
