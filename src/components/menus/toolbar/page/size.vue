<template>
  <menus-button
    ico="page-size"
    :text="t('page.size.text')"
    menu-type="dropdown"
    overlay-class-name="kindy-page-size-dropdown"
  >
    <template #dropmenu>
      <t-dropdown-menu>
        <t-dropdown-item
          v-for="(item, index) in options.dicts?.pageSizes"
          :key="index"
          :value="index"
          :active="page.size?.width === item.width"
          :divider="
            options.dicts?.pageSizes &&
            options.dicts.pageSizes.length - 1 === index
          "
          :min-column-width="150"
          @click="page.size = item"
        >
          <div class="label" v-text="l(item.label)"></div>
          <div class="desc">
            {{ item.width + t('page.size.cm') }} ×
            {{ item.height + t('page.size.cm') }}
          </div>
        </t-dropdown-item>
        <t-dropdown-item @click="dialogVisible = true">
          <div class="label" v-text="t('page.size.custom')"></div>
        </t-dropdown-item>
      </t-dropdown-menu>
    </template>
    <page-options :visible="dialogVisible" @close="dialogVisible.value = false" />
  </menus-button>
</template>

<script setup>
import { ref, inject } from 'vue'

const page = inject('page')
const options = inject('options')
const dialogVisible = ref(false)
</script>

<style lang="less">
.kindy-page-size-dropdown {
  .kindy-dropdown__item {
    max-width: unset !important;
    &-text {
      padding: 3px;
      .label {
        font-size: 14px;
        color: var(--kindy-text-color);
      }
      .desc {
        color: var(--kindy-text-color-light);
        margin-top: -3px;
        text-transform: uppercase;
        font-size: 12px;
      }
    }
  }
}
</style>
