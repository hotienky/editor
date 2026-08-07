/**
 * Editing Engine — Transaction Helpers
 *
 * Clean helpers for common ProseMirror transaction operations.
 * All functions work with the editor's state and view.
 */

/**
 * Dispatch a transaction with optional metadata
 * @param {Editor} editor
 * @param {(state: EditorState) => Transaction} trFn
 * @param {Object} [meta] - Transaction metadata
 */
export function dispatch(editor, trFn, meta) {
  if (!editor?.view) return

  let tr = trFn(editor.state)
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      tr = tr.setMeta(key, value)
    }
  }
  editor.view.dispatch(tr)
}

/**
 * Insert text at the current selection
 * @param {Editor} editor
 * @param {string} text
 * @param {Object} [marks] - Optional marks to apply
 */
export function insertText(editor, text, marks) {
  if (!editor?.view) return

  const { state } = editor
  let tr = state.tr.insertText(text)
  if (marks) {
    for (const [markType, attrs] of Object.entries(marks)) {
      const mark = state.schema.marks[markType]?.create(attrs)
      if (mark) {
        tr = tr.addMark(
          state.selection.from,
          state.selection.from + text.length,
          mark,
        )
      }
    }
  }
  editor.view.dispatch(tr)
}

/**
 * Replace the selection with a node
 * @param {Editor} editor
 * @param {string} nodeName
 * @param {Object} [attrs]
 * @param {Fragment|Node|Node[]} [content]
 */
export function replaceSelectionWithNode(editor, nodeName, attrs, content) {
  if (!editor?.view) return

  const { state } = editor
  const nodeType = state.schema.nodes[nodeName]
  if (!nodeType) return

  const node = nodeType.create(attrs, content)
  editor.view.dispatch(state.tr.replaceSelectionWith(node))
}

/**
 * Update node attributes at a position
 * @param {Editor} editor
 * @param {number} pos
 * @param {Object} attrs
 */
export function setNodeMarkup(editor, pos, attrs) {
  if (!editor?.view) return

  const { state } = editor
  editor.view.dispatch(state.tr.setNodeMarkup(pos, undefined, attrs))
}

/**
 * Remove all marks in the current selection
 * @param {Editor} editor
 */
export function unsetAllMarks(editor) {
  if (!editor?.view) return

  const { state } = editor
  const { from, to } = state.selection
  editor.view.dispatch(state.tr.removeMark(from, to))
}

/**
 * Set the text selection to a specific position
 * @param {Editor} editor
 * @param {number} pos
 * @param {boolean} [dir] - Direction
 */
export function setTextSelection(editor, pos, dir) {
  if (!editor?.view) return

  const { state } = editor
  const selection = state.doc.resolve(pos)
    .as(pos, dir === -1 ? 1 : dir === 1 ? -1 : undefined)
  editor.view.dispatch(state.tr.setSelection(selection))
}

/**
 * Set a node selection (e.g., for images)
 * @param {Editor} editor
 * @param {number} pos
 */
export function setNodeSelection(editor, pos) {
  if (!editor?.view) return

  const { state } = editor
  editor.view.dispatch(
    state.tr.setSelection(state.selection.constructor.node(state.doc.resolve(pos))),
  )
}

/**
 * Scroll the selection into view
 * @param {Editor} editor
 */
export function scrollIntoView(editor) {
  if (!editor?.view) return
  editor.view.dispatch(editor.state.tr.scrollIntoView())
}

/**
 * Delete the selection
 * @param {Editor} editor
 */
export function deleteSelection(editor) {
  if (!editor?.view) return

  const { state } = editor
  if (state.selection.empty) return
  editor.view.dispatch(state.tr.deleteSelection())
}

/**
 * Create a transaction from a ProseMirror plugin
 * @param {Editor} editor
 * @param {string} pluginKey - Key of the plugin
 * @param {Object} meta - Meta to set
 */
export function pluginDispatch(editor, pluginKey, meta) {
  if (!editor?.view) return

  const { state } = editor
  editor.view.dispatch(state.tr.setMeta(pluginKey, meta))
}
