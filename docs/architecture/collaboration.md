# Cộng tác Realtime (Realtime Collaboration)

Kindy Editor hỗ trợ tính năng nhiều người cùng chỉnh sửa một tài liệu theo thời gian thực (Realtime Collaborative Editing) dựa trên thư viện **Yjs** và **ProseMirror Collaboration**.

---

## 1. Cơ chế hoạt động với Yjs

Kindy Editor chuyển đổi cấu trúc tài liệu sang cấu trúc CRDT (Conflict-free Replicated Data Type) của Yjs:

```text
[KindyEditor A] ──(Yjs Provider / WebSocket)──► [Yjs Server] ◄──(WebSocket)── [KindyEditor B]
```

- **Awareness & Presence**: Hiển thị con trỏ (cursor), vùng chọn (selection) và tên/màu sắc đại diện của từng người dùng đang cùng mở tài liệu.
- **Không xảy ra xung đột ký tự**: Nhờ thuật toán CRDT của Yjs, các thao tác gõ phím của nhiều người được hợp nhất tự động và tức thì.

---

## 2. Kết nối CollaborationAdapter

Để bật tính năng cộng tác, truyền prop `:collaboration` và `:user` vào `KindyDocumentLibrary`:

```vue
<template>
  <KindyDocumentLibrary
    :adapter="documentAdapter"
    :collaboration="collaborationAdapter"
    :user="{
      id: currentUser.id,
      name: currentUser.fullName,
      color: '#0b74de',
    }"
  />
</template>

<script setup lang="ts">
import { KindyDocumentLibrary, createRestDocumentAdapter } from 'kindy-editor'

const documentAdapter = createRestDocumentAdapter({ baseUrl: '/api/v1' })

// Collaboration Adapter tùy biến của hệ thống bạn
const collaborationAdapter = {
  connect: (documentId: string, ydoc: any) => {
    // Kết nối WebSocket đến y-websocket server của bạn
    const wsProvider = new WebsocketProvider('wss://collab.yourdomain.com', documentId, ydoc)
    return () => wsProvider.destroy()
  },
}
</script>
```
