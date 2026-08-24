import type {
  KindyLayoutPage,
  KindyLayoutPosition,
  KindyLayoutTree,
  LayoutViewport,
} from './types'

interface PageBounds {
  page: KindyLayoutPage
  top: number
  bottom: number
}

/**
 * Ephemeral lookup index for one layout tree.
 *
 * The registry never owns document content and can be rebuilt at any time.
 * Page IDs are created by the layout service from stable DOM block identities.
 */
export class LayoutPageRegistry {
  private tree: KindyLayoutTree | null = null
  private pagesByNumber = new Map<number, KindyLayoutPage>()
  private pagesById = new Map<string, KindyLayoutPage>()
  private firstPageByBlock = new Map<number, KindyLayoutPage>()
  private bounds: PageBounds[] = []

  update(tree: KindyLayoutTree): void {
    this.clear()
    this.tree = tree
    let top = 0

    for (const page of tree.pages) {
      this.pagesByNumber.set(page.pageNumber, page)
      this.pagesById.set(page.id, page)
      for (let blockIndex = page.blockStart; blockIndex <= page.blockEnd; blockIndex += 1) {
        if (blockIndex >= 0 && !this.firstPageByBlock.has(blockIndex)) {
          this.firstPageByBlock.set(blockIndex, page)
        }
      }

      const pageHeight = page.geometry.pageHeight
        ?? page.geometry.contentHeight
          + (page.geometry.marginTop || 0)
          + (page.geometry.marginBottom || 0)
      const bottom = top + pageHeight
      this.bounds.push({ page, top, bottom })
      top = bottom + (page.geometry.pageGap || 24)
    }
  }

  getTree(): KindyLayoutTree | null {
    return this.tree
  }

  getPage(pageNumber: number): KindyLayoutPage | null {
    return this.pagesByNumber.get(pageNumber) ?? null
  }

  getPageById(pageId: string): KindyLayoutPage | null {
    return this.pagesById.get(pageId) ?? null
  }

  getPageAtPosition(position: KindyLayoutPosition): KindyLayoutPage | null {
    return this.firstPageByBlock.get(position.blockIndex) ?? null
  }

  getVisiblePages(viewport: LayoutViewport): KindyLayoutPage[] {
    if (!this.tree?.pages.length) return []
    const zoom = viewport.zoom && viewport.zoom > 0 ? viewport.zoom : 1
    const buffer = Math.max(0, viewport.bufferPages ?? 2)
    const start = viewport.scrollTop / zoom
    const end = (viewport.scrollTop + viewport.height) / zoom
    let firstVisible = -1
    let lastVisible = -1

    // Page count is normally small enough for this scan. Page identity and
    // block/page queries remain O(1); a binary-search bounds index can be added
    // independently when viewport profiling shows it is needed.
    for (let index = 0; index < this.bounds.length; index += 1) {
      const bound = this.bounds[index]
      if (bound.bottom >= start && bound.top <= end) {
        if (firstVisible === -1) firstVisible = index
        lastVisible = index
      }
    }

    if (firstVisible === -1) return []
    const from = Math.max(0, firstVisible - buffer)
    const to = Math.min(this.bounds.length - 1, lastVisible + buffer)
    return this.bounds.slice(from, to + 1).map(({ page }) => page)
  }

  clear(): void {
    this.tree = null
    this.pagesByNumber.clear()
    this.pagesById.clear()
    this.firstPageByBlock.clear()
    this.bounds = []
  }
}
