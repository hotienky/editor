export function useState(key, options) {
  const storageKey = `umo-editor:${options?.value?.editorKey ?? 'default'}:${key}`

  if (key === 'document') {
    return useStorage(storageKey, options?.value?.document ?? {})
  }
  if (key === 'recent') {
    return useStorage(storageKey, {
      fonts: [],
      colors: [],
    })
  }
  if (key === 'print') {
    return useStorage(storageKey, {
      singleColumn: true,
      showPageNumber: true,
    })
  }
  if (key === 'toolbar') {
    return useStorage(storageKey, {
      mode: options?.value?.toolbar?.defaultMode ?? 'classic',
      show: true,
    })
  }
  throw new Error('[useStorage]', { cause: 'Key is not valid' })
}
