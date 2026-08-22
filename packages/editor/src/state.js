/**
 * Editing Engine — Editor State & Selection Helpers
 *
 * Clean helpers for reading editor state, selection, and node information.
 */

/**
 * Get the current selection range
 * @param {Editor} editor
 * @returns {{ from: number, to: number, empty: boolean } | null}
 */
export function getSelection(editor) {
  if (!editor?.state) return null
  const { from, to, empty } = editor.state.selection
  return { from, to, empty }
}

/**
 * Get the currently selected text
 * @param {Editor} editor
 * @returns {string}
 */
export function getSelectedText(editor) {
  if (!editor?.state) return ''
  const { from, to } = editor.state.selection
  return editor.state.doc.textBetween(from, to)
}

/**
 * Get the node at the current cursor position
 * @param {Editor} editor
 * @returns {{ type: string, pos: number, node: Node } | null}
 */
export function getNodeAtCursor(editor) {
  if (!editor?.state) return null

  const { selection } = editor.state
  const $pos = selection.$from

  return {
    type: $pos.parent.type.name,
    pos: $pos.before(),
    node: $pos.parent,
  }
}

/**
 * Get the depth of the node at the cursor
 * @param {Editor} editor
 * @returns {number}
 */
export function getDepthAtCursor(editor) {
  if (!editor?.state) return 0
  return editor.state.selection.$from.depth
}

/**
 * Get attributes of the node at cursor
 * @param {Editor} editor
 * @returns {Object}
 */
export function getNodeAttrsAtCursor(editor) {
  if (!editor?.state) return {}

  const $pos = editor.state.selection.$from
  return $pos.parent.attrs || {}
}

/**
 * Check if the editor content is empty
 * @param {Editor} editor
 * @returns {boolean}
 */
export function isEmpty(editor) {
  if (!editor?.state) return true
  return editor.isEmpty
}

/**
 * Get the document size in characters
 * @param {Editor} editor
 * @returns {number}
 */
export function getDocSize(editor) {
  if (!editor?.state) return 0
  return editor.state.doc.content.size
}

/**
 * Get the word count of the document
 * @param {Editor} editor
 * @returns {number}
 */
export function getWordCount(editor) {
  if (!editor?.state) return 0
  const text = editor.getText()
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Get the character count of the document
 * @param {Editor} editor
 * @returns {number}
 */
export function getCharCount(editor) {
  if (!editor?.state) return 0
  return editor.getText().length
}

/**
 * Check if a mark is active at the current selection
 * @param {Editor} editor
 * @param {string} markType
 * @returns {boolean}
 */
export function hasMark(editor, markType) {
  if (!editor) return false
  return editor.isActive(markType)
}

/**
 * Get all active marks at the current selection
 * @param {Editor} editor
 * @returns {string[]}
 */
export function getActiveMarks(editor) {
  if (!editor?.state) return []

  const { $from } = editor.state.selection
  const marks = []

  $from.marks().forEach((mark) => {
    marks.push(mark.type.name)
  })

  return marks
}

/**
 * Get the current line height of the node at cursor
 * @param {Editor} editor
 * @returns {string|null}
 */
export function getLineHeight(editor) {
  if (!editor?.state) return null

  const attrs = getNodeAttrsAtCursor(editor)
  return attrs.lineHeight || null
}

/**
 * Get the current font family of the text at cursor
 * @param {Editor} editor
 * @returns {string|null}
 */
export function getFontFamily(editor) {
  if (!editor?.state) return null

  const { $from } = editor.state.selection
  const fontFamily = $from.marks().find((m) => m.type.name === 'textStyle')?.attrs?.fontFamily
  return fontFamily || null
}

/**
 * Get the current font size of the text at cursor
 * @param {Editor} editor
 * @returns {string|null}
 */
export function getFontSize(editor) {
  if (!editor?.state) return null

  const { $from } = editor.state.selection
  const fontSize = $from.marks().find((m) => m.type.name === 'textStyle')?.attrs?.fontSize
  return fontSize || null
}

/**
 * Get the JSON representation of the document
 * @param {Editor} editor
 * @returns {Object}
 */
export function getJSON(editor) {
  if (!editor?.state) return null
  return editor.getJSON()
}
