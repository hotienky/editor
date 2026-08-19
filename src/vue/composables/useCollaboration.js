/**
 * useCollaboration Composable
 *
 * Vue composable for collaboration operations.
 *
 * Architecture: Framework Adapter — Vue
 */

import { ref, computed } from 'vue'

export function useCollaboration(config = {}) {
  const isConnected = ref(false)
  const users = ref([])
  const cursors = ref([])

  // ─── Operations ──────────────────────────────────────────────────────

  const connect = (docName, wsUrl, user) => {
    console.log('Connecting to:', docName, wsUrl)
    isConnected.value = true
  }

  const disconnect = () => {
    console.log('Disconnecting')
    isConnected.value = false
    users.value = []
    cursors.value = []
  }

  const setCursor = (cursor) => {
    console.log('Setting cursor:', cursor)
  }

  // ─── Computed ────────────────────────────────────────────────────────

  const userCount = computed(() => users.value.length)

  return {
    isConnected,
    users,
    cursors,
    userCount,
    connect,
    disconnect,
    setCursor,
  }
}

export default useCollaboration
