import { createI18n } from 'vue-i18n'

import en_US from './locales/en-US.json'
import vi_VN from './locales/vi-VN.json'
import zh_CN from './locales/zh-CN.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'vi-VN',
  defaultLocale: 'vi-VN',
  warnHtmlMessage: false,
  messages: {
    'en-US': en_US,
    'zh-CN': zh_CN,
    'vi-VN': vi_VN,
  },
})
