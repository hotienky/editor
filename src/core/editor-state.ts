import { cloneDocumentState, createEmptyDocumentState } from './state'
import type {
  AssetReference,
  JSONContent,
  KindyDocumentState,
  KindyHeaderFooterState,
  KindyPageMargin,
  KindySectionState,
} from './types'

type LegacyHeaderFooter = {
  enable?: boolean
  enabled?: boolean
  text?: string
  leftText?: string
  content?: JSONContent
  variants?: {
    first?: { text?: string; content?: JSONContent }
    even?: { text?: string; content?: JSONContent }
  }
  differentFirstPage?: boolean
  differentOddEven?: boolean
}

type LegacyPage = {
  size?: { width?: number; height?: number }
  orientation?: 'portrait' | 'landscape'
  margin?: Partial<KindyPageMargin>
  headerDistance?: number
  footerDistance?: number
  background?: string
  watermark?: Record<string, unknown>
  header?: LegacyHeaderFooter
  footer?: LegacyHeaderFooter
  sections?: Array<LegacySection>
}

type LegacySection = LegacyPage & {
  id?: string
  fromBlockId?: string
  pageNumberStart?: number
}

export function toCanonicalHeaderFooter(value?: LegacyHeaderFooter): KindyHeaderFooterState | undefined {
  if (!value) return undefined
  const first = value.variants?.first || {}
  const even = value.variants?.even || {}
  return {
    enabled: Boolean(value.enable ?? value.enabled),
    ...(value.content ? { content: cloneDocumentState(value.content) } : {}),
    text: value.text || value.leftText || '',
    ...(first.content ? { firstContent: cloneDocumentState(first.content) } : {}),
    firstText: first.text || '',
    ...(even.content ? { evenContent: cloneDocumentState(even.content) } : {}),
    evenText: even.text || '',
    differentFirstPage: Boolean(value.differentFirstPage),
    differentOddEven: Boolean(value.differentOddEven),
  }
}

export function toCanonicalSection(section: LegacySection, page: LegacyPage): KindySectionState {
  const defaultState = createEmptyDocumentState().page
  return {
    id: section.id || `section-${section.fromBlockId || 'default'}`,
    ...(section.fromBlockId ? { fromBlockId: section.fromBlockId } : {}),
    ...(Number.isFinite(section.pageNumberStart)
      ? { pageNumberStart: section.pageNumberStart }
      : {}),
    size: {
      width: section.size?.width || page.size?.width || defaultState.size.width,
      height: section.size?.height || page.size?.height || defaultState.size.height,
    },
    orientation: section.orientation || page.orientation || defaultState.orientation,
    margin: {
      ...defaultState.margin,
      ...(page.margin || {}),
      ...(section.margin || {}),
    },
    ...(Number.isFinite(section.headerDistance ?? page.headerDistance)
      ? { headerDistance: section.headerDistance ?? page.headerDistance }
      : {}),
    ...(Number.isFinite(section.footerDistance ?? page.footerDistance)
      ? { footerDistance: section.footerDistance ?? page.footerDistance }
      : {}),
    ...(section.header
      ? { header: toCanonicalHeaderFooter(section.header) }
      : {}),
    ...(section.footer
      ? { footer: toCanonicalHeaderFooter(section.footer) }
      : {}),
  }
}

export function createEditorDocumentState(input: {
  content: JSONContent
  page?: LegacyPage
  assets?: AssetReference[]
}): KindyDocumentState {
  const page = input.page || {}
  return createEmptyDocumentState({
    content: input.content,
    assets: cloneDocumentState(input.assets || []),
    page: {
      size: page.size?.width && page.size?.height
        ? { width: page.size.width, height: page.size.height }
        : undefined,
      orientation: page.orientation,
      margin: page.margin as KindyPageMargin | undefined,
      headerDistance: page.headerDistance,
      footerDistance: page.footerDistance,
      background: page.background,
      watermark: page.watermark,
      header: toCanonicalHeaderFooter(page.header),
      footer: toCanonicalHeaderFooter(page.footer),
      sections: Array.isArray(page.sections)
        ? page.sections.map((section) => toCanonicalSection(section, page))
        : [],
    } as KindyDocumentState['page'],
  })
}

/**
 * Merge a live editor snapshot into the persisted canonical state.
 * Canvas owns mutable page zones as well as the body, while the host owns
 * assets and may add page metadata that the current engine does not edit.
 */
export function mergeEditorDocumentState(
  base: KindyDocumentState,
  editor: Partial<KindyDocumentState> & Pick<KindyDocumentState, 'content'>,
): KindyDocumentState {
  const editorPage = editor.page || base.page
  return createEmptyDocumentState({
    ...base,
    ...editor,
    content: editor.content,
    assets: editor.assets || base.assets,
    page: {
      ...base.page,
      ...editorPage,
      size: editorPage.size || base.page.size,
      orientation: editorPage.orientation || base.page.orientation,
      margin: {
        ...base.page.margin,
        ...(editorPage.margin || {}),
      },
    },
  })
}
