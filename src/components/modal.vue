<template>
  <component
    :is="
      h(
        Dialog,
        { placement: 'center', attach: container, ...$attrs, ref: changeRef },
        $slots,
      )
    "
  />
</template>

<script setup>
import { Dialog } from 'tdesign-vue-next'
import { h } from 'vue'

const container = inject('container', 'body')
const vm = getCurrentInstance()
const changeRef = (expose) => (vm.expose = expose)
</script>
