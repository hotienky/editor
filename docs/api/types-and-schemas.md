# Data Types & Interfaces

Tổng hợp các định nghĩa TypeScript chính của SDK.

---

## 1. Document State

```typescript
export interface KindyPageMargin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface KindyHeaderFooterState {
  enabled: boolean
  content?: JSONContent
  text?: string
  firstContent?: JSONContent
  firstText?: string
  evenContent?: JSONContent
  evenText?: string
  differentFirstPage?: boolean
  differentOddEven?: boolean
}

export interface KindyPageState {
  size: { width: number; height: number }
  orientation: 'portrait' | 'landscape'
  margin: KindyPageMargin
  background?: string
  watermark?: Record<string, unknown>
  header?: KindyHeaderFooterState
  footer?: KindyHeaderFooterState
  sections?: KindySectionState[]
}

export interface AssetReference {
  id: string
  kind: 'image' | 'video' | 'audio' | 'file' | 'other'
  url?: string
  mimeType?: string
  fileName?: string
  size?: number
  metadata?: Record<string, unknown>
}

export interface KindyDocumentState {
  schemaVersion: '2.0'
  content: JSONContent
  page: KindyPageState
  assets: AssetReference[]
}
```

---

## 2. Records & Snapshots

```typescript
export interface DocumentSummary {
  id: string
  title: string
  fileName: string
  folderId?: string | null
  tags?: string[]
  currentVersionId?: string
  currentRevisionId?: string
  isTemplate?: boolean
  updatedAt: string
  createdAt?: string
  capabilities?: DocumentCapabilities
}

export interface DocumentRecord extends DocumentSummary {
  description?: string
  metadata?: Record<string, unknown>
  originalSource?: {
    artifactId: string
    revisionId: string
    format: 'original-docx'
    fileName: string
    compatibilityReport?: CompatibilityReport
  }
}

export interface DocumentSnapshot {
  document: DocumentRecord
  state: KindyDocumentState
  revisionId: string
  version?: DocumentVersion
}

export interface DocumentVersion {
  id: string
  documentId: string
  number: number
  revisionId: string
  reason: 'autosave' | 'manual' | 'create' | 'import' | 'restore' | 'template'
  createdAt: string
  createdBy?: { id?: string; name?: string }
  label?: string
}
```
