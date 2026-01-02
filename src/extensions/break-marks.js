import { InvisibleNode } from '@tiptap/extension-invisible-characters'
import InvisibleCharacters, {
  HardBreakNode,
  ParagraphNode,
} from '@tiptap/extension-invisible-characters'

class HeadingNode extends InvisibleNode {
  constructor() {
    super({
      type: 'paragraph',
      predicate: (node) => ['heading'].includes(node.type.name),
    })
  }
}

export default InvisibleCharacters.configure({
  injectCSS: false,
  builders: [new HardBreakNode(), new ParagraphNode(), new HeadingNode()],
})
