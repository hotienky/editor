# Chỉnh sửa bảng

Kindy Editor xử lý bảng bằng mô hình semantic, không suy đoán thao tác từ vị trí con trỏ. Một target luôn gồm:

```text
TablePath (body/header/footer + ancestor table/cell IDs)
  └─ TableSelection (cell | row | column | table)
       └─ TableTargetResolver
            └─ TableGridMutationService
                 └─ validateTableGrid trước và sau mutation
```

Vì vậy thao tác chèn/xóa hàng hoặc cột, merge/unmerge và undo đều đi qua cùng một đường xử lý. `rowSpan`/`colSpan`, ID, content, format ô, row properties và `colFractions` của phần còn sống được giữ lại.

## Thao tác trên giao diện

- Kéo qua nhiều ô để tạo cell selection hình chữ nhật.
- Di chuột vào một ô để hiện rail thao tác nhanh ngoài mép bảng, căn giữa theo hàng đang trỏ: **chèn hàng phía dưới**, **chèn cột bên phải** và nút **…** mở toàn bộ thao tác bảng. Rail là DOM overlay kích thước màn hình, không che nội dung và không bị phóng/co theo zoom của trang canvas.
- Bấm dải mỏng phía trái bảng để chọn cả hàng.
- Bấm dải mỏng phía trên bảng để chọn cả cột.
- Bấm góc trên-trái của bảng để chọn cả bảng.
- Chuột phải tại cả phần chữ, khoảng đệm hoặc ô trống đều nhận đúng ô đích và mở menu bảng. Dùng tab **Bảng**, thanh hover hoặc menu chuột phải để chèn/xóa, merge/unmerge.
- Nút không hợp lệ sẽ bị disable. Ví dụ, **Merge** bị tắt khi chỉ có một ô; **Unmerge** bị tắt khi ô không có span.

`Delete`/`Backspace` khi đang chọn nội dung trong ô chỉ xóa **nội dung ô**. Đây là thao tác nhập liệu thông thường, không xóa cấu trúc bảng. Muốn xóa cấu trúc, chọn ô/hàng/cột/bảng rồi dùng đúng lệnh **Xóa hàng**, **Xóa cột** hoặc **Xóa bảng** trong tab **Bảng** hay menu chuột phải.

Mọi structural command là một transaction duy nhất, nên Undo/Redo không để lại bảng ở trạng thái trung gian.

## API tích hợp

```ts
import type { TablePath, TableSelection } from "kindy-editor";

const path: TablePath = {
  story: { kind: "body" },
  ancestors: [],
  tableId: "table-42",
};

const selection: TableSelection = {
  kind: "row",
  table: path,
  from: 1,
  to: 2,
};

await editor.setTableSelection(selection);

if (editor.canExecuteTableAction("deleteRow")) {
  await editor.executeTableAction("deleteRow");
}
```

Các action công khai:

```ts
type TableAction =
  | "insertRowAbove" | "insertRowBelow"
  | "insertColumnLeft" | "insertColumnRight"
  | "deleteRow" | "deleteColumn" | "deleteTable"
  | "mergeCells" | "unmergeCell";
```

`getTableSelection()` trả selection semantic hiện tại. `setTableSelection(null)` xóa selection bảng.

## Invariant và dữ liệu lỗi

`validateTableGrid()` phát hiện các lỗi mà renderer tolerant trước đây có thể che khuất:

- `rowSpan`/`colSpan` không hợp lệ;
- span vượt biên;
- hai owner cell chồng cùng grid slot;
- grid có ô trống không owner;
- cell ID trùng;
- số `colFractions` không khớp số cột.

Các bảng DOCX cũ chỉ bị lệch metadata cột (`colFractions`) hoặc thiếu grid slot do importer trước đây sẽ được sửa an toàn ngay trước structural mutation. Cơ chế repair chỉ:

- giữ nguyên cell, ID, content, span, style và row properties hiện có;
- chuẩn hóa độ rộng cột;
- bổ sung cell rỗng tại grid slot thực sự không có owner;
- validate lại toàn bộ grid trước khi commit transaction.

Các lỗi có nguy cơ mất dữ liệu như span vượt biên, owner cell chồng nhau, ID trùng hoặc span không hợp lệ vẫn bị từ chối. Khi đó nút structural action bị disable thay vì tự sửa âm thầm.

## Giới hạn hiện tại

`TablePath` đã resolve được nested table. Tuy nhiên shared operation log hiện vẫn định địa chỉ structural op top-level bằng `tableId`, nên structural action trên nested table đang bị disable an toàn. Text và render của nested table không bị thay đổi. Bước tiếp theo là path-based operation để bật mutation nested table mà không sửa nhầm outer table.

## Kiểm thử

Regression hiện bao phủ:

- insert row cắt ngang `rowSpan`;
- xóa owner row nhưng giữ content/ID ở hàng còn sống;
- xóa cột cắt qua `colSpan`;
- merge/unmerge 2D;
- semantic row selection và nested `TablePath`;
- hit-test dải chọn table/row/column;
- import bảng từ DOCX thật rồi thêm/xóa hàng, cột và cả bảng;
- repair bảng legacy bị lệch metadata/ragged row mà không mất content;
- 250 structural mutations hỗn hợp có seed cố định, validate invariant sau từng bước.
