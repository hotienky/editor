export const useState = (key, options) => {
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
  if (key === 'toolbar') {
    return useStorage(storageKey, {
      mode: options?.value?.toolbar?.defaultMode ?? 'classic',
      show: true,
    })
  }
  if (key === 'theme') {
    return useStorage(storageKey, 'light')
  }
  if (key === 'skin') {
    return useStorage(storageKey, 'default')
  }
  throw new Error('[useStorage]', { cause: 'Key is not valid' })
}
