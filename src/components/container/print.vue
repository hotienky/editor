<template>
  <iframe ref="iframeRef" class="kindy-print-iframe" :srcdoc="iframeCode" />
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue'
import { getLayoutEngine } from '@umo/layout'
import { createPageConfig, getContentArea } from '@umo/layout'
import { shouldShowHeaderFooter, getHeaderFooterContent } from '@umo/layout'
import { getPageNumberText } from '@umo/layout'
import { estimateBlockHeight } from '@umo/layout'
import { resolvePrintPageConfig } from '@/utils/print-sections'

const container = inject('container')
const editor = inject('editor')
const printing = inject('printing')
const exportFile = inject('exportFile')
const page = inject('page')
const options = inject('options')

const iframeRef = ref(null)
let iframeCode = ref('')

const getStylesHtml = () => {
  return Array.from(document.querySelectorAll('link, style'))
    .map((item) => item.outerHTML)
    .join('')
}

const getPlyrSprite = () => {
  return document.querySelector('#sprite-plyr')?.innerHTML || ''
}

const prepareEchartsForPrint = (htmlContent) => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  const charts = tempDiv.querySelectorAll('.kindy-node-echarts-body')
  for (const chartElement of charts) {
    const chartInstance = echarts.getInstanceByDom(chartElement)
    if (chartInstance) {
      const imgData = chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      })
      const imgElement = document.createElement('img')
      imgElement.src = imgData
      imgElement.style.width = '100%'
      if (chartElement && chartElement.parentNode) {
        chartElement.parentNode.replaceChild(imgElement, chartElement)
      }
    }
  }
  return tempDiv.innerHTML
}

/**
 * Split HTML content by page breaks computed from the pagination layoutTree.
 * The layoutTree is populated by pagination.js using real DOM block heights.
 */
const splitContentByLayout = (htmlContent, pageOptions) => {
  // Get layout from pagination extension (computed from real DOM heights)
  const layoutTree = editor.value?.storage?.pagination?.layoutTree

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  // Filter out auto-injected page-break decorations (they are not document content)
  const children = Array.from(tempDiv.childNodes).filter(
    (child) =>
      !(
        child.nodeType === Node.ELEMENT_NODE &&
        (child.classList?.contains('kindy-page-break-decoration') ||
          child.hasAttribute?.('data-decoration'))
      ),
  )

  // Use Layout Tree if available (primary path)
  if (layoutTree?.pages && layoutTree.pages.length > 0) {
    const pages = []
    for (const layoutPage of layoutTree.pages) {
      const pageContent = []
      for (
        let i = layoutPage.blockStart;
        i <= layoutPage.blockEnd && i < children.length;
        i++
      ) {
        const child = children[i]
        if (child) {
          // Skip manual page-break nodes in print output (handled by @page CSS)
          if (
            child.nodeType === Node.ELEMENT_NODE &&
            (child.classList?.contains('kindy-page-break') || child.classList?.contains('kindy-section-break'))
          ) {
            continue
          }
          pageContent.push(
            child.nodeType === Node.ELEMENT_NODE
              ? child.outerHTML
              : child.textContent || '',
          )
        }
      }
      if (pageContent.length > 0 || pages.length === 0) {
        pages.push({ html: pageContent.join(''), layout: layoutPage })
      }
    }

    return pages.length > 0 ? pages : [{ html: children.map((c) => c.outerHTML || '').join(''), layout: null }]
  }

  // Fallback: split by manual pageBreak nodes if layoutTree is not ready
  const pages = []
  let currentPageContent = []

  for (const child of children) {
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      (child.classList?.contains('kindy-page-break') || child.classList?.contains('kindy-section-break'))
    ) {
      if (currentPageContent.length > 0) {
        pages.push({ html: currentPageContent.join(''), layout: null })
        currentPageContent = []
      }
    } else {
      const html =
        child.nodeType === Node.ELEMENT_NODE
          ? child.outerHTML
          : child.textContent || ''
      if (html) currentPageContent.push(html)
    }
  }
  if (currentPageContent.length > 0) {
    pages.push({ html: currentPageContent.join(''), layout: null })
  }

  return pages.length > 0 ? pages : [{ html: htmlContent, layout: null }]
}

