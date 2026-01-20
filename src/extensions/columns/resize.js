import { Plugin } from '@tiptap/pm/state'

import {
  handleGridDecorations,
  handleMouseDown,
  handleMouseLeave,
  handleMouseMove,
  handleMouseUp,
} from './dom'
import { GridResizeState, gridResizingPluginKey } from './state'

export const gridResizingPlugin = (options) => {
  const handleWidth = options?.handleWidth ?? 2
  const columnMinWidth = options?.columnMinWidth ?? 50

  return new Plugin({
    key: gridResizingPluginKey,

    state: {
      init: () => new GridResizeState(-1, false),
      apply: (tr, prev) => {
        return prev.apply(tr)
      },
    },

    props: {
      attributes: (state) => {
        const pluginState = gridResizingPluginKey.getState(state)
        if (pluginState && pluginState.activeHandle > -1) {
          return { class: 'umo-node-column-resize-cursor' }
        }
        return {}
      },

      // The main event handlers
      handleDOMEvents: {
        mousemove: (view, event) => {
          return handleMouseMove(view, event, handleWidth)
        },
        mouseleave: (view) => {
          return handleMouseLeave(view)
        },
        mousedown: (view, event) => {
          return handleMouseDown(view, event, columnMinWidth)
        },
        mouseup: (view, event) => {
          return handleMouseUp(view, event)
        },
      },

      decorations: (state) => {
        const pluginState = gridResizingPluginKey.getState(state)
        if (!pluginState) return null
        if (pluginState.activeHandle === -1) return null

        return handleGridDecorations(state, pluginState.activeHandle)
      },
    },
  })
}
