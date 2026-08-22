# UI Engine & Theme System

Kindy Editor sở hữu kiến trúc UI Engine tách biệt hoàn toàn giữa **Layout Shell**, **State Orchestrator**, và **Editor Viewport**.

---

## 1. Kiến trúc trang A4 và zoom

Kindy Editor dùng **ProseMirror DOM + HTML/CSS**, không vẽ nội dung bằng `canvas`.
Lựa chọn này giữ được con trỏ native, selection, IME tiếng Việt, accessibility,
comment, Track Changes và khả năng chỉnh sửa trực tiếp từng node.

Mỗi trang dọc A4 có hệ tọa độ logic cố định:

- Kích thước: `210 × 297 mm` (`21 × 29.7 cm`).
- Ở 96 CSS DPI: xấp xỉ `793.7 × 1122.5 px`.
- Lề, font, tab, bảng và ảnh luôn được layout trong hệ tọa độ 100% này.
- Zoom chỉ dùng `transform: scale(...)` trên toàn bộ bề mặt trang.
- `kindy-page-scale-shell` giữ chỗ theo kích thước sau zoom để thanh cuộn hoạt động đúng.
- Pagination đo `offsetHeight` logic trước transform nên số trang không thay đổi khi zoom.

```text
Scroll viewport
  └─ Page scale shell (kích thước hiển thị = A4 × zoom)
       └─ A4 logical surface (210 × 297 mm, luôn layout ở 100%)
            ├─ Header overlay
            ├─ ProseMirror editable DOM
            ├─ Page-break decorations
            └─ Footer overlay
```

Không được nhân zoom riêng vào chiều rộng trang, lề hoặc padding vì cách đó làm
văn bản reflow và thay đổi số dòng. Canvas chỉ phù hợp cho preview tĩnh; không
được dùng làm bề mặt chỉnh sửa canonical của SDK.

---

## 2. Cấu trúc Layout 3 vùng (`KindyDocumentLibraryShell`)

Giao diện Workspace được chia làm 3 phân vùng độc lập:

1. **Explorer Sidebar (Trái)**: Cây thư mục, danh sách tài liệu, tìm kiếm, nút import và template.
2. **Main Workspace (Giữa)**: Thanh công cụ (Toolbar), bề mặt DOM phân trang A4 và thanh trạng thái (Statusbar).
3. **Version History Panel (Phải)**: Lịch sử các bản lưu (Revisions/Versions), so sánh, xem trước chế độ chỉ đọc và khôi phục.

```text
┌─────────────────┬──────────────────────────────────┬─────────────────┐
│ KindyExplorer   │ KindyEditor & A4 DOM Viewport    │ VersionPanel    │
│ (Folder/Files)  │ (Pagination, Toolbar, Ruler)     │ (History/Diff)  │
└─────────────────┴──────────────────────────────────┴─────────────────┘
```

---

## 3. Preset Hợp đồng mặc định (Contract Preset)

Để tối ưu cho nghiệp vụ văn bản pháp lý, hành chính và hợp đồng, `KindyDocumentLibrary` mặc định kích hoạt cấu hình `CONTRACT_EDITOR_OPTIONS`:

- **Toolbar compact 1 hàng**: Chỉ bao gồm các nhóm công cụ thiết yếu: *Định dạng văn bản*, *Chèn ảnh/ngắt trang*, *Bảng biểu*, *Căn lề & Ruler*, *Xuất file*.
- **Loại bỏ công cụ thừa**: Không hiển thị Web mode, Mermaid diagram, nhúng video web, hoặc chuyển đổi số tiếng Trung.
- **Thanh trạng thái tinh gọn**: Chỉ hiển thị `Trang X / Y`, số lượng từ/ký tự, tỉ lệ Zoom và bộ chọn ngôn ngữ.

### Tùy biến Preset:

```vue
<KindyDocumentLibrary
  :adapter="adapter"
  :editor-options="{
    toolbar: { menus: ['base', 'insert', 'table', 'page', 'export'] },
    statusbar: { showLocale: true, showWordCount: true },
  }"
/>
```

---

## 4. Tùy biến Theme (CSS Variables)

Kindy Editor hỗ trợ ghi đè trực tiếp các biến giao diện thông qua prop `:theme` hoặc CSS toàn cục:

```vue
<template>
  <KindyDocumentLibrary
    :adapter="adapter"
    :theme="{
      '--kindy-library-primary': '#0b74de',
      '--kindy-library-bg': '#f8fafc',
      '--kindy-library-sidebar-bg': '#ffffff',
      '--kindy-library-border': '#e2e8f0',
      '--kindy-library-radius': '8px',
    }"
  />
</template>
```

---

## 5. Đa ngôn ngữ (i18n & Localization)

SDK hỗ trợ sẵn các gói ngôn ngữ:
- `vi-VN`: Tiếng Việt (Mặc định)
- `en-US`: English
- `zh-CN`: Tiếng Trung giản thể

Bạn có thể truyền prop `locale="vi-VN"` và tùy biến các nhãn hiển thị qua prop `:messages`:

```vue
<KindyDocumentLibrary
  :adapter="adapter"
  locale="vi-VN"
  :messages="{
    save: 'Lưu ngay',
    exportDocx: 'Tải file Word (.docx)',
    unsavedChanges: 'Bạn có thay đổi chưa lưu!',
  }"
/>
```
