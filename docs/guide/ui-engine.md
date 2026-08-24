# UI Engine & Theme System

Kindy Editor sở hữu kiến trúc UI Engine tách biệt hoàn toàn giữa **Layout Shell**, **State Orchestrator**, và **Editor Viewport**.

---

## 1. Kiến trúc trang giấy và zoom

Kindy Editor dùng **ProseMirror DOM + HTML/CSS**, không vẽ nội dung bằng `canvas`.
Lựa chọn này giữ được con trỏ native, selection, IME tiếng Việt, accessibility,
comment, Track Changes và khả năng chỉnh sửa trực tiếp từng node.

Mỗi trang có hệ tọa độ logic cố định theo khổ giấy đã chọn. SDK có sẵn ISO
`A0`–`A6` (bao gồm A1, A2, A3, A4 và A5), B5, Letter, Legal và khổ tùy chỉnh.
Orientation chỉ hoán đổi chiều rộng/chiều cao, không thay đổi dữ liệu nội dung.

- Ví dụ A4: `210 × 297 mm` (`21 × 29.7 cm`), tương đương khoảng
  `793.7 × 1122.5 px` ở 96 CSS DPI.
- Lề, font, tab, bảng và ảnh luôn được layout trong hệ tọa độ 100% này.
- Zoom chỉ dùng `transform: scale(...)` trên toàn bộ bề mặt trang.
- `kindy-page-scale-shell` giữ chỗ theo tổng chiều cao vật lý của tất cả các
  tờ giấy sau zoom để thanh cuộn hoạt động đúng.
- Pagination đo `offsetHeight` logic trước transform nên số trang không thay đổi khi zoom.
- Mỗi page luôn đóng góp đủ một chiều cao tờ giấy; trang cuối không co theo content.
- Tổng surface là `sum(pageHeight) + sum(pageGap)`, kể cả tài liệu có section khác khổ.

```text
Scroll viewport
  └─ Page scale shell (kích thước hiển thị = paper geometry × zoom)
       └─ Logical paper surface (luôn layout ở 100%)
            ├─ Header overlay
            ├─ ProseMirror editable DOM
            ├─ Page-break decorations
            └─ Footer overlay
```

Không được nhân zoom riêng vào chiều rộng trang, lề hoặc padding vì cách đó làm
văn bản reflow và thay đổi số dòng. Canvas chỉ phù hợp cho preview tĩnh; không
được dùng làm bề mặt chỉnh sửa canonical của SDK.

### Chuẩn tài liệu và đơn vị hình học

ISO/IEC 29500 Office Open XML/WordprocessingML là chuẩn trao đổi và nghiệm thu
DOCX. ProseMirror JSON là projection có thể chỉnh sửa trong browser, không phải
chuẩn thay thế WordprocessingML. Mỗi thuộc tính thuộc compatibility profile phải
có mapping hai chiều rõ ràng với OOXML.

Các giá trị paragraph do ruler thay đổi (`left`, `right`, `firstLine`, `hanging`)
được lưu chuẩn bằng twip trong `docxLayout` (`leftTwip`, `rightTwip`,
`firstLineTwip`, `hangingTwip`). Centimet chỉ dùng để hiển thị trên UI; trạng thái
legacy dùng centimet vẫn được đọc để migration. Cách này tránh sai số tích lũy
trong chu trình import → sửa → export.

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

- **Menu + toolbar compact**: Một hàng menu `Định dạng / Chèn / Bảng / Trang`
  điều khiển thanh công cụ một hàng bên dưới; các action file nằm ở topbar của
  Document Library để không bỏ qua adapter/versioning.
- **Loại bỏ công cụ thừa**: Không hiển thị Web mode, Mermaid diagram, nhúng video web, hoặc chuyển đổi số tiếng Trung.
- **Thanh trạng thái tinh gọn**: Chỉ hiển thị `Trang X / Y`, số lượng từ/ký tự, tỉ lệ Zoom và bộ chọn ngôn ngữ.

### Quy tắc nhập liệu tương thích Word

| Phím | Transaction |
|---|---|
| `Enter` | Tách/tạo paragraph mới |
| `Shift + Enter` | Chèn `hardBreak` (`w:br`) trong cùng paragraph |
| `Ctrl + Enter` / `Cmd + Enter` | Chèn semantic `pageBreak` (`w:br w:type="page"`) |

Ruler đọc thuộc tính của paragraph tại con trỏ. Khi kéo, UI chỉ preview marker;
đến `mouseup` SDK tạo một ProseMirror transaction duy nhất trên toàn bộ paragraph
đang chọn. Vì vậy paragraph indent có undo/redo và đi qua DOCX serializer, thay
vì chỉ thay CSS. Lề trang được ghi vào `KindyPageState.margin` và kích hoạt
pagination lại; đây là document-state change, không phải khoảng trắng giả.

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
