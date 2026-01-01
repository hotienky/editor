export const getSelectionNode = (editor) => {
  const { $anchor, node } = editor.state.selection
  if (node?.type?.isAtom) {
    return node
  }
  editor.commands.selectParentNode()
  return $anchor.node(1) || node
}
export const getSelectionText = (editor) => {
  const { from, to, empty } = editor.state.selection
  if (empty) {
    return ''
  }
  return editor.state.doc.textBetween(from, to, '')
}

// 设置选中区域 包含选中效果
export const setSelectionText = (editor, prevDocLength, from, to) => {
  const state = editor?.state
  // 计算新的文档长度
  const newDocLength = state.doc.content.size
  // 计算插入内容后的实际结束位置
  const newTo = to + (newDocLength - prevDocLength)
  if (newTo <= from) {
    return false
  }
  const selection = TextSelection.create(state.doc, from, newTo)
  const { tr } = editor.view.state
  if (tr && selection) {
    tr.setSelection(selection)
    editor.view.dispatch(tr)
    editor?.commands.focus()
  }
}
