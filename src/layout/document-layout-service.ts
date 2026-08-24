import {
  computePagesFromHeights,
  createBlockMeasurementCache,
  getBlockHeightsFromDOM,
  getPageGeometry,
  getTopLevelBlockElements,
} from '@/utils/dom-page-calculator'

import type {
  BlockMeasurementCache,
  DocumentLayoutResult,
  DocumentLayoutService,
  DomDocumentLayoutInput,
  KindyLayoutGeometry,
  KindyLayoutPage,
  KindyLayoutPosition,
  KindyLayoutSection,
  KindyLayoutTree,
  KindyManualBreak,
  KindyPageAssignment,
  KindyVisualBreak,
  LayoutHeaderFooter,
  LayoutInvalidation,
  LayoutTelemetry,
  LayoutViewport,
} from './types'
import { LayoutPageRegistry } from './page-registry'

const now = () => globalThis.performance?.now?.() ?? Date.now()

const throwIfAborted = (signal?: AbortSignal) => {
  if (!signal?.aborted) return
  throw new DOMException('Layout operation was cancelled', 'AbortError')
}

const asHeaderFooter = (value: unknown): LayoutHeaderFooter => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as LayoutHeaderFooter
}

const createDefaultSection = (): KindyLayoutSection => ({
  index: 0,
  id: null,
  config: null,
})

const createDefaultGeometry = (contentHeight: number): KindyLayoutGeometry => ({
  contentHeight,
  pageGap: 24,
})

interface MeasuredBlock extends Record<string, unknown> {
  height: number
  marginBefore?: number
  forceBreak: boolean
  avoidBreak: boolean
}

export interface DomDocumentLayoutServiceOptions {
  cmToPx: (centimeters: number) => number
  measurementCache?: BlockMeasurementCache
}

/**
 * Production DOM implementation for Phase 0.
 *
 * It deliberately preserves the existing block-level pagination behavior.
 * Row-aware paragraph and table fragmentation are later capabilities, not
 * hidden changes in this boundary migration.
 */
