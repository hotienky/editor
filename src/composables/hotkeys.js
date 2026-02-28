import hotkeys from 'hotkeys-js'

export function useHotkeys(keys, onTrigger) {
  hotkeys.filter = () => true
  hotkeys(keys, (e) => {
    e.preventDefault()
    onTrigger()
    return false
  })
}

export function removeAllHotkeys() {
  hotkeys.unbind()
}
