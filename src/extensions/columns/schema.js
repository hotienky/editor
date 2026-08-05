export const columnNodes = () => {
  return {
    column: {
      group: 'block',
      content: 'block+',
      attrs: {
        colWidth: { default: 200 },
      },
      parseDOM: [
        {
          tag: 'div.kindy-node-column',
          getAttrs(dom) {
            if (!(dom instanceof HTMLElement)) return false
            const width = dom.style.width.replace('px', '') || 200
            return {
              colWidth: width,
            }
          },
        },
      ],
      toDOM(node) {
        const { colWidth } = node.attrs
        const style = colWidth ? `width: ${colWidth}px;` : ''
        return [
          'div',
          {
            class: 'kindy-node-column',
            style,
          },
          0,
        ]
      },
    },
    columnContainer: {
      group: 'block',
      content: 'column+',
      parseDOM: [
        {
          tag: 'div.kindy-node-column-container',
        },
      ],
      toDOM() {
        return ['div', { class: 'kindy-node-column-container' }, 0]
      },
    },
  }
}
