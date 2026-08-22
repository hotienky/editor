/** Select the Word-compatible first/even header or footer variant. */
export function resolveHeaderFooterVariant(config, pageInfo) {
  if (!config) return config
  if (config.differentFirstPage && pageInfo.isFirstInSection && config.variants?.first) {
    return { ...config, ...config.variants.first }
  }
  if (config.differentOddEven && pageInfo.sectionPageNumber % 2 === 0 && config.variants?.even) {
    return { ...config, ...config.variants.even }
  }
  return config
}

/** Resolve physical page geometry and numbering from pagination metadata. */
export function resolvePrintPageConfig(entry, index, entries, fallback) {
  const section = entry.layout?.section?.config
  const orientation = section?.orientation || fallback.orientation
  const size = section?.size || fallback.size || { width: 21, height: 29.7 }
  const pageWidth = orientation === 'portrait' ? size.width : size.height
  const pageHeight = orientation === 'portrait' ? size.height : size.width
  const sectionId = entry.layout?.sectionId || section?.id || 'section-1'
  const previousSectionId = index > 0 ? entries[index - 1].layout?.sectionId : null
  const sectionPageNumber = entry.layout?.sectionPageNumber || index + 1
  const pageInfo = {
    isFirstInSection: index === 0 || previousSectionId !== sectionId,
    sectionPageNumber,
  }
  return {
    sectionId,
    sectionIndex: entry.layout?.sectionIndex || 0,
    sectionPageNumber,
    pageWidth,
    pageHeight,
    margin: section?.margin || fallback.margin,
    background: fallback.background,
    header: resolveHeaderFooterVariant(section?.header || fallback.header, pageInfo),
    footer: resolveHeaderFooterVariant(section?.footer || fallback.footer, pageInfo),
  }
}
