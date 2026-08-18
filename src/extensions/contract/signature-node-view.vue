<template>
  <node-view-wrapper
    class="kindy-signature-block-wrap"
    contenteditable="false"
  >
    <div class="signature-content">
      <node-view-content class="signature-line" />
      <div class="signature-meta">
        <div class="signature-party" v-if="attrs.partyName || selected">
          <input
            v-if="selected"
            v-model="partyName"
            class="signature-input"
            placeholder="Party name"
            @blur="updatePartyName"
            @keydown.enter="$event.target.blur()"
          />
          <span v-else class="signature-party-name">{{ attrs.partyName || 'Party Name' }}</span>
          <span v-if="attrs.partyTitle" class="signature-party-title">{{ attrs.partyTitle }}</span>
        </div>
        <div class="signature-date" v-if="attrs.signedDate">
          Date: {{ attrs.signedDate }}
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { ref, watch } from 'vue'

const props = defineProps(nodeViewProps)
const partyName = ref(props.node.attrs.partyName)

const updatePartyName = () => {
  props.updateAttributes({ partyName: partyName.value })
}

watch(
  () => props.node.attrs.partyName,
  (val) => { partyName.value = val },
)
</script>

<style lang="less">
.kindy-signature-block-wrap {
  margin: 24px 0;
  padding: 16px;
  border: 2px dashed #d0d5dd;
  border-radius: 6px;
  background: #fafbfc;

  .signature-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .signature-line {
    min-height: 40px;
    border-bottom: 2px solid #333;
    padding-bottom: 8px;
    color: #666;
    font-style: italic;
  }

  .signature-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 12px;
    color: #666;
  }

  .signature-party {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .signature-party-name {
    font-weight: 600;
    color: #333;
  }

  .signature-party-title {
    font-size: 11px;
    color: #999;
  }

  .signature-input {
    border: none;
    border-bottom: 1px solid #d0d5dd;
    padding: 2px 4px;
    font-size: 12px;
    font-weight: 600;
    outline: none;
    background: transparent;

    &:focus {
      border-bottom-color: var(--kindy-primary-color);
    }
  }

  .signature-date {
    font-style: italic;
  }
}

[theme-mode='dark'] {
  .kindy-signature-block-wrap {
    border-color: #444;
    background: #2a2a2a;

    .signature-line {
      border-bottom-color: #888;
      color: #aaa;
    }

    .signature-meta {
      color: #aaa;
    }

    .signature-party-name {
      color: #ddd;
    }

    .signature-input {
      border-bottom-color: #555;
      color: #ddd;

      &::placeholder {
        color: #777;
      }
    }
  }
}
</style>
