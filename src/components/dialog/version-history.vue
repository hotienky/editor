<template>
  <t-drawer
    v-model:visible="visible"
    header="Lịch sử phiên bản (Version History)"
    size="360px"
    :footer="false"
  >
    <div class="kindy-version-history">
      <div class="version-tip">
        <icon name="info-circle" />
        <span>Tất cả thay đổi đều được lưu tự động thành các bản ghi lịch sử.</span>
      </div>

      <t-timeline class="version-timeline">
        <t-timeline-item
          v-for="item in versions"
          :key="item.id"
          :label="item.timestamp"
        >
          <div class="version-item">
            <div class="version-author">
              <strong>{{ item.author }}</strong>
              <span class="version-tag" v-if="item.isCurrent">Hiện tại</span>
            </div>
            <div class="version-desc">{{ item.description }}</div>
            <t-button
              v-if="!item.isCurrent"
              variant="text"
              size="small"
              theme="primary"
              @click="restoreVersion(item)"
            >
              Khôi phục bản này
            </t-button>
          </div>
        </t-timeline-item>
      </t-timeline>
    </div>
  </t-drawer>
</template>

<script setup>
import { ref } from 'vue'

const visible = defineModel('visible', { type: Boolean, default: false })

const versions = ref([
  {
    id: 'v-3',
    timestamp: 'Hôm nay, 12:55',
    author: 'Nguyễn Văn A',
    description: 'Thêm tính năng Khối mẫu & Multi-Tab Document',
    isCurrent: true,
  },
  {
    id: 'v-2',
    timestamp: 'Hôm nay, 11:30',
    author: 'Nguyễn Văn A',
    description: 'Cập nhật định dạng Ngắt trang A4 chuẩn Google Docs',
    isCurrent: false,
  },
  {
    id: 'v-1',
    timestamp: 'Hôm qua, 17:20',
    author: 'Admin',
    description: 'Khởi tạo tài liệu',
    isCurrent: false,
  },
])

const restoreVersion = (item) => {
  versions.value.forEach((v) => (v.isCurrent = false))
  item.isCurrent = true
}
</script>

<style lang="less" scoped>
.kindy-version-history {
  padding: 8px 0;

  .version-tip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 6px;
    font-size: 12px;
    color: #0369a1;
    margin-bottom: 16px;
  }

  .version-timeline {
    padding-left: 4px;
  }

  .version-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 12px;

    .version-author {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;

      .version-tag {
        font-size: 10px;
        font-weight: 700;
        background: #16a34a;
        color: #ffffff;
        padding: 1px 6px;
        border-radius: 10px;
      }
    }

    .version-desc {
      font-size: 12px;
      color: #64748b;
    }
  }
}
</style>
