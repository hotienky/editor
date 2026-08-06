<template>
  <t-dialog
    v-model:visible="visible"
    header="Tùy chọn tự động thay thế (Preferences)"
    width="520px"
    :footer="false"
  >
    <div class="kindy-preferences-dialog">
      <div class="pref-section">
        <h4>NGOẶC KÉP THÔNG MINH (SMART QUOTES)</h4>
        <t-checkbox v-model="smartQuotes">
          Bật Ngoặc kép thông minh (“” vs "")
        </t-checkbox>
        <p class="pref-tip">
          Tắt tùy chọn này khi lập trình để viết dấu ngoặc kép thẳng <code>""</code> không bị lỗi cú pháp code.
        </p>
      </div>

      <t-divider />

      <div class="pref-section">
        <h4>BẢNG KÝ TỰ TỰ ĐỘNG THAY THẾ (AUTO-SUBSTITUTIONS)</h4>
        <t-table
          :data="substitutionsData"
          :columns="columns"
          size="small"
          bordered
        />
      </div>
    </div>
  </t-dialog>
</template>

<script setup>
import { ref } from 'vue'

const visible = defineModel('visible', { type: Boolean, default: false })
const smartQuotes = ref(true)

const columns = [
  { colKey: 'shortcut', title: 'Phím tắt', width: '120px' },
  { colKey: 'replacement', title: 'Thay thế bằng', width: '120px' },
  { colKey: 'description', title: 'Mô tả' },
]

const substitutionsData = [
  { shortcut: '-->', replacement: '→', description: 'Mũi tên sang phải' },
  { shortcut: '<--', replacement: '←', description: 'Mũi tên sang trái' },
  { shortcut: '(c)', replacement: '©', description: 'Bản quyền Copyright' },
  { shortcut: '(r)', replacement: '®', description: 'Thương hiệu Registered' },
  { shortcut: '(tm)', replacement: '™', description: 'Nhãn hiệu Trademark' },
  { shortcut: '1/2', replacement: '½', description: 'Phân số một phần hai' },
  { shortcut: '1/4', replacement: '¼', description: 'Phân số một phần tư' },
  { shortcut: '3/4', replacement: '¾', description: 'Phân số ba phần tư' },
]
</script>

<style lang="less" scoped>
.kindy-preferences-dialog {
  padding: 8px 0;

  .pref-section {
    display: flex;
    flex-direction: column;
    gap: 8px;

    h4 {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #64748b;
      margin: 0;
    }

    .pref-tip {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0 0;

      code {
        background: #f1f5f9;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
      }
    }
  }
}
</style>
