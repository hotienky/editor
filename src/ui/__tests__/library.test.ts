import { mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onMounted } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import DocumentLibraryShell from '../../components/library/DocumentLibraryShell.vue'
import DocumentLibrary from '../../components/library/DocumentLibrary.vue'
import { createMemoryDocumentAdapter } from '../../core/adapters/memory'
import { createEmptyDocumentState } from '../../core/state'
import {
  DEFAULT_LIBRARY_THEME,
  createLibraryTheme,
  resolveLibraryMessages,
  resolveLibraryUi,
} from '../library'

describe('library UI contract', () => {
  it('resolves stable defaults without mutating shared objects', () => {
    const first = resolveLibraryUi({ explorerWidth: '360px' })
    const second = resolveLibraryUi()

    expect(first).toMatchObject({ density: 'comfortable', explorerWidth: '360px', showTopbar: true })
    expect(second.explorerWidth).toBe('300px')
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

  it('renders shell regions and delegates mobile panel closing', async () => {
    const wrapper = mount(DocumentLibraryShell, {
      props: { explorerOpen: true, versionsOpen: true },
      slots: {
        explorer: '<nav>Explorer</nav>',
        topbar: '<div>Toolbar</div>',
        default: '<main>Editor</main>',
        versions: '<aside>Versions</aside>',
      },
    })

    expect(wrapper.text()).toContain('Explorer')
    expect(wrapper.text()).toContain('Toolbar')
    expect(wrapper.text()).toContain('Editor')
    expect(wrapper.text()).toContain('Versions')
    expect(wrapper.classes()).toContain('has-explorer')
    expect(wrapper.classes()).toContain('has-versions')

    await wrapper.get('.kindy-library-shell__scrim').trigger('click')
    expect(wrapper.emitted('close-panels')).toHaveLength(1)
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
          KindyDocumentExplorer: true,
          KindyVersionPanel: true,
        },
      },
    })

    await wrapper.vm.openDocument(document)
    await nextTick()
    await vi.waitFor(() => expect(connect).toHaveBeenCalledOnce())
    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ documentId: 'doc-1', revisionId: 'rev-1', editor: engine }))
    expect(wrapper.vm.getCollaborationUsers()).toEqual([{ name: 'Nguyễn A' }])
    wrapper.vm.closeDocument()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
