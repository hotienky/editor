<template>
  <menus-button
    :text="t('view.locale')"
    ico="locale"
    menu-type="dropdown"
    huge
    :select-options="themes"
    @click="changeLocale"
  />
</template>

<script setup>
const setLocale = inject('setLocale')

const { locale } = useI18n()

const themes = computed(() => {
  return [
    {
      content: '🇻🇳 Tiếng Việt',
      value: 'vi-VN',
      active: locale.value === 'vi-VN',
    },
    {
      content: '🇨🇳 简体中文',
      value: 'zh-CN',
      active: locale.value === 'zh-CN',
    },
    {
      content: '🇱🇷 English',
      value: 'en-US',
      active: locale.value === 'en-US',
    },
    {
      content: '🇮🇹 Italiano',
      value: 'it-IT',
      active: locale.value === 'it-IT',
    },
    {
      content: '🇷🇺 Русский',
      value: 'ru-RU',
      active: locale.value === 'ru-RU',
    },
  ]
})

const changeLocale = ({ value }) => {
  if (value) {
    setLocale(value, false)
  }
}
</script>
