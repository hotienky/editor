export type LayoutReason =
  | 'open'
  | 'transaction'
  | 'resize'
  | 'font'
  | 'image'
  | 'section'
  | 'manual'

export type LayoutHeaderFooter = Record<string, unknown>

export interface KindyLayoutGeometry {
  pageWidth?: number
  pageHeight?: number
  pageWidthCm?: number
  pageHeightCm?: number
  contentHeight: number
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
  marginTopCm?: number
  marginBottomCm?: number
  marginLeftCm?: number
  marginRightCm?: number
  orientation?: 'portrait' | 'landscape'
  pageGap?: number
}

export interface KindyLayoutSectionConfig extends Record<string, unknown> {
  header?: LayoutHeaderFooter
  footer?: LayoutHeaderFooter
}

export interface KindyLayoutSection {
  index: number
  id: string | null
  pageNumberStart?: number
  config?: KindyLayoutSectionConfig | null
}

export interface KindySectionTransition {
  geometry: KindyLayoutGeometry
  section: KindyLayoutSection
}

export interface KindySectionLayout {
  initialGeometry?: KindyLayoutGeometry
  initialSection?: KindyLayoutSection
  transitions?: Map<number, KindySectionTransition>
}

export interface KindyPageAssignment {
  pageNumber: number
  pageSpan: number
  blockStart: number
  blockEnd: number
  height: number
  remainingHeight: number
  endedByManualBreak: boolean
  manualBreakBlock: number | null
  geometry: KindyLayoutGeometry
  sectionIndex: number
  sectionId: string | null
  section: KindyLayoutSection
  sectionPageNumber: number
  separatorOffset: number
  spacerHeight: number
  pageGap: number
  nextPageGeometry?: KindyLayoutGeometry
  nextSection?: KindyLayoutSection
}

export interface KindyLayoutPage {
  id: string
  startBlockId: string | null
  pageNumber: number
  sectionPageNumber: number
  blockStart: number
  blockEnd: number
  contentHeight: number
  contentWidth: number
  isFirst: boolean
  isLast: boolean
  isOdd: boolean
  startsInsideBlock: boolean
  endedByManualBreak: boolean
  sectionIndex: number
  sectionId: string | null
  section: KindyLayoutSection
  geometry: KindyLayoutGeometry
  header: LayoutHeaderFooter
  footer: LayoutHeaderFooter
  pageNumberDisplay: { text: string }
}

export interface KindyLayoutTree {
  totalPages: number
  pages: KindyLayoutPage[]
  blockIds: string[]
  version: number
  documentRevision: string
}

export interface KindyVisualBreak {
  blockIndex: number
  pageNumber: number
  spacerHeight: number
  separatorOffset: number
  pageGap: number
  sectionIndex: number
  sectionId: string | null
  geometry: KindyLayoutGeometry
  header: LayoutHeaderFooter
  footer: LayoutHeaderFooter
}

export interface KindyManualBreak extends KindyVisualBreak {}

export interface KindyLayoutPosition {
  blockIndex: number
  pageNumber?: number
  from?: number
  to?: number
  rowIndex?: number
}

export interface LayoutViewport {
  scrollTop: number
  height: number
  zoom?: number
  bufferPages?: number
}

export interface LayoutTelemetry {
  documentRevision: string
  layoutRevision: number
  reason: LayoutReason
  totalBlocks: number
  invalidatedBlocks: number
  firstInvalidatedBlock: number | null
  measuredBlocks: number
  cacheHits: number
  cacheMisses: number
  measureMs: number
  computeMs: number
  projectMs: number
  totalMs: number
  discardedAsStale: boolean
  pageCount: number
}

export type LayoutInvalidation =
  | {
      scope: 'block'
      element: Element
      blockIndex?: number
      reason: LayoutReason
    }
  | {
      scope: 'all'
      reason: LayoutReason
    }

export interface DomDocumentLayoutInput {
  editorDom: HTMLElement
  sectionLayout?: KindySectionLayout
  documentRevision?: string | number
  reason?: LayoutReason
  signal?: AbortSignal
}

export interface DocumentLayoutResult {
  layoutTree: KindyLayoutTree
  pageAssignments: KindyPageAssignment[]
  visualBreaks: KindyVisualBreak[]
  manualBreaks: KindyManualBreak[]
  telemetry: LayoutTelemetry
}

export interface BlockMeasurementCache {
  get(element: Element, layoutKey: string): unknown
  set(element: Element, layoutKey: string, value: unknown): void
  invalidate(element?: Element): void
  invalidateAll(): void
  stats(): { hits: number; misses: number }
}

export interface DocumentLayoutService<
  TInput extends DomDocumentLayoutInput = DomDocumentLayoutInput,
> {
  readonly id: string
  layout(input: TInput): DocumentLayoutResult
  invalidate(invalidation: LayoutInvalidation): void
  getPage(pageNumber: number, tree?: KindyLayoutTree | null): KindyLayoutPage | null
  getPageAtPosition(
    position: KindyLayoutPosition,
    tree?: KindyLayoutTree | null,
  ): KindyLayoutPage | null
  getPositionAtPoint(
    pageNumber: number,
    point: { x: number; y: number },
    tree?: KindyLayoutTree | null,
  ): KindyLayoutPosition | null
  getVisiblePages(
    viewport: LayoutViewport,
    tree?: KindyLayoutTree | null,
  ): KindyLayoutPage[]
  getTelemetry(): LayoutTelemetry | null
  destroy(): void
}
