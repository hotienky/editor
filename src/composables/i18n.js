import { isRecord } from '@tool-belt/type-predicates'

import { i18n } from '../i18n'

const { global } = i18n

export const { t } = global

export const l = (data) => {
  if (typeof data === 'string') {
    return data
  }

  if (isRecord(data)) {
    const key = global.locale.value.replace('-', '_')
    return (
      data[key] ||
      data.vi_VN ||
      data.en_US ||
      data.zh_CN ||
      Object.values(data)[0] ||
      ''
    )
  }

  return ''
}

export const useI18n = () => global
