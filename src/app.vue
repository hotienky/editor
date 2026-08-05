<template>
  <div class="examples">
    <div class="box">
      <kindy-editor ref="editorRef" v-bind="options"></kindy-editor>
    </div>
    <!-- <div class="box">
      <kindy-editor editor-key="testaaa" :toolbar="{ defaultMode: 'classic' }" />
    </div> -->
  </div>
</template>

<script setup>
import { shortId } from '@/utils/short-id'

const editorRef = $ref(null)
const remoteMentionUsers = [
  {
    id: 'remote-alice',
    label: 'Alice Nguyễn',
    bio: 'Người dùng thư mục từ xa',
    color: 'var(--kindy-primary-color)',
  },
  {
    id: 'remote-bob',
    label: 'Bob Trần',
    bio: 'Người dùng thư mục từ xa',
    color: 'var(--kindy-primary-color)',
  },
  {
    id: 'remote-charlie',
    label: 'Charlie Lê',
    bio: 'Người dùng thư mục từ xa',
    color: 'var(--kindy-primary-color)',
  },
  {
    id: 'remote-dora',
    label: 'Dora Phạm',
    bio: 'Người dùng thư mục từ xa',
    color: 'var(--kindy-primary-color)',
  },
]
const templates = [
  {
    title: 'Nhiệm vụ công việc',
    description: 'Mẫu nhiệm vụ công việc',
    content:
      '<h1>Nhiệm vụ công việc</h1><h3>Tên nhiệm vụ:</h3><p>[Mô tả ngắn gọn nhiệm vụ]</p><h3>Người thực hiện:</h3><p>[Họ và tên người thực hiện]</p><h3>Hạn hoàn thành:</h3><p>[Ngày cần hoàn thành]</p><h3>Chi tiết nhiệm vụ:</h3><ol><li>[Bước 1]</li><li>[Bước 2]</li><li>[Bước 3]...</li></ol><h3>Mục tiêu:</h3><p>[Mục tiêu cụ thể hoặc kết quả cần đạt được]</p><h3>Ghi chú:</h3><p>[Thông tin bổ sung hoặc lưu ý nếu có]</p>',
  },
  {
    title: 'Báo cáo tuần',
    description: 'Mẫu báo cáo công việc hàng tuần',
    content:
      '<h1>Báo cáo công việc tuần</h1><h2>Tổng kết tuần này</h2><hr /><h3>Công việc đã hoàn thành:</h3><ul><li>[Nhiệm vụ 1]: [Mô tả ngắn gọn nội dung và kết quả]</li><li>[Nhiệm vụ 2]: [Mô tả ngắn gọn nội dung và kết quả]</li><li>...</li></ul><h3>Công việc đang thực hiện:</h3><ul><li>[Nhiệm vụ 1]: [Mô tả tiến độ hiện tại và kế hoạch tiếp theo]</li><li>[Nhiệm vụ 2]: [Mô tả tiến độ hiện tại và kế hoạch tiếp theo]</li><li>...</li></ul><h3>Khó khăn & Thách thức:</h3><ul><li>[Vấn đề 1]: [Mô tả vấn đề gặp phải và giải pháp/đề xuất hỗ trợ]</li><li>[Vấn đề 2]: [Mô tả vấn đề gặp phải và giải pháp/đề xuất hỗ trợ]</li><li>...</li></ul><hr /><h2>Kế hoạch tuần tới</h2><h3>Công việc dự kiến triển khai:</h3><ul><li>[Nhiệm vụ 1]: [Mô tả ngắn gọn công việc dự kiến tuần tới]</li><li>[Nhiệm vụ 2]: [Mô tả ngắn gọn công việc dự kiến tuần tới]</li><li>...</li></ul><h3>Yêu cầu hỗ trợ & Tài nguyên:</h3><ul><li>[Tài nguyên 1]: [Mô tả tài nguyên hoặc hỗ trợ cần thiết]</li><li>[Tài nguyên 2]: [Mô tả tài nguyên hoặc hỗ trợ cần thiết]</li><li>...</li></ul>',
  },
]
const options = $ref({
  locale: 'vi-VN',
  toolbar: {
    // defaultMode: 'classic',
    // menus: ['base'],
  },
  document: {
    title: 'Văn bản mẫu',
    content: localStorage.getItem('document.content') || '<h1>Chào mừng bạn đến với Kindy Editor!</h1><p>Đây là trình soạn thảo văn bản hiện đại dựa trên Vue 3 và Tiptap 3, được hỗ trợ đầy đủ tiếng Việt.</p>',
    // structure: 'heading block*',
  },
  page: {
    layouts: ['page', 'web'],
    showBookmark: true,
  },
  templates,
  shareUrl: location.href || '',
  file: {
    // allowedMimeTypes: [
    //   'application/pdf',
    //   'image/svg+xml',
    //   'video/mp4',
    //   'audio/*',
    // ],
  },
  user: {
    id: 'kindyeditor',
    label: 'Kindy Editor',
    avatar: 'https://tdesign.gtimg.com/site/avatar.jpg',
  },
  users: [
    {
      id: 'kindydoc',
      label: 'Kindy Team',
      bio: 'Lập trình viên chính',
      avatar: 'https://s1.umodoc.com/images/favicon.png',
      color: 'var(--kindy-primary-color)',
    },
    {
      id: 'china-wangxu',
      label: 'wangxu',
      bio: 'Đóng góp quan trọng',
      color: 'var(--kindy-primary-color)',
    },
    {
      id: 'Cassielxd',
      label: 'Cassielxd',
      bio: 'Đóng góp quan trọng',
      color: 'var(--kindy-primary-color)',
    },
    { id: 'Goldziher', label: "Na'aman Hirschfeld" },
    { id: 'SerRashin', label: 'SerRashin' },
    { id: 'ChenErik', label: 'ChenErik' },
    { id: 'testuser', label: 'Người dùng thử nghiệm' },
  ],
  async onMentionSearch(query) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return remoteMentionUsers.filter((user) =>
      user.label.toLowerCase().includes(query.toLowerCase()),
    )
  },
  disableExtensions: [],
  async onSave(content, page, document) {
    // Lưu nội dung văn bản vào localStorage
    localStorage.setItem('document.content', content.html)
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('onSave', { content, page, document })
        resolve('Văn bản đã được lưu thành công')
      }, 2000)
    })
  },
  async onFileUpload(file) {
    if (!file) {
      throw new Error('Không tìm thấy file cần tải lên')
    }
    console.log('onUpload', file)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    return {
      id: shortId(),
      url: file.url || URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
    }
  },
  onFileDelete(id, url, type) {
    console.log(id, url, type)
  },
})
</script>

<style>
html,
body {
  padding: 0;
  margin: 0;
}
.examples {
  margin: 20px;
  display: flex;
  height: calc(100vh - 40px);
}
.box {
  border: solid 1px #ddd;
  box-sizing: border-box;
  position: relative;
  width: 100%;
  height: 100%;
}

html,
body {
  height: 100vh;
  overflow: hidden;
}
</style>
