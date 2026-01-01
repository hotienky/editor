import { Selection } from '@tiptap/extensions'

import { getSelectionNode } from '@/utils/selection'

export default Selection.extend({
  addCommands() {
    return {
      ...this.parent?.(),
      setCurrentNodeSelection:
        () =>
        ({ editor, chain }) => {
          editor.commands.selectParentNode()
          const { $anchor } = editor.state.selection
          return chain()
            .setNodeSelection($anchor.pos - $anchor.depth)
            .run()
        },
      deleteSelectionNode:
        () =>
        ({ editor, commands }) => {
          const node = getSelectionNode(editor)
          if (!node) {
            return false
          }
          if (commands.deleteSelection()) {
            return true
          }
          return commands.deleteNode(node.type.name)
        },
    }
  },
})
