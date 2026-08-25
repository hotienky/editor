<template>
  <WordEditor ref="editor" :ooxmlNative="true" />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import WordEditor from './components/editor/WordEditor.vue'

const editor = ref(null)
defineExpose({ getEditor: () => editor.value })

onMounted(() => {
  if (new URLSearchParams(window.location.search).has('kindy-benchmark')) {
    window.__KINDY_CANVAS_BENCHMARK__ = editor.value
  }
})
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
