/**
 * Header Extension
 *
 * Tiptap extension for editable headers.
 * Supports different content for first page, odd/even pages.
 *
 * Architecture: Editing Layer — Extensions
 */

import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'

const headerPluginKey = new PluginKey('header')

/**
 * Header positions
 */
export const HeaderPosition = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
}

/**
 * Header scope
 */
export const HeaderScope = {
  ALL: 'all',
  FIRST_LAST: 'first_last',
  ODD_EVEN: 'odd_even',
  FIRST_PAGE: 'first_page',
  NOT_FIRST: 'not_first',
}

/**
 * Header content structure
 */
export const createHeaderContent = (options = {}) => ({
  text: options.text || '',
  leftText: options.leftText || '',
  rightText: options.rightText || '',
  position: options.position || HeaderPosition.CENTER,
  fontSize: options.fontSize || 10,
  fontFamily: options.fontFamily || 'Arial',
  fontWeight: options.fontWeight || 'normal',
  fontStyle: options.fontStyle || 'normal',
  color: options.color || '#333333',
  borderBottom: options.borderBottom !== false,
  borderBottomWidth: options.borderBottomWidth || 1,
  borderBottomColor: options.borderBottomColor || '#cccccc',
  borderBottomStyle: options.borderBottomStyle || 'solid',
  paddingTop: options.paddingTop || 0,
  paddingBottom: options.paddingBottom || 8,
  scope: options.scope || HeaderScope.ALL,
  differentFirstPage: options.differentFirstPage || false,
  firstPageContent: options.firstPageContent || null,
})

/**
 * Header Extension
 */
export const Header = Extension.create({
  name: 'header',

  addOptions() {
    return {
      enable: false,
      height: 1.5, // cm
      content: createHeaderContent(),
      firstPageContent: null,
      onUpdate: null,
    }
  },

  addStorage() {
    return {
      enabled: this.options.enable,
      content: { ...this.options.content },
      firstPageContent: this.options.firstPageContent ? { ...this.options.firstPageContent } : null,
      currentPage: 1,
      totalPages: 1,
    }
  },

  addCommands() {
    return {
      /**
       * Toggle header visibility
       */
      toggleHeader: () => ({ tr, dispatch }) => {
        this.storage.enabled = !this.storage.enabled
        if (dispatch) {
          tr.setMeta(headerPluginKey, { type: 'toggle', enabled: this.storage.enabled })
          dispatch(tr)
        }
        return true
      },

      /**
       * Enable header
       */
      enableHeader: () => ({ dispatch }) => {
        this.storage.enabled = true
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      /**
       * Disable header
       */
      disableHeader: () => ({ dispatch }) => {
        this.storage.enabled = false
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      /**
       * Update header content
       */
      updateHeaderContent: (content) => ({ dispatch }) => {
        this.storage.content = { ...this.storage.content, ...content }
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      /**
       * Update first page header content
       */
      updateFirstPageHeader: (content) => ({ dispatch }) => {
        this.storage.firstPageContent = content
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      /**
       * Set header text
       */
      setHeaderText: (text) => ({ dispatch }) => {
        this.storage.content.text = text
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      /**
       * Set header alignment
       */
      setHeaderAlign: (align) => ({ dispatch }) => {
        this.storage.content.position = align
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      /**
       * Set header scope
       */
      setHeaderScope: (scope) => ({ dispatch }) => {
        this.storage.content.scope = scope
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      /**
       * Update header style
       */
      updateHeaderStyle: (style) => ({ dispatch }) => {
        this.storage.content = { ...this.storage.content, ...style }
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      /**
       * Get header content for a specific page
       */
      getHeaderForPage: (pageNumber) => () => {
        if (pageNumber === 1 && this.storage.firstPageContent) {
          return this.storage.firstPageContent
        }
        return this.storage.content
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-h': () => this.editor.commands.toggleHeader(),
    }
  },

  addProseMirrorPlugins() {
    return [
      {
        key: headerPluginKey,
        state: {
          init: () => ({
            enabled: this.storage.enabled,
            content: this.storage.content,
          }),
          apply: (tr, value) => {
            const meta = tr.getMeta(headerPluginKey)
            if (meta) {
              return { ...value, ...meta }
            }
            return value
          },
        },
        props: {
          decorations: (state) => {
            // Add decorations to indicate header area
            if (!this.storage.enabled) {
              return DecorationSet.empty
            }
            return DecorationSet.empty
          },
        },
      },
    ]
  },
})

export default Header
