import { OrderedList } from '@tiptap/extension-list'

export default OrderedList.extend({
  content: 'listItem*',
  addAttributes() {
    return {
      ...(this.parent ?? {}),
      listType: {
        default: 'decimal',
        parseHTML: (element) =>
          element.style.getPropertyValue('list-style-type') || 'decimal',
        renderHTML: ({ listType }) => {
          return {
            style: `list-style-type: ${listType}`,
            type: listType,
          }
        },
      },
    }
  },
})
