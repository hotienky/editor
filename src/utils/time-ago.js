import { useTimeAgoIntl } from '@vueuse/core'
import { useI18n } from '@/composables/i18n'

export const timeAgo = (date) => {
  const { locale } = useI18n()
  const time = useTimeAgoIntl(new Date(date), { locale: locale.value })
  return time.value.replace(/"/gi, '')
}
