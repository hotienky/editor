<template>
  <node-view-wrapper class="kindy-clause-wrap" contenteditable="false">
    <div class="clause-header">
      <span class="clause-badge" :class="`category-${attrs.category}`">
        {{ categoryLabels[attrs.category] || attrs.category }}
      </span>
      <span class="clause-name">{{ attrs.clauseName }}</span>
    </div>
    <div class="clause-body">
      <node-view-content />
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const categoryLabels = {
  general: 'General',
  payment: 'Payment',
  liability: 'Liability',
  termination: 'Termination',
  ip: 'Intellectual Property',
  confidentiality: 'Confidentiality',
  dispute: 'Dispute Resolution',
  compliance: 'Compliance',
}
</script>

<style lang="less">
.kindy-clause-wrap {
  margin: 16px 0;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #3480f9;
  border-radius: 0 6px 6px 0;
  background: #f8fafc;

  .clause-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
    background: #f1f5f9;
  }

  .clause-badge {
    display: inline-flex;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &.category-general { background: #e2e8f0; color: #475569; }
    &.category-payment { background: #d1fae5; color: #065f46; }
    &.category-liability { background: #fee2e2; color: #991b1b; }
    &.category-termination { background: #fef3c7; color: #92400e; }
    &.category-ip { background: #ede9fe; color: #5b21b6; }
    &.category-confidentiality { background: #dbeafe; color: #1e40af; }
    &.category-dispute { background: #fce7f3; color: #9d174d; }
    &.category-compliance { background: #ccfbf1; color: #134e4a; }
  }

  .clause-name {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
  }

  .clause-body {
    padding: 12px 16px;
    font-size: 13px;
    line-height: 1.6;
    color: #475569;

    p {
      margin: 0 0 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

[theme-mode='dark'] {
  .kindy-clause-wrap {
    border-color: #444;
    background: #2a2a2a;

    .clause-header {
      border-bottom-color: #444;
      background: #333;
    }

    .clause-badge {
      &.category-general { background: #444; color: #aaa; }
      &.category-payment { background: #0d3d1a; color: #81c995; }
      &.category-liability { background: #3d1414; color: #f28b82; }
      &.category-termination { background: #3d2e0a; color: #fdd663; }
      &.category-ip { background: #2e1a4e; color: #c4a5f8; }
      &.category-confidentiality { background: #1a2e4e; color: #8ab4f8; }
      &.category-dispute { background: #3d1a2e; color: #f48fb1; }
      &.category-compliance { background: #0a3d3d; color: #80cbc4; }
    }

    .clause-name { color: #ddd; }
    .clause-body { color: #aaa; }
  }
}
</style>
