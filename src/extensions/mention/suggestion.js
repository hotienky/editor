import { VueRenderer } from '@tiptap/vue-3'

import Mentions from './mentions.vue'

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

          document.body.appendChild(component.element)
        },
        onUpdate(props) {
          component.updateProps(props)
        },
        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            component.destroy()
            return true
          }
          return component.ref?.onKeyDown(props)
        },
        onExit() {
          component.destroy()
        },
      }
    },
  }
}
