<template>
  <menus-button
    ico="word"
    text="Word (.docx)"
    huge
    @menu-click="saveWordFile"
  />
</template>

<script setup>
import { saveAs } from 'file-saver'

const editor = inject('editor')
const options = inject('options')
const pageOptions = inject('page')

const saveWordFile = () => {
  if (!editor.value) {
    return
  }

  const contentHtml = editor.value.getHTML()
  const pageHeader = pageOptions?.value?.header
  const pageFooter = pageOptions?.value?.footer

  // Header HTML layout
  let headerHtml = ''
  if (pageHeader?.enable) {
    if (pageHeader.layout === 'split' || pageHeader.leftText || pageHeader.rightText) {
      headerHtml = `
        <table style="width: 100%; border-bottom: 1.5pt solid #0284c7; margin-bottom: 16px; padding-bottom: 8px;">
          <tr>
            <td style="border: none; text-align: left; vertical-align: bottom; color: ${pageHeader.fontColor || '#0284c7'}; font-size: ${pageHeader.fontSize || 13}px;">
              ${pageHeader.logo ? `<img src="${pageHeader.logo}" width="${pageHeader.logoWidth || 48}" style="vertical-align: middle; margin-right: 8px;" />` : ''}
              <span style="white-space: pre-line;">${pageHeader.leftText || ''}</span>
            </td>
            <td style="border: none; text-align: right; vertical-align: bottom; color: ${pageHeader.fontColor || '#0284c7'}; font-size: ${pageHeader.fontSize || 13}px;">
              <span style="white-space: pre-line;">${pageHeader.rightText || ''}</span>
            </td>
          </tr>
        </table>`
    } else {
      headerHtml = `
        <div style="border-bottom: 1.5pt solid #0284c7; padding-bottom: 8px; margin-bottom: 16px; text-align: ${pageHeader.align || 'center'}; color: ${pageHeader.fontColor || '#0284c7'}; font-size: ${pageHeader.fontSize || 13}px;">
          ${pageHeader.logo ? `<img src="${pageHeader.logo}" width="${pageHeader.logoWidth || 48}" style="vertical-align: middle; margin-right: 8px;" />` : ''}
          <span>${pageHeader.text || ''}</span>
        </div>`
    }
  }

  // Footer HTML layout
  let footerHtml = ''
  if (pageFooter?.enable) {
    if (pageFooter.layout === 'split' || pageFooter.leftText || pageFooter.rightText) {
      footerHtml = `
        <table style="width: 100%; border-top: 1.5pt solid #cbd5e1; margin-top: 24px; padding-top: 8px;">
          <tr>
            <td style="border: none; text-align: left; vertical-align: top; color: ${pageFooter.fontColor || '#64748b'}; font-size: ${pageFooter.fontSize || 12}px;">
              ${pageFooter.logo ? `<img src="${pageFooter.logo}" width="${pageFooter.logoWidth || 48}" style="vertical-align: middle; margin-right: 8px;" />` : ''}
              <span style="white-space: pre-line;">${pageFooter.leftText || ''}</span>
            </td>
            <td style="border: none; text-align: right; vertical-align: top; color: ${pageFooter.fontColor || '#64748b'}; font-size: ${pageFooter.fontSize || 12}px;">
              <span style="white-space: pre-line;">${pageFooter.rightText || ''}</span>
            </td>
          </tr>
        </table>`
    } else {
      footerHtml = `
        <div style="border-top: 1.5pt solid #cbd5e1; padding-top: 8px; margin-top: 24px; text-align: ${pageFooter.align || 'center'}; color: ${pageFooter.fontColor || '#64748b'}; font-size: ${pageFooter.fontSize || 12}px;">
          ${pageFooter.logo ? `<img src="${pageFooter.logo}" width="${pageFooter.logoWidth || 48}" style="vertical-align: middle; margin-right: 8px;" />` : ''}
          <span>${pageFooter.text || ''}</span>
        </div>`
    }
  }

  const { title } = options.value.document
  const filename = title !== '' ? options.value.document?.title : t('document.untitled')

  const fullHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${filename}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForCustomXSL/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4;
          margin: 2.0cm 2.0cm 2.0cm 2.0cm;
        }
        body {
          font-family: "Times New Roman", Arial, sans-serif;
          font-size: 13pt;
          color: #1e293b;
          line-height: 1.5;
        }
        p {
          margin-top: 0px;
          margin-bottom: 6px;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 12px;
        }
        td, th {
          border: 1px solid #94a3b8;
          padding: 6px 10px;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        ul, ol {
          margin-top: 0px;
          margin-bottom: 6px;
          padding-left: 24px;
        }
        li {
          margin-bottom: 4px;
        }
        .kindy-page-break {
          page-break-before: always !important;
          break-before: page !important;
          mso-break-type: page-break !important;
          display: block;
          height: 0px;
          clear: both;
        }
      </style>
    </head>
    <body>
      ${headerHtml}
      ${contentHtml.replace(/<div class="kindy-page-break"[^>]*><\/div>/g, '<br style="page-break-before: always; clear: both; mso-break-type: page-break;" />')}
      ${footerHtml}
    </body>
    </html>`

  const blob = new Blob(['\ufeff', fullHtml], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  saveAs(blob, `${filename}.docx`)
}
</script>
