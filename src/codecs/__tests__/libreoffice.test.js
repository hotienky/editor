import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'
import { createEmptyDocumentState } from '../../core/state'
import { exportDocx } from '../docx'

const execFileAsync = promisify(execFile)
const runWithLibreOffice = process.env.KINDY_TEST_LIBREOFFICE === '1' ? it : it.skip

runWithLibreOffice('opens the v2.2 golden DOCX in LibreOffice without repair', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kindy-libreoffice-'))
  const outputDirectory = join(directory, 'converted')
  const inputPath = join(directory, 'kindy-golden.docx')
  const outputPath = join(outputDirectory, 'kindy-golden.pdf')
  try {
    await mkdir(outputDirectory)
    const landscape = {
      id: 'section-landscape', size: { width: 21, height: 29.7 }, orientation: 'landscape',
      margin: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 }, pageNumberStart: 5,
      header: { enabled: true, text: 'Phụ lục hợp đồng' }, footer: { enabled: true, text: 'Trang ' },
    }
    const state = createEmptyDocumentState({
      page: {
        size: { width: 21, height: 29.7 }, orientation: 'portrait',
        margin: { top: 2, right: 2, bottom: 2, left: 2 },
        sections: [{
          id: 'section-main', size: { width: 21, height: 29.7 }, orientation: 'portrait',
          margin: { top: 2, right: 2, bottom: 2, left: 2 },
          header: { enabled: true, text: 'HỢP ĐỒNG' }, footer: { enabled: true, text: 'Trang ' },
        }, landscape],
      },
      content: { type: 'doc', content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'HỢP ĐỒNG NGUYÊN TẮC' }] },
        { type: 'table', content: [{ type: 'tableRow', content: [
          { type: 'tableCell', attrs: { colspan: 2, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bên A và Bên B' }] }] },
        ] }] },
        { type: 'sectionBreak', attrs: { id: 'break-landscape', type: 'nextPage', page: landscape } },
        { type: 'paragraph', content: [
          { type: 'text', text: 'Nội dung thêm', marks: [{ type: 'trackChange', attrs: { id: 'insert-1', type: 'insert', author: 'Legal', timestamp: 1_700_000_000_000 } }] },
        ] },
      ] },
    })
    const exported = await exportDocx(state, { profile: 'kindy-docx-v2.2' })
    await writeFile(inputPath, new Uint8Array(await exported.blob.arrayBuffer()))
    await execFileAsync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', outputDirectory, inputPath], { timeout: 60_000 })
    await expect(access(outputPath)).resolves.toBeUndefined()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 90_000)
