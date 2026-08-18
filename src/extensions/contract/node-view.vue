<template>
  <node-view-wrapper as="span" class="kindy-contract-variable-wrap" contenteditable="false">
    <span
      class="kindy-contract-variable-tag"
      :class="{
        'is-required': attrs.required,
        'is-empty': !attrs.value,
        [`type-${attrs.type}`]: true,
      }"
      :title="`${attrs.label}${attrs.required ? ' (Required)' : ''}`"
      @click="openEdit"
    >
      <span class="variable-icon">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      </span>
      <span class="variable-label">{{ attrs.value || attrs.label }}</span>
    </span>
  </node-view-wrapper>
</template>

<script setup>
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { inject } from 'vue'

const props = defineProps(nodeViewProps)
const editor = inject('editor')

const openEdit = () => {
  const value = window.prompt(`Enter value for "${props.node.attrs.label}":`, props.node.attrs.value || '')
  if (value !== null) {
    props.updateAttributes({ value })
  }
}
</script>

<style lang="less">
.kindy-contract-variable-wrap {
  display: inline-flex;
  align-items: center;
  vertical-align: baseline;
}

.kindy-contract-variable-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.4;

  &.type-text {
    background: #e8f4fd;
    color: #1a73e8;
    border: 1px solid #c4e3f7;
  }

  &.type-date {
    background: #fef3e0;
    color: #e67700;
    border: 1px solid #fde0a8;
  }

  &.type-number,
  &.type-money {
    background: #e6f4ea;
    color: #1e8e3e;
    border: 1px solid #b7e1cd;
  }

  &.type-party {
    background: #fce8e6;
    color: #d93025;
    border: 1px solid #f5c6cb;
  }

  &.is-required {
    border-width: 2px;
    &::after {
      content: '*';
      color: #d93025;
      font-weight: 700;
      margin-left: 1px;
    }
  }

  &.is-empty {
    opacity: 0.6;
    font-style: italic;
  }

  &:hover {
    filter: brightness(0.95);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .variable-icon {
    display: flex;
    align-items: center;
    opacity: 0.7;
  }

  .variable-label {
    white-space: nowrap;
  }
}

[theme-mode='dark'] {
  .kindy-contract-variable-tag {
    &.type-text {
      background: #1a3a5c;
      color: #8ab4f8;
      border-color: #2d5a8a;
    }
    &.type-date {
      background: #3d2e0a;
      color: #fdd663;
      border-color: #5c4a1a;
    }
    &.type-number,
    &.type-money {
      background: #0d3d1a;
      color: #81c995;
      border-color: #1a5c2e;
    }
    &.type-party {
      background: #3d1414;
      color: #f28b82;
      border-color: #5c1a1a;
    }
  }
}
</style>
