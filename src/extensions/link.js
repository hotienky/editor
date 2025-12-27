import Link from '@tiptap/extension-link'
import { Plugin } from '@tiptap/pm/state'

const CustomLink = Link.extend({
  addStorage() {
    return {
      edit: false,
      meta: {},
    }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClick(view, pos, event) {
            const { target } = event
            if (target.tagName === 'A') {
              const href = target.getAttribute('href')
              view.dispatch(
                view.state.tr.setMeta('link-click', {
                  target,
                  href,
                  pos,
                }),
              )
              return true
            }
            return false
          },
        },
      }),
    ]
  },
  onTransaction({ transaction }) {
    const meta = transaction.getMeta('link-click')
    if (meta) {
      this.storage.edit = true
      this.storage.meta = meta
    }
  },
})

CustomLink.configure({
  openOnClick: (props) => !props.editor.isEditable,
})

export default CustomLink
