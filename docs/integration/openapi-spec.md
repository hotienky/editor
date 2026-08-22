# OpenAPI 3.1 Specification Contract

Hệ thống Backend ứng dụng chủ cần triển khai các API theo đúng đặc tả kỹ thuật OpenAPI 3.1 dưới đây.

File đặc tả gốc có sẵn tại: [`openapi/document-api.yaml`](https://github.com/hotienky/editor/blob/main/openapi/document-api.yaml)

---

## Tóm tắt Schemas Dữ liệu

### 1. `KindyDocumentState`
```json
{
  "type": "object",
  "required": ["schemaVersion", "content", "page", "assets"],
  "properties": {
    "schemaVersion": { "type": "string", "enum": ["2.0"] },
    "content": { "type": "object", "description": "ProseMirror / Tiptap JSON Tree" },
    "page": {
      "type": "object",
      "required": ["size", "orientation", "margin"],
      "properties": {
        "size": {
          "type": "object",
          "required": ["width", "height"],
          "properties": { "width": { "type": "number" }, "height": { "type": "number" } }
        },
        "orientation": { "type": "string", "enum": ["portrait", "landscape"] },
        "margin": {
          "type": "object",
          "required": ["top", "right", "bottom", "left"],
          "properties": {
            "top": { "type": "number" },
            "right": { "type": "number" },
            "bottom": { "type": "number" },
            "left": { "type": "number" }
          }
        }
      }
    },
    "assets": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "kind"],
        "properties": {
          "id": { "type": "string" },
          "kind": { "type": "string", "enum": ["image", "video", "audio", "file", "other"] },
          "url": { "type": "string" },
          "mimeType": { "type": "string" },
          "size": { "type": "number" }
        }
      }
    }
  }
}
```

---

### 2. `SaveStateInput` (Payload khi gửi PUT `/documents/{id}/state`)
```json
{
  "type": "object",
  "required": ["state", "baseRevisionId", "reason", "clientMutationId"],
  "properties": {
    "state": { "$ref": "#/components/schemas/KindyDocumentState" },
    "baseRevisionId": { "type": "string", "description": "ID revision của snapshot lúc client mở/sửa" },
    "reason": { "type": "string", "enum": ["autosave", "manual"] },
    "clientMutationId": { "type": "string", "description": "UUID do client tạo tránh gửi trùng lặp" }
  }
}
```

---

### 3. `SaveResult` (Phản hồi thành công từ PUT `/documents/{id}/state`)
```json
{
  "type": "object",
  "required": ["revisionId"],
  "properties": {
    "revisionId": { "type": "string", "description": "ID revision mới được server ghi nhận" },
    "version": { "$ref": "#/components/schemas/DocumentVersion" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```
