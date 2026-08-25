/**
 * OOXML-Native Engine Adapter
 *
 * Bypasses ProseMirror entirely. Uses:
 *   OoxmlParser → OoxmlPackage → OoxmlEditor → OoxmlLayoutEngine → LayoutTree → OoxmlPainter → Canvas
 *
 * Implements EditorEngineAdapter interface for backward compatibility with WordEditor.vue.
 */

import type { EditorEngineAdapter, EditorEngineHandle, KindyDocumentState } from '../core/types'
import { createEmptyDocumentState } from '../core/state'
import { OoxmlParser } from '../model/ooxml-parser'
import { OoxmlEditor } from '../model/ooxml-editor'
import { OoxmlPainter } from '../model/ooxml-painter'
import { OoxmlSelection } from '../model/ooxml-selection'
import { OoxmlSerializer } from '../model/ooxml-serializer'
import { OoxmlInputHandler } from '../model/ooxml-input-handler'
import type { OoxmlPackage } from '../model/ooxml-types'
import type { LayoutTree } from '../model/ooxml-layout-types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OoxmlEngineOptions {
  readOnly?: boolean
  document?: Partial<KindyDocumentState>
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export function createOoxmlEngineAdapter(): EditorEngineAdapter {
  return {
    id: 'ooxml-native',
    mount(container: HTMLElement, options?: Record<string, unknown>): EditorEngineHandle {
      return mountOoxmlEngine(container, options as OoxmlEngineOptions | undefined)
    },
  }
}

// ─── Mount ────────────────────────────────────────────────────────────────────

