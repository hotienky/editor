<template>
  <div class="kindy-canvas-view-container" ref="containerRef">
    <div class="kindy-canvas-host" ref="hostRef"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, inject } from 'vue'
import CanvasEditor, { EditorMode, PaperDirection } from '../../engines/canvas/core'
import type { IEditorData, IEditorOption, IElement } from '../../engines/canvas/core'

const props = withDefaults(
  defineProps<{
    modelValue?: IEditorData | IElement[] | string
    readOnly?: boolean
    pageMargin?: [number, number, number, number]
    paperDirection?: PaperDirection
    defaultFont?: string
    defaultSize?: number
  }>(),
  {
    readOnly: false,
    pageMargin: () => [80, 80, 80, 80],
    paperDirection: PaperDirection.VERTICAL,
    defaultFont: 'Times New Roman',
    defaultSize: 16
  }
)

const emits = defineEmits<{
  (e: 'update:modelValue', value: IEditorData): void
  (e: 'change', value: IEditorData): void
  (e: 'ready', editor: CanvasEditor): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const hostRef = ref<HTMLDivElement | null>(null)
let editorInstance: CanvasEditor | null = null

onMounted(() => {
  if (!hostRef.value) return

  const options: IEditorOption = {
    defaultFont: props.defaultFont,
    defaultSize: props.defaultSize,
    defaultRowMargin: 1.25,
    margins: props.pageMargin,
    paperDirection: props.paperDirection,
    mode: props.readOnly ? EditorMode.READONLY : EditorMode.EDIT
  }

  let initialData: IEditorData = {
    header: [],
    main: [],
    footer: []
  }

  if (props.modelValue) {
    if (typeof props.modelValue === 'string') {
      try {
        const parsed = JSON.parse(props.modelValue)
        initialData = Array.isArray(parsed) ? { header: [], main: parsed, footer: [] } : parsed
      } catch {
        initialData = {
          header: [],
          main: [{ value: props.modelValue }],
          footer: []
        }
      }
    } else if (Array.isArray(props.modelValue)) {
      initialData = { header: [], main: props.modelValue, footer: [] }
    } else if (typeof props.modelValue === 'object') {
      initialData = props.modelValue as IEditorData
    }
  }

  editorInstance = new CanvasEditor(hostRef.value, initialData, options)

  editorInstance.listener.contentChange = () => {
    if (!editorInstance) return
    const value = editorInstance.command.getValue()
    emits('update:modelValue', value)
    emits('change', value)
  }

  emits('ready', editorInstance)
})

watch(
  () => props.readOnly,
  (val) => {
    if (editorInstance) {
      editorInstance.command.executeMode(val ? EditorMode.READONLY : EditorMode.EDIT)
    }
  }
)

onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }
})

defineExpose({
  getEditor: () => editorInstance,
  getCommand: () => editorInstance?.command,
  getValue: () => editorInstance?.command.getValue(),
  setValue: (data: IEditorData | IElement[]) => {
    if (editorInstance) {
      if (Array.isArray(data)) {
        editorInstance.command.executeSetValue({ main: data })
      } else {
        editorInstance.command.executeSetValue(data)
      }
    }
  }
})
</script>

<style scoped>
.kindy-canvas-view-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: auto;
  background-color: #f3f4f6;
  display: flex;
  justify-content: center;
}

.kindy-canvas-host {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
