import { createI18n } from 'vue-i18n'

import en_US from './locales/en-US.json'
import it_IT from './locales/it-IT.json'
import ru_RU from './locales/ru-RU.json'
import vi_VN from './locales/vi-VN.json'
import zh_CN from './locales/zh-CN.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'vi-VN',
  fallbackLocale: {
    'it-IT': ['en-US', 'vi-VN'],
    'ru-RU': ['en-US', 'vi-VN'],
    default: ['vi-VN', 'en-US'],
  },
  warnHtmlMessage: false,
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    'en-US': en_US,
    'it-IT': it_IT,
    'ru-RU': ru_RU,
    'zh-CN': zh_CN,
    'vi-VN': vi_VN,
  },
})
