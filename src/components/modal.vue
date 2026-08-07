<template>
  <component
    :is="
      h(
        Dialog,
        {
          placement: 'center',
          attach: 'body',
          confirmBtn: t('dialog.confirm'),
          cancelBtn: t('dialog.cancel'),
          ...$attrs,
          ref: changeRef,
        },
        $slots,
      )
    "
  />
</template>

<script setup>
import { Dialog } from 'tdesign-vue-next'
import { h } from 'vue'

const container = inject('container', 'body')
const { t } = useI18n()
const vm = getCurrentInstance()
const changeRef = (expose) => (vm.expose = expose)
</script>
