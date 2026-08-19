/**
 * useDocumentManager Composable
 *
 * Manages multiple document tabs.
 *
 * Architecture: Product Layer — Editor Client
 */

import { ref, computed } from 'vue'

export function useDocumentManager() {
  // ─── State ──────────────────────────────────────────────────────────

  const tabs = ref([
    {
      id: 'doc-1',
      title: 'Untitled Document',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ])

  const activeTabId = ref('doc-1')

  // ─── Computed ────────────────────────────────────────────────────────

  const currentDocument = computed(() => {
    return tabs.value.find((tab) => tab.id === activeTabId.value)
  })

  // ─── Operations ──────────────────────────────────────────────────────

  const selectTab = (tabId) => {
    activeTabId.value = tabId
  }

  const addTab = () => {
    const newTab = {
      id: `doc-${Date.now()}`,
      title: 'Untitled Document',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    tabs.value.push(newTab)
    activeTabId.value = newTab.id
  }

  const closeTab = (tabId) => {
    if (tabs.value.length <= 1) {
      return // Don't close last tab
    }

    const index = tabs.value.findIndex((tab) => tab.id === tabId)
    if (index !== -1) {
      tabs.value.splice(index, 1)

      // If closed tab was active, select another
      if (activeTabId.value === tabId) {
        activeTabId.value = tabs.value[Math.min(index, tabs.value.length - 1)].id
      }
    }
  }

  const setCurrentDocument = (data) => {
    const tab = tabs.value.find((t) => t.id === activeTabId.value)
    if (tab) {
      Object.assign(tab, data, { updatedAt: new Date().toISOString() })
    }
  }

  const renameTab = (tabId, title) => {
    const tab = tabs.value.find((t) => t.id === tabId)
    if (tab) {
      tab.title = title
      tab.updatedAt = new Date().toISOString()
    }
  }

  // ─── Return ──────────────────────────────────────────────────────────

  return {
    tabs,
    activeTabId,
    currentDocument,
    selectTab,
    addTab,
    closeTab,
    setCurrentDocument,
    renameTab,
  }
}

export default useDocumentManager
