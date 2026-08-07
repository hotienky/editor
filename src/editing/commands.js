/**
 * Editing Engine — Unified Command Execution
 *
 * Provides a single `execute()` entry point for all editor commands.
 * Handles focus management automatically.
 */

/**
 * Execute a single editor command
 * @param {Editor} editor - Tiptap editor instance
 * @param {string} command - Command name
 * @param {Object} params - Command parameters
 * @returns {boolean} Whether the command succeeded
 */
export function execute(editor, command, params = {}) {
  if (!editor) return false

  const chain = editor.chain().focus()

  if (typeof chain[command] === 'function') {
    return chain[command](params).run()
  }

  return false
}

/**
 * Execute multiple commands in sequence
 * @param {Editor} editor - Tiptap editor instance
 * @param {Array<string|Object>} commands - Array of commands or { command, params } objects
 * @returns {boolean} Whether all commands succeeded
 */
export function executeBatch(editor, commands) {
  if (!editor || !commands.length) return false

  let chain = editor.chain().focus()

  for (const item of commands) {
    const [command, params] = typeof item === 'string'
      ? [item, {}]
      : [item.command, item.params || {}]

    if (typeof chain[command] === 'function') {
      chain = chain[command](params)
    }
  }

  return chain.run()
}

/**
 * Execute a command without auto-focusing
 * @param {Editor} editor - Tiptap editor instance
 * @param {string} command - Command name
 * @param {Object} params - Command parameters
 * @returns {boolean}
 */
export function executeSilent(editor, command, params = {}) {
  if (!editor) return false

  if (typeof editor.commands[command] === 'function') {
    return editor.commands[command](params)
  }

  return false
}

/**
 * Check if a command can be executed
 * @param {Editor} editor - Tiptap editor instance
 * @param {string} command - Command name
 * @returns {boolean}
 */
export function canExecute(editor, command) {
  if (!editor) return false
  return typeof editor.can()[command] === 'function'
}

/**
 * Check if a node/mark type is active
 * @param {Editor} editor - Tiptap editor instance
 * @param {string} type - Node or mark type name
 * @param {Object} attrs - Optional attributes to match
 * @returns {boolean}
 */
export function isActive(editor, type, attrs) {
  if (!editor) return false
  return editor.isActive(type, attrs)
}

/**
 * Get the editor's current state summary
 * @param {Editor} editor - Tiptap editor instance
 * @returns {Object}
 */
export function getEditorState(editor) {
  if (!editor) return null

  return {
    isEditable: editor.isEditable,
    isFocused: editor.isFocused,
    isEmpty: editor.isEmpty,
    selection: {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
      empty: editor.state.selection.empty,
    },
    docSize: editor.state.doc.content.size,
    textContent: editor.getText(),
  }
}
