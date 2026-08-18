import { NodeSelection } from '@tiptap/pm/state'

export const findClosestTargetNode = (state, typeNames) => {
  const { selection } = state

  if (selection instanceof NodeSelection) {
    const { node } = selection
    if (node && typeNames.includes(node.type.name)) {
      return { node, pos: selection.from }
    }
  }

  const { $from } = selection
  for (let { depth } = $from; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (typeNames.includes(node.type.name)) {
      return { node, pos: $from.before(depth) }
    }
  }

  return null
}
