/**
 * Import/Export Engine — Public API
 *
 * Single entry point for the IO Engine layer.
 * Handles document import and export in various formats.
 *
 * Architecture: Layer 8 — IO Engine
 */

// ─── Format Types ──────────────────────────────────────────────────────────

export const Format = {
  DOCX: 'docx',
  PDF: 'pdf',
  HTML: 'html',
  MARKDOWN: 'markdown',
  PLAIN_TEXT: 'plain-text',
  JSON: 'json',
}

// ─── Importers ─────────────────────────────────────────────────────────────

export {
  DocxImporter,
  createDocxImporter,
} from './importers/docx-importer'

export {
  HtmlImporter,
  createHtmlImporter,
} from './importers/html-importer'

export {
  MarkdownImporter,
  createMarkdownImporter,
} from './importers/markdown-importer'

export {
  JsonImporter,
  createJsonImporter,
} from './importers/json-importer'

// ─── Exporters ─────────────────────────────────────────────────────────────

export {
  DocxExporter,
  createDocxExporter,
} from './exporters/docx-exporter'

export {
  HtmlExporter,
  createHtmlExporter,
} from './exporters/html-exporter'

export {
  MarkdownExporter,
  createMarkdownExporter,
} from './exporters/markdown-exporter'

export {
  JsonExporter,
  createJsonExporter,
} from './exporters/json-exporter'

export {
  PlainTextExporter,
  createPlainTextExporter,
} from './exporters/plain-text-exporter'

// ─── Convenience Functions ─────────────────────────────────────────────────

/**
 * Import a document from a file
 * @param {File|ArrayBuffer} file - File to import
 * @param {string} format - Import format
 * @param {Object} [options] - Import options
 * @returns {Promise<Object>} Imported document
 */
export async function importDocument(file, format, options = {}) {
  const importer = getImporter(format)
  if (!importer) {
    throw new Error(`Unsupported import format: ${format}`)
  }
  return importer.import(file, options)
}

/**
 * Export a document to a specific format
 * @param {Object} doc - Document to export
 * @param {string} format - Export format
 * @param {Object} [options] - Export options
 * @returns {Promise<Blob|string>} Exported content
 */
export async function exportDocument(doc, format, options = {}) {
  const exporter = getExporter(format)
  if (!exporter) {
    throw new Error(`Unsupported export format: ${format}`)
  }
  return exporter.export(doc, options)
}

/**
 * Get an importer for a format
 * @param {string} format - Import format
 * @returns {Object|null}
 */
export function getImporter(format) {
  switch (format) {
    case Format.DOCX:
      return createDocxImporter()
    case Format.HTML:
      return createHtmlImporter()
    case Format.MARKDOWN:
      return createMarkdownImporter()
    case Format.JSON:
      return createJsonImporter()
    default:
      return null
  }
}

/**
 * Get an exporter for a format
 * @param {string} format - Export format
 * @returns {Object|null}
 */
export function getExporter(format) {
  switch (format) {
    case Format.DOCX:
      return createDocxExporter()
    case Format.HTML:
      return createHtmlExporter()
    case Format.MARKDOWN:
      return createMarkdownExporter()
    case Format.JSON:
      return createJsonExporter()
    case Format.PLAIN_TEXT:
      return createPlainTextExporter()
    default:
      return null
  }
}

/**
 * Get supported import formats
 * @returns {Array<string>}
 */
export function getSupportedImportFormats() {
  return [Format.DOCX, Format.HTML, Format.MARKDOWN, Format.JSON]
}

/**
 * Get supported export formats
 * @returns {Array<string>}
 */
export function getSupportedExportFormats() {
  return [Format.DOCX, Format.HTML, Format.MARKDOWN, Format.JSON, Format.PLAIN_TEXT]
}

export default {
  // Format types
  Format,

  // Import
  importDocument,
  getImporter,
  getSupportedImportFormats,

  // Export
  exportDocument,
  getExporter,
  getSupportedExportFormats,

  // Importers
  createDocxImporter,
  createHtmlImporter,
  createMarkdownImporter,
  createJsonImporter,

  // Exporters
  createDocxExporter,
  createHtmlExporter,
  createMarkdownExporter,
  createJsonExporter,
  createPlainTextExporter,
}
