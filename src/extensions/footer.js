/**
 * Footer Extension
 *
 * Tiptap extension for editable footers.
 * Supports different content for first page, odd/even pages, and page numbers.
 *
 * Architecture: Editing Layer — Extensions
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'

const footerPluginKey = new PluginKey('footer')

export const FooterPosition = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
}

export const FooterScope = {
  ALL: 'all',
  FIRST_LAST: 'first_last',
  ODD_EVEN: 'odd_even',
  FIRST_PAGE: 'first_page',
  NOT_FIRST: 'not_first',
}

export const createFooterContent = (options = {}) => ({
  text: options.text || '',
  leftText: options.leftText || '',
  rightText: options.rightText || '',
  position: options.position || FooterPosition.CENTER,
  fontSize: options.fontSize || 10,
  fontFamily: options.fontFamily || 'Arial',
  fontWeight: options.fontWeight || 'normal',
  fontStyle: options.fontStyle || 'normal',
  color: options.color || '#333333',
  borderTop: options.borderTop !== false,
  borderTopWidth: options.borderTopWidth || 1,
  borderTopColor: options.borderTopColor || '#cccccc',
  borderTopStyle: options.borderTopStyle || 'solid',
  paddingTop: options.paddingTop || 8,
  paddingBottom: options.paddingBottom || 0,
  scope: options.scope || FooterScope.ALL,
  differentFirstPage: options.differentFirstPage || false,
  firstPageContent: options.firstPageContent || null,
  showPageNumber: options.showPageNumber !== false,
  pageNumberFormat: options.pageNumberFormat || '{page}',
  pageNumberStart: options.pageNumberStart || 1,
})

export const Footer = Extension.create({
  name: 'footer',

  addOptions() {
    return {
      enable: false,
      height: 1.5, // cm
      content: createFooterContent(),
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
      toggleFooter: () => ({ dispatch }) => {
        this.storage.enabled = !this.storage.enabled
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      enableFooter: () => ({ dispatch }) => {
        this.storage.enabled = true
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      disableFooter: () => ({ dispatch }) => {
        this.storage.enabled = false
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      updateFooterContent: (content) => ({ dispatch }) => {
        this.storage.content = { ...this.storage.content, ...content }
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      updateFirstPageFooter: (content) => ({ dispatch }) => {
        this.storage.firstPageContent = content
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      setFooterText: (text) => ({ dispatch }) => {
        this.storage.content.text = text
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      setFooterAlign: (align) => ({ dispatch }) => {
        this.storage.content.position = align
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      setFooterScope: (scope) => ({ dispatch }) => {
        this.storage.content.scope = scope
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      updateFooterStyle: (style) => ({ dispatch }) => {
        this.storage.content = { ...this.storage.content, ...style }
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      setPageNumberFormat: (format) => ({ dispatch }) => {
        this.storage.content.pageNumberFormat = format
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      setPageNumberStart: (start) => ({ dispatch }) => {
        this.storage.content.pageNumberStart = start
        if (dispatch) {
          this.editor.dispatchTransaction(this.editor.state.tr)
        }
        return true
      },

      getFooterForPage: (pageNumber) => () => {
        if (pageNumber === 1 && this.storage.firstPageContent) {
          return this.storage.firstPageContent
        }
        return this.storage.content
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-f': () => this.editor.commands.toggleFooter(),
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: footerPluginKey,
        state: {
          init: () => ({
            enabled: this.storage.enabled,
            content: this.storage.content,
          }),
          apply: (tr, value) => {
            const meta = tr.getMeta(footerPluginKey)
            if (meta) {
              return { ...value, ...meta }
            }
            return value
          },
        },
        props: {
          decorations: (state) => {
            if (!this.storage.enabled) {
              return DecorationSet.empty
            }
            return DecorationSet.empty
          },
        },
      }),
    ]
  },
})

export default Footer
