# Vue Editor Example

A complete editor built with Vue 3 and Open Document Platform.

## Project Structure

```
my-editor/
├── src/
│   ├── App.vue
│   ├── main.js
│   └── components/
│       ├── Editor.vue
│       ├── Toolbar.vue
│       └── StatusBar.vue
├── package.json
└── vite.config.js
```

## App.vue

```vue
<template>
  <EditorProvider :config="config">
    <div class="app">
      <EditorToolbar />
      <UMOEditor class="editor" />
      <StatusBar />
    </div>
  </EditorProvider>
</template>

<script setup>
import { EditorProvider, UMOEditor } from '@umo/vue'
import EditorToolbar from './components/Toolbar.vue'
import StatusBar from './components/StatusBar.vue'

const config = {
  locale: 'vi-VN',
  page: {
    size: { width: 21, height: 29.7 },
    margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
  },
}
</script>

<style>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.editor {
  flex: 1;
  overflow: auto;
}
</style>
```

## components/Toolbar.vue

```vue
<template>
  <div class="toolbar">
    <button @click="insertHeading(1)">H1</button>
    <button @click="insertHeading(2)">H2</button>
    <button @click="insertHeading(3)">H3</button>
    <span class="separator"></span>
    <button @click="toggleBold" :class="{ active: isBold }">B</button>
    <button @click="toggleItalic" :class="{ active: isItalic }">I</button>
    <button @click="toggleUnderline" :class="{ active: isUnderline }">U</button>
    <span class="separator"></span>
    <button @click="insertList('bullet')">• List</button>
    <button @click="insertList('ordered')">1. List</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditor, useDocument } from '@umo/vue'

const { document, updateDocument } = useEditor()
const { insertText } = useDocument()

const isBold = computed(() => document.value?.isActive('bold'))
const isItalic = computed(() => document.value?.isActive('italic'))
const isUnderline = computed(() => document.value?.isActive('underline'))

const insertHeading = (level) => {
  updateDocument({
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text: 'New Heading' }],
  })
}

const toggleBold = () => {
  document.value?.commands.toggleBold()
}

const toggleItalic = () => {
  document.value?.commands.toggleItalic()
}

const toggleUnderline = () => {
  document.value?.commands.toggleUnderline()
}

const insertList = (type) => {
  updateDocument({
    type: type === 'bullet' ? 'bulletList' : 'orderedList',
    content: [
      { type: 'listItem', content: [{ type: 'text', text: 'Item 1' }] },
    ],
  })
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

button {
  padding: 5px 10px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
}

button:hover {
  background: #e0e0e0;
}

button.active {
  background: #007bff;
  color: white;
}

.separator {
  width: 1px;
  height: 20px;
  background: #ccc;
  margin: 0 5px;
}
</style>
```

## components/StatusBar.vue

```vue
<template>
  <div class="status-bar">
    <span>Words: {{ wordCount }}</span>
    <span>Characters: {{ charCount }}</span>
    <span>Page {{ currentPage }} of {{ totalPages }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDocument, useLayout } from '@umo/vue'

const { wordCount, charCount } = useDocument()
const { totalPages } = useLayout()

const currentPage = computed(() => 1)
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 5px 10px;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
  font-size: 12px;
  color: #666;
}
</style>
```

## main.js

```javascript
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')
```

## vite.config.js

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@umo/document': '@umo/document/src',
      '@umo/layout': '@umo/layout/src',
      '@umo/render': '@umo/render/src',
      '@umo/vue': '@umo/vue/src',
    },
  },
})
```

## package.json

```json
{
  "name": "my-editor",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vue": "^3.5.29",
    "@umo/document": "*",
    "@umo/layout": "*",
    "@umo/render": "*",
    "@umo/vue": "*"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.4",
    "vite": "^7.3.1"
  }
}
```
