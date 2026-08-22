<template>
  <menus-button
    ico="code"
    text="Building Blocks"
    menu-type="popup"
    :popup-props="{
      attach: container,
    }"
  >
    <template #content>
      <div class="kindy-building-blocks-menu">
        <div class="menu-section-title">CODE BUILDING BLOCKS</div>
        <t-dropdown-menu>
          <t-dropdown-item @click="insertCodeBlock('python')">
            <icon name="code" /> Python Code Block
          </t-dropdown-item>
          <t-dropdown-item @click="insertCodeBlock('javascript')">
            <icon name="code" /> JavaScript / TypeScript
          </t-dropdown-item>
          <t-dropdown-item @click="insertCodeBlock('java')">
            <icon name="code" /> Java / C#
          </t-dropdown-item>

          <t-dropdown-item @click="insertCodeBlock('cpp')">
            <icon name="code" /> C / C++
          </t-dropdown-item>
          <t-dropdown-item @click="insertCodeBlock('go')">
            <icon name="code" /> Go / Rust
          </t-dropdown-item>
          <t-dropdown-item @click="insert1x1CodeTable">
            <icon name="table" /> 1x1 Monospace Code Box
          </t-dropdown-item>
        </t-dropdown-menu>

        <div class="menu-section-title">DOCUMENT TEMPLATES</div>
        <t-dropdown-menu>
          <t-dropdown-item @click="insertMeetingNotes">
            <icon name="file" /> Meeting Notes
          </t-dropdown-item>
          <t-dropdown-item @click="insertProductSpec">
            <icon name="file" /> Product Spec
          </t-dropdown-item>
        </t-dropdown-menu>
      </div>
    </template>
  </menus-button>
</template>

<script setup>
import { inject } from 'vue'

const container = inject('container')
const editor = inject('editor')

const insertCodeBlock = (language) => {
  if (!editor.value) return
  editor.value.chain().focus().setCodeBlock({ language }).run()
}

const insert1x1CodeTable = () => {
  if (!editor.value) return
  editor.value
    .chain()
    .focus()
    .insertTable({ rows: 1, cols: 1, withHeaderRow: false })
    .run()
}

const insertMeetingNotes = () => {
  if (!editor.value) return
  editor.value
    .chain()
    .focus()
    .insertContent(`
      <h2>📝 Biên bản cuộc họp (Meeting Notes)</h2>
      <p><strong>Ngày:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
      <p><strong>Thành phần tham dự:</strong> Team Engineering, Product Manager</p>
      <hr />
      <h3>1. Mục tiêu cuộc họp</h3>
      <ul><li>Thảo luận kế hoạch triển khai tính năng mới.</li></ul>
      <h3>2. Quyết định chính</h3>
      <ul><li>Duyệt kế hoạch kiến trúc và giao diện.</li></ul>
    `)
    .run()
}

const insertProductSpec = () => {
  if (!editor.value) return
  editor.value
    .chain()
    .focus()
    .insertContent(`
      <h2>🚀 Mô tả tính năng Sản phẩm (Product Spec)</h2>
      <p><strong>Tên tính năng:</strong> Google Docs Building Blocks & Multi-Tab</p>
      <p><strong>Trạng thái:</strong> Đang phát triển</p>
      <hr />
      <h3>Yêu cầu chức năng</h3>
      <ol>
        <li>Hỗ trợ quản lý nhiều Tab trong cùng 1 file.</li>
        <li>Bổ sung Building Blocks mã nguồn và mẫu tài liệu.</li>
      </ol>
    `)
    .run()
}
</script>

<style lang="less" scoped>
.kindy-building-blocks-menu {
  padding: 6px;
  min-width: 220px;

  .menu-section-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #94a3b8;
    padding: 6px 12px 2px;
  }
}
</style>
