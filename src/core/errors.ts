export const DOCUMENT_ERROR_CODES = [
  'DOCX_INVALID',
  'DOCX_UNSUPPORTED',
  'IMPORT_FAILED',
  'EXPORT_FAILED',
  'ADAPTER_ERROR',
  'NETWORK_ERROR',
  'VERSION_CONFLICT',
  'DOCUMENT_NOT_FOUND',
  'OPERATION_CANCELLED',
] as const

export type DocumentErrorCode = (typeof DOCUMENT_ERROR_CODES)[number]

export class DocumentLibraryError extends Error {
  readonly code: DocumentErrorCode
  readonly status?: number
  readonly details?: unknown

  constructor(code: DocumentErrorCode, message: string, options: { status?: number; details?: unknown; cause?: unknown } = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'DocumentLibraryError'
    this.code = code
    this.status = options.status
    this.details = options.details
  }
}

export function toDocumentLibraryError(error: unknown, fallback: DocumentErrorCode = 'ADAPTER_ERROR') {
  if (error instanceof DocumentLibraryError) return error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new DocumentLibraryError('OPERATION_CANCELLED', 'Operation was cancelled.', { cause: error })
  }
  const message = error instanceof Error ? error.message : String(error || 'Unknown error')
  return new DocumentLibraryError(fallback, message, { cause: error })
}
