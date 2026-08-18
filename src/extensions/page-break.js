import { mergeAttributes, Node } from '@tiptap/core'

export default Node.create({
  name: 'pageBreak',
  group: 'block',
  selectable: false,
  draggable: false,
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'kindy-page-break',
        'data-line-number': false,
      },
      getContentLabel: () => t('page.break'),
    }
  },
  parseHTML() {
    return [{ tag: 'div[class*="kindy-page-break"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-content': this.options.getContentLabel(),
      }),
    ]
  },
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ editor, chain, state }) => {
          const insertPos = state.selection.to

          // 1. Insert page break and a new paragraph right at cursor
          const res = chain()
            .insertContentAt(insertPos, [
              {
                type: this.name,
              },
              {
                type: 'paragraph',
              },
            ])
            .setTextSelection(insertPos + 2)
            .focus()
            .run()

          // 2. Trigger pagination layout recalculation
          if (editor?.storage?.pagination?._updateFn) {
            editor.storage.pagination._updateFn()
          }

          // 3. Scroll container smoothly to the new paragraph on the new page
          setTimeout(() => {
            const containerSelector = editor?.storage?.container || ''
            const containerEl =
              document.querySelector(
                `${containerSelector} .kindy-zoomable-container`,
              ) || document.querySelector('.kindy-zoomable-container')

            const sel = window.getSelection()
            if (sel && sel.anchorNode && containerEl) {
              const targetNode =
                sel.anchorNode.nodeType === Node.ELEMENT_NODE
                  ? sel.anchorNode
                  : sel.anchorNode.parentElement

              if (targetNode) {
                const nodeRect = targetNode.getBoundingClientRect()
                const containerRect = containerEl.getBoundingClientRect()
                const targetScroll =
                  containerEl.scrollTop + (nodeRect.top - containerRect.top) - 100

                containerEl.scrollTo({
                  top: Math.max(0, targetScroll),
                  behavior: 'smooth',
                })
              }
            }
          }, 80)

          return res
        },
    }
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
    }
  },
})
