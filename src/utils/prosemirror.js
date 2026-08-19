/**
 * ProseMirror helper utilities
 */
export function findClosestTargetNode(state, types) {
  if (!state || !state.selection) return null
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (types.includes(node.type.name)) {
      return {
        node,
        pos: $from.before(d),
        depth: d,
      }
    }
  }
  return null
}
