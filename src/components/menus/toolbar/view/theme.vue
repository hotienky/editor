<template>
  <menus-button
    :text="t('view.theme')"
    ico="theme"
    menu-type="dropdown"
    huge
    :select-options="themes"
    @click="changeTheme"
  />
</template>

<script setup>
const options = inject('options')
const setTheme = inject('setTheme')

const themes = computed(() => {
  const theme = useStorage('umo-editor:theme', options.value.theme)
  return [
    {
      content: t('view.themeLight'),
      value: 'light',
      active: theme.value === 'light',
    },
    {
      content: t('view.themeDark'),
      value: 'dark',
      active: theme.value === 'dark',
    },
  ]
})

const changeTheme = ({ value }) => {
  if (value) {
    setTheme(value)
  }
}
</script>
