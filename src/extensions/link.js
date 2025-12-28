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
            if (target.tagName !== 'A') {
              return false
            }

            const href = target.getAttribute('href')
            if (!href) {
              return false
            }

            if (view.editable) {
              view.dispatch(
                view.state.tr.setMeta('link-click', {
                  target,
                  href,
                  pos,
                }),
              )
            }

            return true
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

export default CustomLink
