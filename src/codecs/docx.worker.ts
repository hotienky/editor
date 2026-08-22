/// <reference lib="webworker" />
import * as mammoth from 'mammoth/mammoth.browser'
import { extractDocxPackage } from './docx'

self.onmessage = async (event: MessageEvent<{ id: string; buffer: ArrayBuffer; limits?: Record<string, number> }>) => {
  const { id, buffer, limits } = event.data
  try {
    const file = new Blob([buffer])
    const parts = await extractDocxPackage(file, limits)
    const converted = await mammoth.convertToHtml({ arrayBuffer: buffer }, { includeDefaultStyleMap: true })
    self.postMessage({ id, ok: true, html: converted.value, messages: converted.messages, parts })
  } catch (error) {
    self.postMessage({ id, ok: false, error: { message: error instanceof Error ? error.message : String(error), code: (error as any)?.code || 'IMPORT_FAILED' } })
  }
}
