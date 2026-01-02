import { computePosition, flip, shift } from '@floating-ui/dom'
import { posToDOMRect, VueRenderer } from '@tiptap/vue-3'

import Mentions from './mentions.vue'

const updatePosition = (editor, element) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to,
      ),
  }

  computePosition(virtualElement, element, {
    placement: 'bottom-start',
    strategy: 'absolute',
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = 'max-content'
    element.style.position = strategy
    element.style.left = `${x}px`
    element.style.top = `${y}px`
  })
}

export default (users, container) => {
  return {
    items: ({ query }) =>
      users.filter((user) => user.label.includes(query)).slice(0, 10),

    command: ({ editor, range, props }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'mention',
          attrs: {
            id: props.id,
            label: props.label,
          },
        })
        .run()
    },

    render: () => {
      let component

      return {
        onStart: (props) => {
          component = new VueRenderer(Mentions, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) {
            return
          }

          component.element.style.position = 'absolute'

          document.body.appendChild(component.element)

          updatePosition(props.editor, component.element)
        },
        onUpdate(props) {
          component.updateProps(props)
          if (!props.clientRect) {
            return
          }

          updatePosition(props.editor, component.element)
        },
        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            component.destroy()
            return true
          }
          return component.ref?.onKeyDown(props)
        },
        onExit() {
          component.element.remove()
          component.destroy()
        },
      }
    },
  }
}
