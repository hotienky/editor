import { ref } from 'vue'

export function usePopup() {
  const popupVisible = ref(false)

  const togglePopup = (visible) => {
    popupVisible.value = visible ?? !popupVisible.value
  }

  return { popupVisible, togglePopup }
}
