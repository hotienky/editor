<template>
  <node-view-wrapper
    :id="attrs.id"
    ref="containerRef"
    class="kindy-node-view"
    :style="nodeStyle"
    @click.capture="clickCapture"
  >
    <div
      class="kindy-node-container hover-shadow kindy-select-outline kindy-node-file"
      :style="{
        width: attrs.fitWidth ? '100%' : supportPreview ? '260px' : '220px',
      }"
    >
      <div class="kindy-file-icon">
        <img :src="fileIcon" class="icon-file" />
      </div>
      <div class="kindy-file-info">
        <div
          class="kindy-file-name"
          :title="attrs.name || t('file.unknownName')"
        >
          {{ attrs.name || t('file.unknownName') }}
        </div>
        <div class="kindy-file-meta">
          {{ attrs.size ? prettyBytes(attrs.size) : t('file.unknownSize') }}
        </div>
      </div>
      <div class="kindy-file-action">
        <div
          v-if="!attrs.uploaded"
          class="kindy-action-item"
          :title="t('file.uploading')"
        >
          <icon class="loading" name="loading" />
        </div>
        <template v-else>
          <div
            v-if="supportPreview"
            class="kindy-action-item"
            :title="t('file.preview')"
            :data-preview-url="previewURL"
            :data-file-icon="fileIcon"
            :data-file-name="attrs.name"
            @click.stop="togglePreview"
          >
            <icon name="view" />
          </div>
          <a
            :href="attrs.url"
            :download="attrs.name"
            target="_blank"
            class="kindy-action-item"
            :title="t('file.download')"
          >
            <icon name="download" />
          </a>
        </template>
      </div>
    </div>
    <modal
      dialog-class-name="kindy-file-preview-modal"
      :visible="previewModal"
      :header="false"
      :footer="false"
      width="90vw"
    >
      <div class="kindy-file-preview-modal-header">
        <img :src="fileIcon" class="file-icon" />
        <h3>{{ attrs.name || t('file.unknownName') }}</h3>
        <t-button
          class="close-btn"
          size="small"
          shape="square"
          variant="text"
          @click="previewModal = false"
        >
          <icon name="close" size="18" />
        </t-button>
      </div>
      <div v-if="previewModal" class="kindy-file-preview-modal-body">
        <iframe :src="previewURL"></iframe>
      </div>
    </modal>
  </node-view-wrapper>
</template>

<script setup>
import { isAsyncFunction, isFunction } from '@tool-belt/type-predicates'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import prettyBytes from 'pretty-bytes'

import { safeNodePos, selectNodePos } from '@/utils/position'
import {
  fileNodeTypes,
  getFileExtname,
  getFileIcon,
  scheduleFileDelete,
  urlAttrs,
} from '@/utils/file'

import { updateAttributesWithoutHistory } from './'

const props = defineProps(nodeViewProps)
const attrs = $computed(() => props.node.attrs)
const { getPos } = props
const editor = inject('editor')
const options = inject('options')
const container = inject('container')
const uploadFileMap = inject('uploadFileMap')
const containerRef = ref(null)

const nodeStyle = $computed(() => {
  const { nodeAlign, margin } = attrs
  const marginTop =
    margin?.top && margin?.top !== '' ? `${margin.top}px` : undefined
  const marginBottom =
    margin?.bottom && margin?.bottom !== '' ? `${margin.bottom}px` : undefined
  return {
    'justify-content': nodeAlign,
    marginTop,
    marginBottom,
  }
})

const fileIcon = $computed(() => {
  return `${options.value.cdnUrl}/icons/file/${getFileIcon(attrs.name)}.svg`
})

let previewModal = $ref(false)
let previewURL = $ref(null)

const clickCapture = () => {
  selectNodePos(editor.value, getPos)
}

const getPreviewInfo = () => {
  const { preview } = options.value.file
  const extname = getFileExtname(attrs.name)
  const match = preview.find(
    (item) => extname && item.extensions.includes(extname),
  )
  return match
}
const setPreviewURL = () => {
  const match = getPreviewInfo()
  if (match?.url.includes('{url}')) {
    previewURL = match.url
      .replace(/{{url}}/g, encodeURIComponent(attrs.url))
      .replace(/{url}/g, attrs.url)
  }
}