export class DomDocumentLayoutService
implements DocumentLayoutService<DomDocumentLayoutInput> {
  readonly id = 'kindy-dom-layout-v1'
  readonly measurementCache: BlockMeasurementCache

  private readonly cmToPx: (centimeters: number) => number
  private readonly registry = new LayoutPageRegistry()
  private layoutTree: KindyLayoutTree | null = null
  private telemetry: LayoutTelemetry | null = null
  private version = 0
  private invalidatedElements = new Set<Element>()
  private invalidatedBlockIndexes = new Set<number>()
  private invalidatedAll = false
  private destroyed = false
  private blockIds = new WeakMap<Element, string>()
  private nextBlockId = 1

  constructor(options: DomDocumentLayoutServiceOptions) {
    this.cmToPx = options.cmToPx
    this.measurementCache = options.measurementCache
      ?? (createBlockMeasurementCache() as BlockMeasurementCache)
  }

  layout(input: DomDocumentLayoutInput): DocumentLayoutResult {
    if (this.destroyed) {
      throw new Error('DocumentLayoutService has been destroyed')
    }
    throwIfAborted(input.signal)

    const startedAt = now()
    const reason = input.reason ?? 'manual'
    const documentRevision = String(input.documentRevision ?? '0')
    const statsBefore = this.measurementCache.stats()
    const blockElements = getTopLevelBlockElements(input.editorDom)
    const stableBlockIds = blockElements.map((element) => this.getBlockId(element))
    const totalBlocks = blockElements.length

    const measureStartedAt = now()
    const blockMeasurements = getBlockHeightsFromDOM(
      input.editorDom,
      this.measurementCache,
    ) as unknown as MeasuredBlock[]
    const measureMs = now() - measureStartedAt
    throwIfAborted(input.signal)

    const computeStartedAt = now()
    const sectionLayout = input.sectionLayout ?? {}
    const measuredBlocks = blockMeasurements.map((block, index) => {
      const transition = sectionLayout.transitions?.get(index)
      return transition
        ? {
            ...block,
            nextPageGeometry: transition.geometry,
            nextSection: transition.section,
          }
        : block
    })
    const initialGeometry = sectionLayout.initialGeometry
      ?? (getPageGeometry(input.editorDom, this.cmToPx) as unknown as KindyLayoutGeometry)
    const initialSection = sectionLayout.initialSection ?? createDefaultSection()
    const rawAssignments = computePagesFromHeights(
      measuredBlocks,
      initialGeometry.contentHeight,
      { initialGeometry, initialSection },
    ) as KindyPageAssignment[]
    const pageAssignments = rawAssignments.map((page) => ({
      ...page,
      geometry: page.geometry ?? initialGeometry ?? createDefaultGeometry(900),
      section: page.section ?? initialSection,
      sectionIndex: page.sectionIndex ?? initialSection.index,
      sectionId: page.sectionId ?? initialSection.id,
      sectionPageNumber: page.sectionPageNumber ?? page.pageNumber,
      separatorOffset: page.remainingHeight + (page.geometry?.marginBottom || 0),
      spacerHeight: page.remainingHeight
        + (page.geometry?.marginBottom || 0)
        + (page.geometry?.pageGap || 24)
        + (page.geometry?.marginTop || 0),
      pageGap: page.geometry?.pageGap || 24,
    }))
    const computeMs = now() - computeStartedAt
    throwIfAborted(input.signal)

    const projectStartedAt = now()
    const result = this.project(
      pageAssignments,
      documentRevision,
      reason,
      totalBlocks,
      statsBefore,
      measureMs,
      computeMs,
      startedAt,
      stableBlockIds,
    )
    const projectMs = now() - projectStartedAt
    result.telemetry.projectMs = projectMs
    result.telemetry.totalMs = now() - startedAt
    this.telemetry = result.telemetry
    this.layoutTree = result.layoutTree
    this.registry.update(result.layoutTree)
    this.invalidatedElements.clear()
    this.invalidatedBlockIndexes.clear()
    this.invalidatedAll = false
    return result
  }

  invalidate(invalidation: LayoutInvalidation): void {
    if (this.destroyed) return
    if (invalidation.scope === 'all') {
      this.measurementCache.invalidateAll()
      this.invalidatedAll = true
      this.invalidatedElements.clear()
      this.invalidatedBlockIndexes.clear()
      return
    }
    this.measurementCache.invalidate(invalidation.element)
    if (!this.invalidatedAll) {
      this.invalidatedElements.add(invalidation.element)
      if (Number.isInteger(invalidation.blockIndex) && Number(invalidation.blockIndex) >= 0) {
        this.invalidatedBlockIndexes.add(Number(invalidation.blockIndex))
      }
    }
  }

  getPage(
    pageNumber: number,
    tree: KindyLayoutTree | null = this.layoutTree,
  ): KindyLayoutPage | null {
    if (!tree || tree === this.registry.getTree()) return this.registry.getPage(pageNumber)
    return tree?.pages.find((page) => page.pageNumber === pageNumber) ?? null
  }

  getPageAtPosition(
    position: KindyLayoutPosition,
    tree: KindyLayoutTree | null = this.layoutTree,
  ): KindyLayoutPage | null {
    if (!tree) return null
    if (tree === this.registry.getTree()) return this.registry.getPageAtPosition(position)
    return tree.pages.find((page) => (
      position.blockIndex >= page.blockStart
      && position.blockIndex <= page.blockEnd
    )) ?? null
  }

  getPositionAtPoint(
    _pageNumber: number,
    _point: { x: number; y: number },
    _tree: KindyLayoutTree | null = this.layoutTree,
  ): KindyLayoutPosition | null {
    // Phase 0 only owns block-level projection. Returning a fabricated caret
    // position would be unsafe; row/point mapping is introduced in Phase 2.
    return null
  }

  getVisiblePages(
    viewport: LayoutViewport,
    tree: KindyLayoutTree | null = this.layoutTree,
  ): KindyLayoutPage[] {
    if (!tree?.pages.length) return []
    if (tree === this.registry.getTree()) return this.registry.getVisiblePages(viewport)
    const temporaryRegistry = new LayoutPageRegistry()
    temporaryRegistry.update(tree)
    return temporaryRegistry.getVisiblePages(viewport)
  }

  getTelemetry(): LayoutTelemetry | null {
    return this.telemetry ? { ...this.telemetry } : null
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.measurementCache.invalidateAll()
    this.registry.clear()
    this.layoutTree = null
    this.telemetry = null
    this.invalidatedElements.clear()
    this.invalidatedBlockIndexes.clear()
    this.invalidatedAll = false
    this.blockIds = new WeakMap<Element, string>()
  }

  private project(
    pageAssignments: KindyPageAssignment[],
    documentRevision: string,
    reason: LayoutTelemetry['reason'],
    totalBlocks: number,
    statsBefore: { hits: number; misses: number },
    measureMs: number,
    computeMs: number,
    startedAt: number,
    blockIds: string[],
  ): DocumentLayoutResult {
    const totalPages = Math.max(1, pageAssignments.reduce(
      (total, page) => Math.max(total, page.pageNumber + page.pageSpan - 1),
      1,
    ))
    const pages = pageAssignments.flatMap((assignment) =>
      Array.from({ length: assignment.pageSpan }, (_, offset) => {
        const pageNumber = assignment.pageNumber + offset
        const section = assignment.section ?? createDefaultSection()
        const { config } = section
        const startBlockId = blockIds[assignment.blockStart] ?? null
        return {
          id: `page:${section.id ?? 'default'}:${startBlockId ?? 'empty'}:${offset}`,
          startBlockId,
          pageNumber,
          sectionPageNumber: assignment.sectionPageNumber + offset,
          blockStart: assignment.blockStart,
          blockEnd: assignment.blockEnd,
          contentHeight: offset < assignment.pageSpan - 1
            ? assignment.height / assignment.pageSpan
            : assignment.height
              - (assignment.pageSpan - 1) * (assignment.height / assignment.pageSpan),
          contentWidth: 0,
          isFirst: pageNumber === 1,
          isLast: pageNumber === totalPages,
          isOdd: pageNumber % 2 !== 0,
          startsInsideBlock: offset > 0,
          endedByManualBreak: offset === assignment.pageSpan - 1
            && assignment.endedByManualBreak,
          sectionIndex: assignment.sectionIndex,
          sectionId: assignment.sectionId,
          section,
          geometry: assignment.geometry,
          header: asHeaderFooter(config?.header),
          footer: asHeaderFooter(config?.footer),
          pageNumberDisplay: {
            text: String(assignment.sectionPageNumber + offset),
          },
        } satisfies KindyLayoutPage
      }),
    )

    const visualBreaks: KindyVisualBreak[] = []
    for (let index = 1; index < pageAssignments.length; index += 1) {
      const current = pageAssignments[index]
      const previous = pageAssignments[index - 1]
      if (!previous.endedByManualBreak) {
        visualBreaks.push({
          blockIndex: current.blockStart,
          pageNumber: current.pageNumber,
          spacerHeight: previous.spacerHeight,
          separatorOffset: previous.separatorOffset,
          pageGap: previous.pageGap,
          sectionIndex: current.sectionIndex,
          sectionId: current.sectionId,
          geometry: current.geometry,
          header: asHeaderFooter(current.section?.config?.header),
          footer: asHeaderFooter(previous.section?.config?.footer),
        })
      }
    }

    const manualBreaks: KindyManualBreak[] = pageAssignments
      .filter((page) => page.endedByManualBreak && page.manualBreakBlock !== null)
      .map((page) => ({
        blockIndex: page.manualBreakBlock as number,
        pageNumber: page.pageNumber + page.pageSpan,
        spacerHeight: page.spacerHeight,
        separatorOffset: page.separatorOffset,
        pageGap: page.pageGap,
        sectionIndex: page.nextSection?.index ?? page.sectionIndex,
        sectionId: page.nextSection?.id ?? page.sectionId,
        geometry: page.nextPageGeometry ?? page.geometry,
        header: asHeaderFooter(page.nextSection?.config?.header ?? page.section?.config?.header),
        footer: asHeaderFooter(page.section?.config?.footer),
      }))

    this.version += 1
    const layoutTree: KindyLayoutTree = {
      totalPages,
      pages,
      blockIds,
      version: this.version,
      documentRevision,
    }
    const statsAfter = this.measurementCache.stats()
    const invalidatedBlocks = this.invalidatedAll
      ? totalBlocks
      : Math.min(totalBlocks, this.invalidatedElements.size)
    const telemetry: LayoutTelemetry = {
      documentRevision,
      layoutRevision: this.version,
      reason,
      totalBlocks,
      invalidatedBlocks,
      firstInvalidatedBlock: this.invalidatedAll || this.invalidatedBlockIndexes.size === 0
        ? null
        : Math.min(...this.invalidatedBlockIndexes),
      measuredBlocks: Math.max(0, statsAfter.misses - statsBefore.misses),
      cacheHits: Math.max(0, statsAfter.hits - statsBefore.hits),
      cacheMisses: Math.max(0, statsAfter.misses - statsBefore.misses),
      measureMs,
      computeMs,
      projectMs: 0,
      totalMs: now() - startedAt,
      discardedAsStale: false,
      pageCount: totalPages,
    }
    return {
      layoutTree,
      pageAssignments,
      visualBreaks,
      manualBreaks,
      telemetry,
    }
  }

  private getBlockId(element: Element): string {
    const existing = this.blockIds.get(element)
    if (existing) return existing
    const id = `block-${this.nextBlockId}`
    this.nextBlockId += 1
    this.blockIds.set(element, id)
    return id
  }
}

export const createDomDocumentLayoutService = (
  options: DomDocumentLayoutServiceOptions,
): DomDocumentLayoutService => new DomDocumentLayoutService(options)
