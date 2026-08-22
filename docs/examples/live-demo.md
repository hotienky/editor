# Trải nghiệm Live Demo

Bạn có thể chạy thử trực tiếp `KindyDocumentLibrary` ngay trên máy cục bộ mà không cần cài đặt backend, nhờ vào `MemoryDocumentAdapter`.

---

## 1. Chạy Demo trên máy cục bộ

Trong thư mục repository, mở terminal và gõ:

```bash
# 1. Cài đặt dependencies (nếu chưa cài)
npm install

# 2. Khởi động môi trường dev
npm run dev
```

Sau khi server khởi động, mở trình duyệt tại địa chỉ:
**`http://localhost:9000/kindy-editor`** (hoặc port hiển thị trong console).

---

## 2. Mã nguồn mẫu Demo với Memory Adapter

`MemoryDocumentAdapter` sẽ lưu trữ toàn bộ tài liệu, thư mục và phiên bản trực tiếp trong bộ nhớ RAM của trình duyệt, rất thích hợp để tạo trang Showcase, Prototype hoặc viết Automation Test:

```vue
<template>
  <div style="height: 100vh; width: 100vw; display: flex; flex-direction: column;">
    <KindyDocumentLibrary
      ref="workspace"
      :adapter="adapter"
      :autosave="{ enabled: true, delay: 2000 }"
      locale="vi-VN"
      style="flex: 1;"
      @saved="onSaved"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { KindyDocumentLibrary, createMemoryDocumentAdapter } from 'kindy-editor'
import 'kindy-editor/style'

const workspace = ref()

// Khởi tạo Memory Adapter kèm dữ liệu mẫu ban đầu
const adapter = createMemoryDocumentAdapter()

function onSaved(result: any) {
  console.log('Saved to memory:', result)
}

function onError(err: any) {
  console.error('Demo error:', err)
}
</script>
```

---

## 3. Các tính năng bạn có thể thử nghiệm trong Demo

1. **Tạo tài liệu mới**: Bấm nút **+ Tạo mới** ở sidebar để tạo trang hợp đồng trống hoặc tạo từ mẫu.
2. **Import DOCX**: Bấm **Nhập DOCX** và chọn một file Word bất kỳ trên máy tính của bạn để xem Web Worker phân tích và chuyển đổi.
3. **Soạn thảo phân trang**: Gõ văn bản, chèn bảng, căn lề, chèn ngắt trang để thấy trang thứ 2, 3 tự động sinh ra theo chuẩn A4.
4. **Xem lịch sử & Khôi phục**: Mở panel **Lịch sử phiên bản** ở bên phải, bấm vào các mốc thời gian để xem trước snapshot và bấm **Khôi phục**.
5. **Xuất DOCX & In**: Bấm biểu tượng **Tải DOCX** để tải file Word thật, hoặc bấm **In / Xuất PDF** để mở hộp thoại in của trình duyệt.
