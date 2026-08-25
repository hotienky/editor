import { mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onMounted } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import DocumentLibraryShell from '../../components/library/DocumentLibraryShell.vue'
import DocumentLibrary from '../../components/library/DocumentLibrary.vue'
import { createMemoryDocumentAdapter } from '../../core/adapters/memory'
import { createEmptyDocumentState } from '../../core/state'
import { i18n } from '../../i18n'
import {
  CONTRACT_EDITOR_OPTIONS,
  createContractEditorOptions,
} from '../contract'
import {
  DEFAULT_LIBRARY_THEME,
  createLibraryTheme,
  resolveLibraryMessages,
  resolveLibraryUi,
} from '../library'

describe('library UI contract', () => {
  it('ships a page-only editing preset without duplicated file or Chinese-specific tools', () => {
    expect(CONTRACT_EDITOR_OPTIONS.toolbar).toMatchObject({
      defaultMode: 'classic',
      allowModeSwitch: false,
      menus: ['base', 'insert', 'table', 'page'],
    })
    expect(CONTRACT_EDITOR_OPTIONS.toolbar.menus).not.toContain('export')
    expect(CONTRACT_EDITOR_OPTIONS.page.layouts).toEqual(['page'])
    expect(CONTRACT_EDITOR_OPTIONS.disableExtensions).toEqual(expect.arrayContaining([
      'web-page', 'layout-web', 'diagrams', 'mermaid', 'chinese-case', 'chinese-date',
    ]))

    const customized = createContractEditorOptions({ toolbar: { menus: ['base'] } })
    expect(customized.toolbar).toMatchObject({ defaultMode: 'classic', menus: ['base'] })
    expect(customized.statusbar.showPageStatus).toBe(true)
  })

  it('loads page labels for every supported locale without exposing raw i18n keys', () => {
    const previous = i18n.global.locale.value
    try {
      for (const locale of ['vi-VN', 'en-US', 'zh-CN', 'it-IT', 'ru-RU'] as const) {
        i18n.global.locale.value = locale
        expect(i18n.global.t('page.status', { current: 2, total: 7 })).not.toBe('page.status')
        expect(i18n.global.t('page.goTo')).not.toBe('page.goTo')
      }
    } finally {
      i18n.global.locale.value = previous
    }
  })

  it('resolves stable defaults without mutating shared objects', () => {
    const first = resolveLibraryUi({ explorerWidth: '360px' })
    const second = resolveLibraryUi()

    expect(first).toMatchObject({ density: 'comfortable', explorerWidth: '360px', showTopbar: true })
    expect(second.explorerWidth).toBe('280px')
  })

  it('uses Vietnamese messages and English fallback with overrides', () => {
    expect(resolveLibraryMessages('vi-VN').newDocument).toBe('Tạo mới')
    expect(resolveLibraryMessages('en-US').newDocument).toBe('New document')
    expect(resolveLibraryMessages('vi-VN', { newDocument: 'Soạn mới' }).newDocument).toBe('Soạn mới')
  })

  it('merges theme tokens without changing defaults', () => {
    const theme = createLibraryTheme({ '--kindy-library-primary': '#7c3aed' })

    expect(theme['--kindy-library-primary']).toBe('#7c3aed')
    expect(theme['--kindy-library-bg']).toBe(DEFAULT_LIBRARY_THEME['--kindy-library-bg'])
    expect(DEFAULT_LIBRARY_THEME['--kindy-library-primary']).not.toBe('#7c3aed')
  })

  it('renders shell regions and workspace content', async () => {
    const wrapper = mount(DocumentLibraryShell, {
      slots: {
        topbar: '<div>Toolbar</div>',
        default: '<main>Editor</main>',
      },
    })

    expect(wrapper.text()).toContain('Toolbar')
    expect(wrapper.text()).toContain('Editor')
  })

  it('connects and disconnects the host collaboration adapter with the editor lifecycle', async () => {
    const now = new Date().toISOString()
    const document = {
      id: 'doc-1', title: 'Hợp đồng', fileName: 'hop-dong.docx',
      currentRevisionId: 'rev-1', currentVersionId: 'version-1', createdAt: now, updatedAt: now,
    }
    const adapter = createMemoryDocumentAdapter({ documents: [{
      document,
      state: createEmptyDocumentState(),
      revisionId: 'rev-1',
      version: { id: 'version-1', documentId: 'doc-1', number: 1, revisionId: 'rev-1', reason: 'create', createdAt: now },
    }] })
    const disconnect = vi.fn()
    const connect = vi.fn(async () => ({ disconnect, getUsers: () => [{ name: 'Nguyễn A' }] }))
    const engine = { setEditable: vi.fn() }
    const EditorStub = defineComponent({
      emits: ['created'],
      setup(_props, { emit, expose }) {
        expose({
          setReadOnly: vi.fn(),
          useEditor: () => engine,
          getPage: () => ({ size: { width: 21, height: 29.7 }, orientation: 'portrait', margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 } }),
          getJSON: () => ({ type: 'doc', content: [{ type: 'paragraph' }] }),
        })
        onMounted(() => emit('created'))
        return () => h('div', { class: 'editor-stub' })
      },
    })
    const wrapper = shallowMount(DocumentLibrary, {
      props: { adapter, collaboration: { connect }, user: { id: 'user-1', name: 'Nguyễn A' } },
      global: {
        stubs: {
          DocumentLibraryShell,
          KindyEditor: EditorStub,
        },
      },
    })

    await wrapper.vm.openDocument(document)
    await nextTick()
    await vi.waitFor(() => expect(connect).toHaveBeenCalled())
    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ documentId: 'doc-1', revisionId: 'rev-1', editor: engine }))
    expect(wrapper.vm.getCollaborationUsers()).toEqual([{ name: 'Nguyễn A' }])
    wrapper.vm.closeDocument()
    expect(disconnect).toHaveBeenCalled()
  })
})
