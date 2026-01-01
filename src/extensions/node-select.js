import { Extension } from '@tiptap/core'
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state'

// 点击节点时选中当前节点，主要是为了解决升级到 tiptap v3 后，点击节点无法选中当前节点的问题
export default Extension.create({
  name: 'clickSelectNode',
  addOptions() {
    return {
      types: [
        'horizontalRule',
        'tag',
        'toc',
        'file',
        'iframe',
        'codeBlock',
        'audio',
        'echarts',
        'video',
        'image',
        'pageBreak',
        'callout',
        'textBox',
      ],
    }
  },
  addProseMirrorPlugins() {
    const { types } = this.options

    return [
      new Plugin({
        key: new PluginKey('clickSelectNode'),
        props: {
          handleDOMEvents: {
            // 使用 mousedown 通常比 click 反应更快且更稳定
            mousedown(view, event) {
              const { state, dispatch } = view

              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })

              if (!pos) return false

              const node = state.doc.nodeAt(
                pos.inside >= 0 ? pos.inside : pos.pos,
              )

              if (!node || !types.includes(node.type.name)) return false

              const selection = NodeSelection.create(
                state.doc,
                pos.inside >= 0 ? pos.inside : pos.pos,
              )
              dispatch(state.tr.setSelection(selection))

              view.focus()

              return true
            },
          },
        },
      }),
    ]
  },
})
