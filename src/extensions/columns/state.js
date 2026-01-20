import { PluginKey } from '@tiptap/pm/state'

export const gridResizingPluginKey = new PluginKey('gridResizingPlugin')

export class GridResizeState {
  constructor(activeHandle, dragging) {
    this.activeHandle = activeHandle
    this.dragging = dragging
  }

  apply(tr) {
    const action = tr.getMeta(gridResizingPluginKey)
    if (!action) return this

    if (typeof action.setHandle === 'number') {
      return new GridResizeState(action.setHandle, false)
    }
    if (action.setDragging !== undefined) {
      return new GridResizeState(this.activeHandle, action.setDragging)
    }
    if (this.activeHandle > -1 && tr.docChanged) {
      // remap when doc changes
    }
    return this
  }
}
