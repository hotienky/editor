import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next'

import { t } from '@/composables/i18n'

export const useAlert = (parmas) => {
  return DialogPlugin.alert({
    placement: 'center',
    ...parmas,
  })
}
export const useConfirm = (parmas) => {
  return DialogPlugin.confirm({
    placement: 'center',
    preventScrollThrough: false,
    cancelBtn: t('dialog.cancel'),
    ...parmas,
  })
}
export const useMessage = (type, parmas) => {
  const options = typeof parmas === 'string' ? { content: parmas } : parmas
  return MessagePlugin[type]?.(options)
}

export { DialogPlugin, MessagePlugin }
