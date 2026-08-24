<template>
  <div class="kindy-editor-toolbar">
    <div class="kindy-toolbar-section">
      <!-- File Operations -->
      <ToolbarGroup label="File">
        <ToolbarButton icon="📄" label="New" @click="handleNew" />
        <ToolbarButton icon="📂" label="Open" @click="handleOpen" />
        <ToolbarButton icon="💾" label="Save" @click="handleSave" />
      </ToolbarGroup>

      <!-- Edit Operations -->
      <ToolbarGroup label="Edit">
        <ToolbarButton icon="↩️" label="Undo" :disabled="!canUndo" @click="handleUndo" />
        <ToolbarButton icon="↪️" label="Redo" :disabled="!canRedo" @click="handleRedo" />
      </ToolbarGroup>

      <!-- Text Formatting -->
      <ToolbarGroup label="Format">
        <ToolbarButton
          icon="B"
          label="Bold"
          :active="isBold"
          @click="toggleBold"
        />
        <ToolbarButton
          icon="I"
          label="Italic"
          :active="isItalic"
          @click="toggleItalic"
        />
        <ToolbarButton
          icon="U"
          label="Underline"
          :active="isUnderline"
          @click="toggleUnderline"
        />
        <ToolbarButton
          icon="S"
          label="Strikethrough"
          :active="isStrike"
          @click="toggleStrike"
        />
      </ToolbarGroup>

      <!-- Paragraph -->
      <ToolbarGroup label="Paragraph">
        <ToolbarButton
          icon="H1"
          label="Heading 1"
          :active="isHeading(1)"
          @click="setHeading(1)"
        />
        <ToolbarButton
          icon="H2"
          label="Heading 2"
          :active="isHeading(2)"
          @click="setHeading(2)"
        />
        <ToolbarButton
          icon="H3"
          label="Heading 3"
          :active="isHeading(3)"
          @click="setHeading(3)"
        />
      </ToolbarGroup>

      <!-- Lists -->
      <ToolbarGroup label="Lists">
        <ToolbarButton
          icon="•"
          label="Bullet List"
          :active="isBulletList"
          @click="toggleBulletList"
        />
        <ToolbarButton
          icon="1."
          label="Ordered List"
          :active="isOrderedList"
          @click="toggleOrderedList"
        />
        <ToolbarButton
          icon="☑"
          label="Task List"
          :active="isTaskList"
          @click="toggleTaskList"
        />
      </ToolbarGroup>

      <!-- Insert -->
      <ToolbarGroup label="Insert">
        <ToolbarButton icon="📷" label="Image" @click="handleInsertImage" />
        <ToolbarButton icon="📊" label="Table" @click="handleInsertTable" />
        <ToolbarButton icon="📎" label="File" @click="handleInsertFile" />
      </ToolbarGroup>
    </div>

    <!-- Page Options -->
    <div class="kindy-toolbar-right">
      <select v-model="pageFormat" class="kindy-select">
        <option value="a4">A4</option>
        <option value="letter">Letter</option>
        <option value="legal">Legal</option>
      </select>
      <select v-model="pageOrientation" class="kindy-select">
        <option value="portrait">Portrait</option>
        <option value="landscape">Landscape</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'

const props = defineProps({
  editor: {
    type: Object,
    default: null,
  },
  pageOptions: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:page-options'])

// ─── Injected ───────────────────────────────────────────────────────────────

const config = inject('config', {})

// ─── Computed ───────────────────────────────────────────────────────────────

const canUndo = computed(() => props.editor?.can().undo() ?? false)
const canRedo = computed(() => props.editor?.can().redo() ?? false)

const isBold = computed(() => props.editor?.isActive('bold') ?? false)
const isItalic = computed(() => props.editor?.isActive('italic') ?? false)
const isUnderline = computed(() => props.editor?.isActive('underline') ?? false)
const isStrike = computed(() => props.editor?.isActive('strike') ?? false)

const isBulletList = computed(() => props.editor?.isActive('bulletList') ?? false)
const isOrderedList = computed(() => props.editor?.isActive('orderedList') ?? false)
const isTaskList = computed(() => props.editor?.isActive('taskList') ?? false)

const pageFormat = computed({
  get: () => props.pageOptions.size?.format || 'a4',
  set: (value) => {
    const sizes = {
      a4: { width: 21, height: 29.7 },
      letter: { width: 21.59, height: 27.94 },
      legal: { width: 21.59, height: 35.56 },
    }
    emit('update:page-options', {
      ...props.pageOptions,
      size: { ...sizes[value], format: value },
    })
  },
})

const pageOrientation = computed({
  get: () => props.pageOptions.orientation || 'portrait',
  set: (value) => {
    emit('update:page-options', {
      ...props.pageOptions,
      orientation: value,
    })
  },
})

// ─── Methods ────────────────────────────────────────────────────────────────

const isHeading = (level) => {
  return props.editor?.isActive('heading', { level }) ?? false
}

const setHeading = (level) => {
  props.editor?.chain().focus().toggleHeading({ level }).run()
}

const toggleBold = () => {
  props.editor?.chain().focus().toggleBold().run()
}

const toggleItalic = () => {
  props.editor?.chain().focus().toggleItalic().run()
}

const toggleUnderline = () => {
  props.editor?.chain().focus().toggleUnderline().run()
}

const toggleStrike = () => {
  props.editor?.chain().focus().toggleStrike().run()
}

const toggleBulletList = () => {
  props.editor?.chain().focus().toggleBulletList().run()
}

const toggleOrderedList = () => {
  props.editor?.chain().focus().toggleOrderedList().run()
}

const toggleTaskList = () => {
  props.editor?.chain().focus().toggleTaskList().run()
}

const handleUndo = () => {
  props.editor?.chain().focus().undo().run()
}

const handleRedo = () => {
  props.editor?.chain().focus().redo().run()
}

const handleNew = () => {
  console.log('New document')
}

const handleOpen = () => {
  console.log('Open document')
}

const handleSave = () => {
  console.log('Save document')
}

const handleInsertImage = () => {
  console.log('Insert image')
}

const handleInsertTable = () => {
  props.editor?.chain().focus().insertTable({ rows: 3, cols: 3 }).run()
}

const handleInsertFile = () => {
  console.log('Insert file')
}
</script>

<style scoped>
.kindy-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.kindy-toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.kindy-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kindy-select {
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 12px;
  background-color: #fff;
}
</style>
