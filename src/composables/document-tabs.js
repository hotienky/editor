import { ref } from 'vue'

const tabs = ref([
  { id: 'tab-1', title: 'Tài liệu 1', content: '' },
])
const activeTabId = ref('tab-1')
const isTabsVisible = ref(true)

export function useDocumentTabs(editor) {
  const addTab = (title = 'Tab mới') => {
    const newId = `tab-${Date.now()}`
    tabs.value.push({
      id: newId,
      title: `${title} ${tabs.value.length + 1}`,
      content: '',
    })
    switchTab(newId)
  }

  const removeTab = (id) => {
    if (tabs.value.length <= 1) return
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      tabs.value.splice(idx, 1)
      if (activeTabId.value === id) {
        activeTabId.value = tabs.value[Math.max(0, idx - 1)].id
      }
    }
  }

  const duplicateTab = (id) => {
    const target = tabs.value.find((t) => t.id === id)
    if (!target) return

    // Save current content if active
    if (activeTabId.value === id && editor?.value) {
      target.content = editor.value.getHTML()
    }

    const newId = `tab-${Date.now()}`
    const newTab = {
      id: newId,
      title: `${target.title} (Bản sao)`,
      content: target.content || '',
    }

    const idx = tabs.value.findIndex((t) => t.id === id)
    tabs.value.splice(idx + 1, 0, newTab)
    switchTab(newId)
  }

  const moveTab = (id, direction) => {
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= tabs.value.length) return

    const [item] = tabs.value.splice(idx, 1)
    tabs.value.splice(newIdx, 0, item)
  }

  const switchTab = (id) => {
    // Save current content
    const currentTab = tabs.value.find((t) => t.id === activeTabId.value)
    if (currentTab && editor?.value) {
      currentTab.content = editor.value.getHTML()
    }

    activeTabId.value = id

    // Load new content
    const nextTab = tabs.value.find((t) => t.id === id)
    if (nextTab && editor?.value) {
      editor.value.commands.setContent(nextTab.content || '')
    }
  }

  const renameTab = (id, newTitle) => {
    const tab = tabs.value.find((t) => t.id === id)
    if (tab && newTitle.trim()) {
      tab.title = newTitle.trim()
    }
  }

  const toggleTabsSidebar = () => {
    isTabsVisible.value = !isTabsVisible.value
  }

  return {
    tabs,
    activeTabId,
    isTabsVisible,
    addTab,
    removeTab,
    duplicateTab,
    moveTab,
    switchTab,
    renameTab,
    toggleTabsSidebar,
  }
}