function mountOoxmlEngine(
  container: HTMLElement,
  options?: OoxmlEngineOptions,
): EditorEngineHandle {
  // ── State ──
  let currentPkg: OoxmlPackage | null = null
  let editor: OoxmlEditor | null = null
  let readOnly = options?.readOnly ?? false
  let isApplying = false
  const listeners = new Set<(state: KindyDocumentState) => void>()

  // ── Components ──
  const parser = new OoxmlParser()
  const painter = new OoxmlPainter()
  let inputHandler: OoxmlInputHandler | null = null

  // ── DOM ──
  const surface = document.createElement('div')
  surface.className = 'ooxml-engine-surface'
  surface.style.cssText = 'width:100%;height:100%;overflow:auto;position:relative;'
  container.replaceChildren(surface)

  const pageContainer = document.createElement('div')
  pageContainer.className = 'ooxml-page-container'
  pageContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:20px 0;'
  surface.appendChild(pageContainer)

  // Single backing canvas
  const backingCanvas = document.createElement('canvas')
  backingCanvas.style.cssText = 'display:none;'
  pageContainer.appendChild(backingCanvas)

  // ── Scroll ──
  let scrollTop = 0
  surface.addEventListener('scroll', () => {
    scrollTop = surface.scrollTop
    repaint()
  })

  // ── Painting ──
  function repaint() {
    if (!editor || !backingCanvas.width) return
    const ctx = backingCanvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const viewTop = scrollTop
    const viewBottom = scrollTop + surface.clientHeight

    ctx.save()
    ctx.clearRect(0, 0, backingCanvas.width, backingCanvas.height)
    ctx.scale(dpr, dpr)
    painter.paint(ctx, editor.tree, viewTop, viewBottom)
    ctx.restore()
  }

  function setupPages() {
    if (!editor) return
    const tree = editor.tree
    const dpr = window.devicePixelRatio || 1

    // Convert page geometry from Twips to Pixels (ISO §17.6)
    const firstPage = tree.pages[0]
    const pageWPx = firstPage ? Math.round((firstPage.geometry.pageW / 1440) * 96) : 794
    const totalHeightPx = painter.measureDocumentHeight(tree)

    backingCanvas.width = Math.ceil(pageWPx * dpr)
    backingCanvas.height = Math.ceil(totalHeightPx * dpr)
    backingCanvas.style.width = pageWPx + "px"
    backingCanvas.style.height = totalHeightPx + "px"
    backingCanvas.style.display = "block"
    backingCanvas.style.margin = "0 auto"
    backingCanvas.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)"

    // Setup input handler
    if (!inputHandler) {
      inputHandler = new OoxmlInputHandler(editor.selection, painter)
      inputHandler.setTree(tree)
      inputHandler.attach(surface)
      inputHandler.onEdit(handleEdit)
      inputHandler.onAfterInput(() => repaint())
    } else {
      inputHandler.detach()
      inputHandler.setTree(tree)
      inputHandler.attach(surface)
    }

    repaint()
  }

  // ── Editing ──
  function handleEdit(event: import('../model/ooxml-input-handler').EditEvent) {
    if (readOnly || !editor) return
    editor.handleEdit(event)
    setupPages()
    _notifyChange()
  }

  // ── Change notification ──
  function _notifyChange() {
    if (isApplying) return
    const state = getState()
    for (const listener of listeners) {
      listener(state)
    }
  }

  // ── Load ──
  async function loadDocx(buffer: Uint8Array) {
    isApplying = true
    try {
      currentPkg = await parser.parse(buffer)
      painter.setMedia(currentPkg.media)
      editor = new OoxmlEditor(currentPkg)
      setupPages()
    } finally {
      isApplying = false
    }
  }

  function loadFromState(state: KindyDocumentState) {
    isApplying = true
    try {
      // If state has _docxBuffer, use the native path
      const buf = (state as any)._docxBuffer as Uint8Array | undefined
      if (buf) {
        parser.parse(buf).then((pkg) => {
          currentPkg = pkg
          editor = new OoxmlEditor(pkg)
          setupPages()
          isApplying = false
          _notifyChange()
        })
        return
      }

      // Fallback: create a minimal OoxmlPackage from KindyDocumentState
      currentPkg = kindyStateToOoxmlPackage(state)
      editor = new OoxmlEditor(currentPkg)
      setupPages()
    } finally {
      if (!(state as any)._docxBuffer) {
        isApplying = false
      }
    }
  }

  // ── State extraction ──
  function getState(): KindyDocumentState {
    if (!currentPkg) return createEmptyDocumentState()

    const state = createEmptyDocumentState()
    ;(state as any)._ooxmlPackage = currentPkg

    // Extract page geometry from layout
    if (editor && editor.tree.pages.length > 0) {
      const geo = editor.tree.pages[0].geometry
      const twipsToCm = (t: number) => Math.round((t / 567) * 1000) / 1000
      state.page = {
        size: {
          width: twipsToCm(geo.contentW + geo.marginLeft + geo.marginRight),
          height: twipsToCm(geo.contentH + geo.marginTop + geo.marginBottom),
        },
        orientation: geo.orientation,
        margin: {
          top: twipsToCm(geo.marginTop),
          right: twipsToCm(geo.marginRight),
          bottom: twipsToCm(geo.marginBottom),
          left: twipsToCm(geo.marginLeft),
        },
      }
    }

    return state
  }

  // ── Public handle ──
  const handle: EditorEngineHandle & {
    loadDocx?: (buf: Uint8Array) => Promise<void>
    exportDocx?: () => Blob | null
    undo?: () => boolean
    redo?: () => boolean
    canUndo?: () => boolean
    canRedo?: () => boolean
  } = {
    load(state: KindyDocumentState) {
      loadFromState(state)
    },
    loadDocx(buffer: Uint8Array) {
      return loadDocx(buffer)
    },
    exportDocx() {
      if (!currentPkg) return null
      const serializer = new OoxmlSerializer(currentPkg)
      return serializer.serialize()
    },
    getState,
    setReadOnly(value: boolean) {
      readOnly = value
      if (inputHandler && editor) {
        inputHandler.detach()
        inputHandler = new OoxmlInputHandler(editor.selection, painter, { readOnly: value })
        inputHandler.setTree(editor.tree)
        inputHandler.attach(surface)
        inputHandler.onEdit(handleEdit)
        inputHandler.onAfterInput(() => repaint())
      }
    },
    focus() {
      surface.focus()
    },
    destroy() {
      if (inputHandler) {
        inputHandler.detach()
        inputHandler = null
      }
      listeners.clear()
      surface.remove()
    },
    onChange(listener: (state: KindyDocumentState) => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    // Undo/Redo exposed for toolbar integration
    undo() { return editor?.undo() ?? false },
    redo() { return editor?.redo() ?? false },
    canUndo() { return editor?.canUndo ?? false },
    canRedo() { return editor?.canRedo ?? false },
  }

  return handle as EditorEngineHandle
}

// ─── Fallback converter ───────────────────────────────────────────────────────

function kindyStateToOoxmlPackage(state: KindyDocumentState): OoxmlPackage {
  return {
    document: {
      body: { children: [], sectPr: undefined },
    },
    styles: {
      docDefaults: {
        rPrDefault: {},
        pPrDefault: {},
      },
      styles: new Map(),
    },
    numbering: { abstractNums: new Map(), nums: new Map() },
    settings: {},
    fontTable: { fonts: new Map() },
    theme: null,
    headers: new Map(),
    footers: new Map(),
    comments: null,
    footnotes: null,
    endnotes: null,
    contentTypes: { defaults: new Map(), overrides: new Map() },
    relationships: [],
    media: new Map(),
  }
}
