<template>
  <t-dropdown
    placement="bottom-right"
    overlay-class-name="umo-block-menu-dropdown"
    trigger="click"
    :destroy-on-close="false"
    :popup-props="popupProps"
  >
    <menus-button
      class="umo-block-menu-button"
      :menu-active="menuActive"
      ico="block-menu"
      hide-text
      style="cursor: grab"
    />
    <t-dropdown-menu>
      <t-dropdown-item
        v-if="
          options.ai?.assistant?.enabled &&
          (editor?.isActive('paragraph') || editor?.isActive('heading'))
        "
        divider
      >
        <menus-button
          ico="assistant"
          :text="t('assistant.text')"
          :tooltip="false"
          @menu-click="openAssistant"
        />
      </t-dropdown-item>
      <t-dropdown-item class="umo-block-menu-group-name" disabled>
        {{ t('blockMenu.common') }}
      </t-dropdown-item>
      <t-dropdown-item>
        <menus-button
          ico="node-clear-format"
          :text="t('blockMenu.clearFormat')"
          :tooltip="false"
          @menu-click="clearTextFormatting"
        />
      </t-dropdown-item>
      <t-dropdown-item divider>
        <menus-button
          ico="node-duplicate"
          :text="t('blockMenu.duplicate')"
          :tooltip="false"
          @menu-click="duplicateNode"
        />
      </t-dropdown-item>
      <t-dropdown-item>
        <menus-button
          ico="node-copy"
          :text="t('blockMenu.copy')"
          :tooltip="false"
          @menu-click="copyNodeToClipboard"
        />
      </t-dropdown-item>
      <t-dropdown-item>
        <menus-button
          ico="node-cut"
          :text="t('blockMenu.cut')"
          :tooltip="false"
          @menu-click="cutNodeToClipboard"
        />
      </t-dropdown-item>
      <t-dropdown-item class="umo-delete-node">
        <menus-button
          ico="node-delete-2"
          :text="t('blockMenu.delete')"
          :tooltip="false"
          @menu-click="deleteNode"
        />
      </t-dropdown-item>
    </t-dropdown-menu>
  </t-dropdown>
</template>

<script setup>
const props = defineProps({
  node: {
    type: Object,
    default: null,
  },
  pos: {
    type: Number,
    default: null,
  },
})
const emits = defineEmits(['dropdown-visible'])

const container = inject('container')
const options = inject('options')
const editor = inject('editor')
const blockMenu = inject('blockMenu')
const assistant = inject('assistant')

let menuActive = $ref(false)

const popupProps = {
  attach: `${container} .umo-main-container`,
  popperOptions: {
    modifiers: [{ name: 'offset', options: { offset: [2, 0] } }],
  },
  onVisibleChange(visible) {
    blockMenu.value = visible
    menuActive = visible
    emits('dropdown-visible', visible)
  },
}

const openAssistant = () => {
  assistant.value = true
  editor.value?.commands.selectParentNode()
  editor.value?.commands.focus()
  const { from, to } = editor.value?.state.selection || {}
  editor.value?.commands.setTextSelection({ from: from || 0, to: to || 0 })
}

const clearTextFormatting = () => {
  editor.value
    ?.chain()
    .setNodeSelection(props.pos)
    .focus()
    .unsetAllMarks()
    .run()
}
const copyNodeToClipboard = () => {
  editor.value?.commands.setNodeSelection(props.pos)
  document.execCommand('copy')
}
const cutNodeToClipboard = () => {
  editor.value?.commands.setNodeSelection(props.pos)
  document.execCommand('cut')
}
const duplicateNode = () => {
  editor.value?.commands.insertContentAt(props.pos, props.node?.toJSON())
}
const deleteNode = () => {
  editor.value
    ?.chain()
    .setNodeSelection(props.pos)
    .focus()
    .deleteSelection()
    .run()
}
</script>
