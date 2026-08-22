# kindy-editor v2

基于 Vue 3 与 Tiptap/ProseMirror 的 DOCX Document Library SDK。它提供编辑器、文档浏览器、版本面板、DOCX codec 与后端 API contract；不包含数据库、认证、权限、文件存储或协作服务器。

- 规范编辑状态为 `KindyDocumentState` JSON。
- 原始 DOCX、导出的 DOCX/PDF 由宿主系统通过 `DocumentApiAdapter` 保存。
- DOCX 兼容性仅承诺 [Kindy DOCX Compatibility Profile](./CAPABILITIES.md) 中列为 Supported 的功能。
- PDF v2.0 使用浏览器打印 / Save as PDF，不提供 PDF editor 或 deterministic PDF Blob。
- MIT license，不使用 ONLYOFFICE 或付费编辑引擎。

```bash
npm install kindy-editor
```

```ts
import {
  KindyDocumentLibrary,
  createRestDocumentAdapter,
} from 'kindy-editor'
import 'kindy-editor/style'

const adapter = createRestDocumentAdapter({
  baseUrl: '/document-api',
  transport: (url, init) => fetch(url, {
    ...init,
    credentials: 'include',
  }),
})
```

```vue
<KindyDocumentLibrary
  :adapter="adapter"
  :autosave="{ enabled: true, delay: 1500 }"
  style="height: 100vh"
/>
```

宿主应用负责在自定义 `transport` 中加入 cookie、header 或 token。SDK 不规定 authentication scheme。

标准 REST contract 位于 [`openapi/document-api.yaml`](./openapi/document-api.yaml)。详细集成说明请参阅英文/越南文主 [README](./README.md)、[GUIDE](./GUIDE.md)、[migration](./MIGRATION.md) 与 [capability matrix](./CAPABILITIES.md)。