const renderHeader = (pageNumber, totalPages, headerConfig) => {
  if (!headerConfig?.enable) return ''
  if (!shouldShowHeaderFooter(headerConfig, pageNumber, totalPages)) return ''

  const content = getHeaderFooterContent(headerConfig, pageNumber, totalPages)

  const fontSize = content.fontSize || 14
  const fontColor = content.fontColor || '#333'
  const fontFamily = content.fontFamily || 'Arial'
  const fontWeight = content.fontWeight || 'normal'
  const align = content.align || 'center'

  let innerHtml = ''
  if (content.layout === 'split' || content.leftText || content.rightText) {
    innerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 6px;">
          ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth || 48}px;" />` : ''}
          <span>${content.leftText || ''}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>${content.rightText || ''}</span>
        </div>
      </div>
    `
  } else {
    innerHtml = `
      <div style="display: flex; align-items: center; justify-content: ${align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'}; gap: 6px;">
        ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth || 48}px;" />` : ''}
        <span>${content.text || ''}</span>
      </div>
    `
  }

  const borderStyle = content.showBorder ? 'border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;' : ''

  return `
    <div style="padding: 0.5cm 1cm 0.3cm; font-size: ${fontSize}px; color: ${fontColor}; font-family: ${fontFamily}; font-weight: ${fontWeight}; text-align: ${align}; ${borderStyle}">
      ${innerHtml}
    </div>
  `
}

const renderFooter = (pageNumber, totalPages, footerConfig) => {
  if (!footerConfig?.enable) return ''
  if (!shouldShowHeaderFooter(footerConfig, pageNumber, totalPages)) return ''

  const content = getHeaderFooterContent(footerConfig, pageNumber, totalPages)

  const fontSize = content.fontSize || 14
  const fontColor = content.fontColor || '#333'
  const fontFamily = content.fontFamily || 'Arial'
  const fontWeight = content.fontWeight || 'normal'
  const align = content.align || 'center'

  let innerHtml = ''
  if (content.layout === 'split' || content.leftText || content.rightText) {
    innerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 6px;">
          ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth || 48}px;" />` : ''}
          <span>${content.leftText || ''}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>${content.rightText || ''}</span>
        </div>
      </div>
    `
  } else {
    const displayText = content.text || getPageNumberText(pageNumber, totalPages)
    innerHtml = `
      <div style="display: flex; align-items: center; justify-content: ${align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'}; gap: 6px;">
        ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth || 48}px;" />` : ''}
        <span>${displayText}</span>
      </div>
    `
  }

  const borderStyle = content.showBorder ? 'border-top: 1px solid #e2e8f0; padding-top: 4px;' : ''

  return `
    <div style="padding: 0.3cm 1cm 0.5cm; font-size: ${fontSize}px; color: ${fontColor}; font-family: ${fontFamily}; font-weight: ${fontWeight}; text-align: ${align}; ${borderStyle}">
      ${innerHtml}
    </div>
  `
}

const defaultLineHeight = $computed(
  () => options.value.dicts?.lineHeights.find((item) => item.default)?.value,
)

const getIframeCode = () => {
  const { orientation, size, margin, background, header, footer } = page.value

  const editorContent = editor.value?.getHTML() || ''
  const preparedContent = prepareEchartsForPrint(editorContent)
  const pages = splitContentByLayout(preparedContent, page.value)
  const totalPages = pages.length
  const fallback = { orientation, size, margin, background, header, footer }
  const resolvedPages = pages.map((entry, index) => resolvePrintPageConfig(entry, index, pages, fallback))
  const pageRules = new Map()
  for (const config of resolvedPages) {
    pageRules.set(config.sectionIndex, `@page kindy-section-${config.sectionIndex} { size: ${config.pageWidth}cm ${config.pageHeight}cm; margin: 0; }`)
  }

  let pagesHtml = ''
  for (let i = 0; i < pages.length; i++) {
    const pageNumber = i + 1
    const config = resolvedPages[i]

    pagesHtml += `
      <div class="kindy-print-page" data-section="${config.sectionId}" style="
        page: kindy-section-${config.sectionIndex};
        width: ${config.pageWidth}cm;
        height: ${config.pageHeight}cm;
        padding: ${config.margin?.top}cm ${config.margin?.right}cm ${config.margin?.bottom}cm ${config.margin?.left}cm;
        box-sizing: border-box;
        page-break-after: ${i < pages.length - 1 ? 'always' : 'auto'};
        position: relative;
        background: ${config.background};
        overflow: hidden;
      ">
        ${renderHeader(config.sectionPageNumber, totalPages, config.header)}
        <div class="kindy-print-page-content" style="
          flex: 1;
          min-height: 0;
        ">
          ${pages[i].html}
        </div>
        ${renderFooter(config.sectionPageNumber, totalPages, config.footer)}
      </div>
    `
  }

  /* eslint-disable */
  return `
    <!DOCTYPE html>
    <html lang="en" theme-mode="${options.value.theme}">
    <head>
      <title>${options.value.document?.title}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${getStylesHtml()}
      <style>
      html {
        margin: 0;
        padding: 0;
        overflow: visible;
      }
      body {
        margin: 0;
        padding: 0;
        background-color: ${background};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .kindy-editor-container {
        background-color: ${background} !important;
      }
      .kindy-print-page {
        display: flex;
        flex-direction: column;
        margin: 0 auto;
      }
      .kindy-print-page-content {
        flex: 1;
        overflow: hidden;
      }
      .kindy-page-break {
        display: none;
      }
      [contenteditable] {
        outline: none;
      }
      ${Array.from(pageRules.values()).join('\n')}
      </style>
    </head>
    <body class="is-print">
      <div id="sprite-plyr" style="display: none;">
      ${getPlyrSprite()}
      </div>
      <div class="kindy-editor-container" style="line-height: ${defaultLineHeight};" aria-expanded="false">
        <div class="tiptap kindy-editor" translate="no">
          ${pagesHtml}
        </div>
      </div>
    </body>
    </html>`
  /* eslint-enable */
}

const printPage = () => {
  editor.value?.commands.blur()

  // Ensure layoutTree is up-to-date before generating print output
  // repaginate() reads actual DOM heights — must be called while editor DOM is visible
  editor.value?.commands.repaginate()

  // Small delay to allow repaginate's setTimeout (200ms debounce) to settle
  // then generate the iframe code from fresh layoutTree
  setTimeout(() => {
    iframeCode.value = getIframeCode()

    const dialog = useConfirm({
      attach: container,
      theme: 'info',
      header: printing.value ? t('print.title') : t('export.pdf.title'),
      body: printing.value ? t('print.message') : t('export.pdf.message'),
      confirmBtn: printing.value ? t('print.confirm') : t('export.pdf.confirm'),
      onConfirm() {
        dialog.destroy()
        setTimeout(() => {
          if (iframeRef.value?.contentWindow) {
            iframeRef.value.contentWindow.print()
          }
        }, 300)
      },
      onClosed() {
        printing.value = false
        exportFile.value.pdf = false
      },
    })
  }, 250)
}

watch(
  () => [printing.value, exportFile.value.pdf],
  (value) => {
    if (!value[0] && !value[1]) {
      return
    }
    printPage()
  },
)
</script>

<style lang="less" scoped>
.kindy-print-iframe {
  position: absolute;
  width: 0;
  height: 0;
  border: none;
  overflow: auto;
}
</style>