onMounted(async () => {
  if (!attrs.uploaded && uploadFileMap.value.has(attrs.id)) {
    try {
      const file = uploadFileMap.value.get(attrs.id)
      const result = await options.value?.onFileUpload?.(file)
      const { id, url } = result
      if (containerRef.value) {
        const pos = safeNodePos(getPos, editor.value?.state)
        updateAttributesWithoutHistory(
          editor.value,
          { id, url, uploaded: true },
          pos,
        )
      }
      uploadFileMap.value.delete(attrs.id)
    } catch (e) {
      useMessage('error', { attach: container, content: e.message })
    }
  }
  setPreviewURL()
})

onBeforeUnmount(() => {
  scheduleFileDelete({
    editor,
    options,
    fileNode: {
      id: attrs.id,
      src: attrs.src,
      url: attrs.url,
      type: attrs.type,
      position: safeNodePos(getPos, editor.value?.state),
    },
    nodeTypes: fileNodeTypes,
    matchSourceAttrs: urlAttrs,
  })
})

const supportPreview = $computed(() => {
  const supportNodes = ['image', 'video', 'audio']
  return supportNodes.includes(attrs.previewType) || previewURL !== null
})
const togglePreview = () => {
  const match = getPreviewInfo(attrs.name)
  const onPreview = match?.onPreview
  if (isFunction(onPreview) || isAsyncFunction(onPreview)) {
    try {
      onPreview(attrs)
      return
    } catch {}
  }
  if (previewURL !== null) {
    previewModal = true
    return
  }
  editor.value.commands.insertContent({
    type: attrs.previewType,
    attrs: {
      ...attrs,
      src: attrs.url,
    },
  })
}
</script>

<style lang="less">
.kindy-node-view {
  .kindy-node-file {
    display: inline-flex;
    align-items: center;
    padding: 12px;
    outline: solid 1px var(--kindy-content-node-border);
    overflow: hidden;
    background-color: #fff;
    border-radius: var(--kindy-content-node-radius);

    .kindy-file-info {
      flex: 1;
      min-width: 0;
    }

    .kindy-file-icon {
      width: 32px;
      height: 32px;
      margin-right: 8px;
      .icon-file {
        width: 32px;
        display: block;
      }
    }

    .kindy-file-name {
      font-size: 12px;
      font-weight: 500;
      line-height: 1.2;
      text-overflow: ellipsis;
      overflow: hidden;
      word-break: break-all;
      white-space: nowrap;
      width: 100%;
      padding-right: 10px;
      box-sizing: border-box;
    }

    .kindy-file-meta {
      font-size: 12px;
      color: #999;
      line-height: 1;
      margin-top: 6px;
    }

    .kindy-file-action {
      display: flex;
      align-items: center;
      color: #999;
      gap: 5px;

      .kindy-action-item {
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 32px;
        width: 32px;
        background-color: #fff;
        box-sizing: border-box;
        cursor: pointer;
        border-radius: 50%;
        color: #999;

        &:hover {
          border: solid 1px var(--kindy-primary-color);
          color: var(--kindy-primary-color);
        }

        .loading {
          animation: turn 1s linear infinite;
        }
      }
    }
  }
}

.kindy-file-preview-modal {
  padding: 0 !important;
  overflow: hidden;
  .kindy-dialog,
  .t-dialog {
    &__header {
      display: none !important;
    }
    &__body {
      padding: 0 !important;
    }
  }
  &-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 15px;
    position: relative;
    .file-icon {
      height: 24px;
      display: block;
    }
    h3 {
      margin: 0;
      font-size: 18px;
      text-overflow: ellipsis;
      overflow: hidden;
      word-break: break-all;
      white-space: nowrap;
      width: calc(100% - 100px);
    }
    .close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
    }
  }
  &-body {
    iframe {
      display: block;
      width: 100%;
      height: calc(90vh - 164px);
      border: solid 1px var(--kindy-border-color-light);
      box-sizing: border-box;
    }
  }
}

@keyframes turn {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
