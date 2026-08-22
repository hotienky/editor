<template>
  <div class="kindy-docx-fragment">
    <div
      v-for="(paragraph, paragraphIndex) in paragraphs"
      :key="paragraphIndex"
      class="kindy-docx-fragment__paragraph"
      :class="{ 'is-tabbed': paragraph.segments.length > 1 }"
      :style="paragraph.style"
    >
      <span
        v-for="(segment, segmentIndex) in paragraph.segments"
        :key="segmentIndex"
        class="kindy-docx-fragment__segment"
      >
        <docx-inline
          v-for="(node, nodeIndex) in segment"
          :key="nodeIndex"
          :node="node"
        />
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h } from 'vue'

const props = defineProps({
  content: {
    type: Object,
    default: null,
  },
})

const textStyle = (marks = []) => {
  const style = marks.find((mark) => mark.type === 'textStyle')?.attrs || {}
  return {
    color: style.color,
    backgroundColor: style.backgroundColor,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
  }
}

const wrapMarks = (node, content) => {
  let value = content
  for (const mark of node.marks || []) {
    const tag = {
      bold: 'strong',
      italic: 'em',
      strike: 's',
      underline: 'u',
      subscript: 'sub',
      superscript: 'sup',
    }[mark.type]
    if (tag) value = h(tag, null, value)
  }
  return value
}

const DocxInline = defineComponent({
  name: 'DocxInline',
  props: { node: { type: Object, required: true } },
  setup(componentProps) {
    return () => {
      const {node} = componentProps
      if (node.type === 'hardBreak') return h('br')
      if (node.type === 'inlineImage' || node.type === 'image') {
        return h('img', {
          alt: node.attrs?.alt || '',
          src: node.attrs?.src || '',
          style: {
            height: node.attrs?.height ? `${node.attrs.height}px` : undefined,
            width: node.attrs?.width ? `${node.attrs.width}px` : undefined,
          },
        })
      }
      if (node.type !== 'text') return null
      return h('span', { style: textStyle(node.marks) }, wrapMarks(node, node.text || ''))
    }
  },
})

const hasContent = (nodes) => nodes.some((node) =>
  node.type === 'inlineImage'
  || node.type === 'image'
  || node.type === 'hardBreak'
  || (node.type === 'text' && node.text),
)

const splitSegments = (nodes = []) => {
  const segments = [[]]
  for (const node of nodes) {
    if (node.type === 'docxTab') segments.push([])
    else segments.at(-1).push(node)
  }
  return segments.filter(hasContent)
}

const paragraphStyle = (node) => {
  const margin = node.attrs?.margin || {}
  const layout = node.attrs?.docxLayout || {}
  return {
    lineHeight: node.attrs?.lineHeight || undefined,
    marginTop: margin.top ? `${margin.top}px` : undefined,
    marginBottom: margin.bottom ? `${margin.bottom}px` : undefined,
    marginLeft: layout.left ? `${layout.left}cm` : undefined,
    marginRight: layout.right ? `${layout.right}cm` : undefined,
    textAlign: node.attrs?.textAlign || undefined,
  }
}

const paragraphs = computed(() => (props.content?.content || [])
  .filter((node) => node.type === 'paragraph' || node.type === 'heading')
  .map((node) => ({
    segments: splitSegments(node.content),
    style: paragraphStyle(node),
  })))
</script>

<style scoped>
.kindy-docx-fragment {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
}

.kindy-docx-fragment__paragraph {
  min-height: 1em;
  white-space: pre-wrap;
}

.kindy-docx-fragment__paragraph.is-tabbed {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
}

.kindy-docx-fragment__segment {
  display: inline-block;
  white-space: nowrap;
}

.kindy-docx-fragment img {
  display: inline-block;
  object-fit: contain;
  vertical-align: middle;
}
</style>

