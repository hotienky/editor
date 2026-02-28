<template>
  <menus-button
    ico="node-duplicate"
    :text="t('blockMenu.duplicate')"
    @menu-click="duplicateNode"
  />
</template>

<script setup>
import { getSelectionNode } from '@/utils/selection'
import { shortId } from '@/utils/short-id'

const editor = inject('editor')

const duplicateNode = () => {
  const selectionNode = editor.value ? getSelectionNode(editor.value) : null
  const getPosition = () => {
    let point = 0
    editor.value?.state.doc.descendants((node, pos) => {
      if (node === selectionNode) {
        point = pos + node.nodeSize
      }
    })
    return point
  }
  const copeNode = selectionNode?.type.create(
    {
      ...selectionNode.attrs,
      id: shortId(),
    },
    selectionNode.content,
    selectionNode.marks,
  )
  editor.value?.commands.insertContentAt(getPosition(), copeNode?.toJSON())
}
</script>
