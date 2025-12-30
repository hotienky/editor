<template>
  <menus-button
    ico="image"
    :text="t('insert.image.text')"
    menu-type="dropdown"
    huge
    overlay-class-name="umo-image-dropdown"
  >
    <template #dropmenu>
      <t-dropdown-menu>
        <t-dropdown-item
          v-for="item in imageOptions"
          :key="item.value"
          :value="item.value"
          @click="insertImage(item.value)"
        >
          <div class="title">{{ item.title }}</div>
          <div class="description">
            {{ item.description }}
          </div>
        </t-dropdown-item>
      </t-dropdown-menu>
    </template>
  </menus-button>
</template>

<script setup>
const { popupVisible, togglePopup } = usePopup()

const container = inject('container')
const editor = inject('editor')
const uploadFileMap = inject('uploadFileMap')

const imageOptions = [
  {
    title: t('insert.image.block'),
    value: 'image',
    description: t('insert.image.blockdesc'),
  },
  {
    title: t('insert.image.inline'),
    value: 'inlineImage',
    description: t('insert.image.inlinedesc'),
  },
]

const insertImage = (type) => {
  editor.value
    ?.chain()
    .focus()
    .selectFiles(type, container.value, uploadFileMap.value)
    .run()
}
</script>
<style lang="less">
.umo-image-dropdown {
  .umo-dropdown__item-text {
    padding: 5px 5px;
  }
  .title {
    display: flex;
    align-items: center;
    font-size: 14px;
  }
  .description {
    color: var(--umo-text-color-light);
    white-space: normal;
    line-height: 1.4;
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}
</style>
