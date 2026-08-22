import { expect, test } from '@playwright/test'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { unzipSync } from 'fflate'

const realDocxPath = process.env.KINDY_REAL_DOCX

test.describe('Document Library workspace', () => {
  test('keeps a fixed A4 layout coordinate system while zooming', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: /Hợp đồng nguyên tắc/i }).click()

    const surface = page.locator('.kindy-page-editor-wrap')
    const zoomOut = page.locator('.kindy-zoom-level-bar button').nth(0)
    const zoomIn = page.locator('.kindy-zoom-level-bar button').nth(1)
    await expect(surface).toBeVisible()

    const readMetrics = () => surface.evaluate((element) => {
      const surfaceRect = element.getBoundingClientRect()
      const shellRect = element.parentElement!.getBoundingClientRect()
      const editor = element.querySelector<HTMLElement>('.kindy-editor')!
      const style = getComputedStyle(element)
      const overlays = [...element.querySelectorAll<HTMLElement>(
        '.kindy-gdocs-header-zone, .kindy-gdocs-footer-zone, .kindy-page-repeated-header, .kindy-page-repeated-footer',
      )]
      return {
        zoom: Number(style.getPropertyValue('--page-zoom')),
        logicalWidth: (element as HTMLElement).offsetWidth,
        logicalHeight: (element as HTMLElement).offsetHeight,
        visualWidth: surfaceRect.width,
        visualHeight: surfaceRect.height,
        shellWidth: shellRect.width,
        shellHeight: shellRect.height,
        editorLogicalWidth: editor.offsetWidth,
        editorLogicalHeight: editor.offsetHeight,
        horizontalOverflow: editor.scrollWidth - editor.clientWidth,
        overlayOverflow: overlays.some((overlay) => overlay.scrollWidth > overlay.clientWidth + 1),
      }
    })

    const baseline = await readMetrics()
    const a4WidthPx = (210 / 25.4) * 96
    const a4HeightPx = (297 / 25.4) * 96
    expect(baseline.zoom).toBe(1)
    expect(baseline.logicalWidth).toBeCloseTo(a4WidthPx, 0)
    expect(baseline.logicalHeight).toBeCloseTo(a4HeightPx, 0)
    expect(baseline.horizontalOverflow).toBeLessThanOrEqual(0)
    expect(baseline.overlayOverflow).toBe(false)

    for (let step = 0; step < 5; step += 1) await zoomOut.click()
    const zoomedOut = await readMetrics()
    expect(zoomedOut.zoom).toBe(0.5)
    expect(zoomedOut.logicalWidth).toBe(baseline.logicalWidth)
    expect(zoomedOut.logicalHeight).toBe(baseline.logicalHeight)
    expect(zoomedOut.editorLogicalWidth).toBe(baseline.editorLogicalWidth)
    expect(zoomedOut.editorLogicalHeight).toBe(baseline.editorLogicalHeight)
    expect(zoomedOut.visualWidth).toBeCloseTo(baseline.visualWidth * 0.5, 0)
    expect(zoomedOut.visualHeight).toBeCloseTo(baseline.visualHeight * 0.5, 0)
    expect(zoomedOut.shellWidth).toBeCloseTo(zoomedOut.visualWidth, 0)
    expect(zoomedOut.shellHeight).toBeCloseTo(zoomedOut.visualHeight, 0)
    expect(zoomedOut.horizontalOverflow).toBeLessThanOrEqual(0)
    expect(zoomedOut.overlayOverflow).toBe(false)

    for (let step = 0; step < 15; step += 1) await zoomIn.click()
    const zoomedIn = await readMetrics()
    expect(zoomedIn.zoom).toBe(2)
    expect(zoomedIn.logicalWidth).toBe(baseline.logicalWidth)
    expect(zoomedIn.logicalHeight).toBe(baseline.logicalHeight)
    expect(zoomedIn.editorLogicalWidth).toBe(baseline.editorLogicalWidth)
    expect(zoomedIn.editorLogicalHeight).toBe(baseline.editorLogicalHeight)
    expect(zoomedIn.visualWidth).toBeCloseTo(baseline.visualWidth * 2, 0)
    expect(zoomedIn.visualHeight).toBeCloseTo(baseline.visualHeight * 2, 0)
    expect(zoomedIn.shellWidth).toBeCloseTo(zoomedIn.visualWidth, 0)
    expect(zoomedIn.shellHeight).toBeCloseTo(zoomedIn.visualHeight, 0)
    expect(zoomedIn.horizontalOverflow).toBeLessThanOrEqual(0)
    expect(zoomedIn.overlayOverflow).toBe(false)
  })

  test('imports the real contract header image and exposes page navigation', async ({ page }, testInfo) => {
    test.skip(!realDocxPath, 'Set KINDY_REAL_DOCX to run the local golden-corpus check.')
    test.setTimeout(60_000)
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => pageErrors.push(error))
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto('./')
    await page.locator('.kindy-explorer input[type="file"]').setInputFiles(realDocxPath!)

    const importedHeader = page.locator('.kindy-gdocs-hf-banner img').first()
    await expect(importedHeader).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => importedHeader.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(700)

    const pageStatus = page.getByRole('button', { name: /Trang \d+ trên \d+/ })
    await expect(pageStatus).toBeVisible()
    await expect.poll(async () => {
      const label = await pageStatus.getAttribute('aria-label')
      return Number(label?.match(/trên (\d+)/)?.[1] || 0)
    }, { timeout: 20_000 }).toBeGreaterThan(1)
    const totalPages = Number((await pageStatus.getAttribute('aria-label'))?.match(/trên (\d+)/)?.[1])
    await page.locator('.kindy-zoomable-container').evaluate((element) => {
      element.scrollTop = element.scrollHeight
      element.dispatchEvent(new Event('scroll'))
    })
    await expect(pageStatus).toHaveAttribute('aria-label', `Trang ${totalPages} trên ${totalPages}`)

    const signatureA = page.locator('.kindy-editor').getByText('ĐẠI DIỆN BÊN A', { exact: true }).last()
    const signatureB = page.locator('.kindy-editor').getByText('ĐẠI DIỆN BÊN B', { exact: true }).last()
    await expect(signatureA).toBeVisible()
    await expect(signatureB).toBeVisible()
    const signatureParagraph = signatureA.locator('xpath=ancestor::p[1]')
    await expect(signatureParagraph.locator('.kindy-docx-tab')).toHaveCount(2)
    const signatureGeometry = await signatureParagraph.evaluate((paragraph) => {
      const tabs = [...paragraph.querySelectorAll<HTMLElement>('.kindy-docx-tab')]
      const bounds = paragraph.getBoundingClientRect()
      const scale = bounds.width / (paragraph as HTMLElement).offsetWidth
      return {
        paragraphLeft: bounds.left,
        scale,
        tabWidths: tabs.map((tab) => Number.parseFloat(tab.style.width) || 0),
        tabPositions: tabs.map((tab) => Number(tab.dataset.position)),
      }
    })
    const [signatureABox, signatureBBox] = await Promise.all([signatureA.boundingBox(), signatureB.boundingBox()])
    expect(signatureGeometry.tabWidths.every((width) => width > 0)).toBe(true)
    expect(signatureGeometry.tabPositions[0]).toBeCloseTo(1800 / 567, 2)
    expect(signatureGeometry.tabPositions[1]).toBeCloseTo(7560 / 567, 2)
    const pxPerCm = 96 / 2.54
    const expectedCenterA = signatureGeometry.paragraphLeft + (signatureGeometry.tabPositions[0] * pxPerCm * signatureGeometry.scale)
    const expectedCenterB = signatureGeometry.paragraphLeft + (signatureGeometry.tabPositions[1] * pxPerCm * signatureGeometry.scale)
    expect(Math.abs((signatureABox!.x + signatureABox!.width / 2) - expectedCenterA)).toBeLessThan(12)
    expect(Math.abs((signatureBBox!.x + signatureBBox!.width / 2) - expectedCenterB)).toBeLessThan(12)
    await mkdir('.artifacts', { recursive: true })
    await page.screenshot({ path: '.artifacts/real-docx-signature.png', fullPage: false })

    const automaticBreak = page.locator('.kindy-page-break-decoration').first()
    await expect(automaticBreak).toBeAttached()
    const repeatedHeader = automaticBreak.locator('.kindy-page-repeated-header img')
    await expect(repeatedHeader).toBeAttached()
    await expect.poll(() => repeatedHeader.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(700)
    expect(await automaticBreak.getAttribute('data-page')).toBeNull()
    expect(await automaticBreak.evaluate((element) => getComputedStyle(element, '::after').content)).toBe('none')
    await automaticBreak.evaluate((element) => element.scrollIntoView({ block: 'start' }))
    await mkdir('.artifacts', { recursive: true })
    await page.screenshot({ path: '.artifacts/real-docx-page-2.png', fullPage: false })

    await page.locator('.kindy-zoomable-container').evaluate((element) => {
      element.scrollTop = 0
      element.dispatchEvent(new Event('scroll'))
    })
    await expect(pageStatus).toHaveAttribute('aria-label', `Trang 1 trên ${totalPages}`)
    await page.screenshot({ path: '.artifacts/real-docx-import.png', fullPage: false })
    await testInfo.attach('real-docx-import.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    })

    // Imported Word comments are formatting metadata, not protected content.
    // The commented signature placeholder must remain ordinary editable text.
    const signaturePlaceholder = page.locator('.kindy-editor [data-comment]').filter({ hasText: '…' }).last()
    await signaturePlaceholder.scrollIntoViewIfNeeded()
    await expect(signaturePlaceholder).toBeVisible()
    await expect(page.locator('.kindy-editor')).toHaveAttribute('contenteditable', 'true')
    const signatureCommentId = await signaturePlaceholder.getAttribute('data-comment')
    expect(signatureCommentId).toBeTruthy()
    const signatureComment = page.locator(`.kindy-editor [data-comment="${signatureCommentId}"]`)
    const placeholderText = await signaturePlaceholder.textContent()
    expect(placeholderText?.length).toBeGreaterThan(1)
    const placeholderBox = await signaturePlaceholder.boundingBox()
    expect(placeholderBox).not.toBeNull()
    await page.mouse.move(placeholderBox!.x + placeholderBox!.width - 1, placeholderBox!.y + placeholderBox!.height / 2)
    await page.mouse.down()
    await page.mouse.move(placeholderBox!.x + 1, placeholderBox!.y + placeholderBox!.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(placeholderText)
    await page.keyboard.press('Backspace')
    await expect(signatureComment).not.toBeAttached()
    await expect(page.getByRole('status').filter({ hasText: 'Có thay đổi chưa lưu' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible({ timeout: 8_000 })

    const importedDocument = page.getByRole('button', { name: /20260401|HD mua ban Solar/i }).first()
    await page.getByRole('button', { name: /Hợp đồng nguyên tắc/i }).click()
    await expect(page.locator('.kindy-editor')).toContainText('HỢP ĐỒNG NGUYÊN TẮC')
    await importedDocument.click()
    await expect(page.locator(`.kindy-editor [data-comment="${signatureCommentId}"]`)).toHaveCount(0)
    expect(pageErrors).toEqual([])
  })

  test('import → edit → autosave → version → restore → export → print', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => {
      console.error(error.stack || error.message)
      pageErrors.push(error)
    })

    await page.goto('./')
    await expect(page.getByRole('region', { name: 'Document library workspace' })).toBeVisible()

    const [sampleDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Tải DOCX mẫu để test import' }).click(),
    ])
    const samplePath = testInfo.outputPath('kindy-docx-profile-sample.docx')
    await sampleDownload.saveAs(samplePath)
    expect((await stat(samplePath)).size).toBeGreaterThan(1_000)

    await page.locator('.kindy-explorer input[type="file"]').setInputFiles(samplePath)
    await expect(page.getByRole('button', { name: /kindy-docx-profile-sample/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'HỢP ĐỒNG NGUYÊN TẮC' })).toBeVisible()
    const importedImage = page.locator('img[data-kindy-inline-image]').first()
    await expect(importedImage).toBeVisible()
    await expect.poll(() => importedImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible()

    await importedImage.click()
    await expect(page.locator('.kindy-editor-bubble-menu')).toBeVisible()

    const [originalDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Tải DOCX', exact: true }).click(),
    ])
    const originalPath = testInfo.outputPath('workspace-original.docx')
    await originalDownload.saveAs(originalPath)
    expect(await readFile(originalPath)).toEqual(await readFile(samplePath))

    const editor = page.locator('.kindy-editor')
    await editor.click()
    await editor.press('ControlOrMeta+A')
    const bubbleMenu = page.locator('.kindy-editor-bubble-menu')
    await expect(bubbleMenu).toBeVisible()
    const bubbleLayout = await bubbleMenu.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        flexWrap: style.flexWrap,
        overflowX: style.overflowX,
      }
    })
    expect(bubbleLayout).toMatchObject({ flexWrap: 'nowrap', overflowX: 'auto' })
    expect(bubbleLayout.top).toBeGreaterThanOrEqual(0)
    expect(bubbleLayout.left).toBeGreaterThanOrEqual(0)
    expect(bubbleLayout.right).toBeLessThanOrEqual(bubbleLayout.viewportWidth)
    expect(bubbleLayout.bottom).toBeLessThanOrEqual(bubbleLayout.viewportHeight)
    await editor.type('HỢP ĐỒNG KIỂM THỬ')
    await editor.press('Enter')
    await editor.type('Điều 1. Nội dung đã được chỉnh sửa trực tiếp.')
    await expect(page.getByRole('status').filter({ hasText: 'Có thay đổi chưa lưu' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible({ timeout: 8_000 })

    await editor.press('ControlOrMeta+A')
    await editor.type('HỢP ĐỒNG KIỂM THỬ')
    await editor.press('Enter')
    await editor.type('Điều 1. Nội dung phiên bản thứ hai.')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page.getByText('2 phiên bản')).toBeVisible()

    const versionOne = page.locator('.kindy-versions__list > li').filter({ hasText: 'v1' })
    await versionOne.getByRole('button', { name: 'Xem' }).click()
    await expect(page.getByText('Đang xem phiên bản v1')).toBeVisible()
    await expect(editor).toHaveAttribute('contenteditable', 'false')
    await page.getByRole('button', { name: 'Quay lại bản hiện hành' }).first().click()
    await expect(editor).toContainText('Nội dung phiên bản thứ hai')

    await versionOne.getByRole('button', { name: 'Khôi phục' }).click()
    await expect(page.getByText('3 phiên bản')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible()

    const [exportDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Tải DOCX', exact: true }).click(),
    ])
    const exportedPath = testInfo.outputPath('workspace-export.docx')
    await exportDownload.saveAs(exportedPath)
    const exported = await readFile(exportedPath)
    expect(exported.byteLength).toBeGreaterThan(1_000)
    expect(exported.subarray(0, 2).toString('ascii')).toBe('PK')
    const exportedArchive = unzipSync(exported)
    expect(Object.keys(exportedArchive).some((name) => name.startsWith('word/media/'))).toBe(true)

    const versionTwo = page.locator('.kindy-versions__list > li').filter({ hasText: 'v2' })
    await versionTwo.getByRole('button', { name: 'Khôi phục' }).click()
    await expect(editor).toContainText('Nội dung phiên bản thứ hai')
    await page.getByRole('button', { name: 'In / PDF', exact: true }).click()
    const printFrame = page.locator('iframe').last()
    await expect.poll(async () => (await printFrame.getAttribute('srcdoc'))?.length || 0).toBeGreaterThan(1_000)
    const srcdoc = await printFrame.getAttribute('srcdoc')
    expect(srcdoc).toContain('@page')
    expect(srcdoc).toContain('HỢP ĐỒNG KIỂM THỬ')

    expect(pageErrors).toEqual([])
  })

  test('opening a document does not create a false dirty state', async ({ page }) => {
    await page.goto('./')
    await expect.poll(() => page.locator('#kindy-icons symbol').count()).toBeGreaterThan(190)
    await page.getByRole('button', { name: /Hợp đồng nguyên tắc/ }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ký tự/ })).toBeVisible()
  })

  test('contract editing matrix persists formatting, lists, page breaks and undo/redo to DOCX', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => pageErrors.push(error))
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto('./')
    const [sampleDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Tải DOCX mẫu để test import' }).click(),
    ])
    const samplePath = testInfo.outputPath('editing-matrix-source.docx')
    await sampleDownload.saveAs(samplePath)
    await page.locator('.kindy-explorer input[type="file"]').setInputFiles(samplePath)
    await expect(page.getByRole('heading', { name: 'HỢP ĐỒNG NGUYÊN TẮC' })).toBeVisible()

    const editor = page.locator('.kindy-editor')
    await editor.click()
    await editor.press('ControlOrMeta+A')
    await editor.type('NỘI DUNG HỢP ĐỒNG')
    await editor.press('Enter')
    const formattedText = 'Điều khoản chỉnh sửa'
    await editor.type(formattedText)
    const formattedRun = editor.getByText(formattedText, { exact: true }).last()
    await formattedRun.click({ clickCount: 3 })
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString().trim())).toBe(formattedText)
    await page.keyboard.press('ControlOrMeta+b')
    await page.keyboard.press('ControlOrMeta+i')
    await page.keyboard.press('ControlOrMeta+u')
    await expect(formattedRun).toBeVisible()
    await expect(editor.locator('b').filter({ hasText: formattedText })).toBeVisible()
    await expect(editor.locator('em').filter({ hasText: formattedText })).toBeVisible()
    await expect(editor.locator('u').filter({ hasText: formattedText })).toBeVisible()

    const formattedBox = await formattedRun.boundingBox()
    expect(formattedBox).not.toBeNull()
    await page.mouse.click(
      formattedBox!.x + formattedBox!.width - 2,
      formattedBox!.y + formattedBox!.height / 2,
    )
    await page.keyboard.press('End')
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() || '')).toBe('')
    await expect(editor).toContainText(formattedText)
    await page.keyboard.press('Enter')
    await expect(editor).toContainText(formattedText)
    await page.keyboard.type('1. ')
    await expect(editor.locator('ol')).toHaveCount(1)
    await page.keyboard.type('Điều khoản thứ nhất')
    await expect(editor).toContainText(formattedText)
    await page.keyboard.press('ControlOrMeta+Enter')
    await page.keyboard.type('PHỤ LỤC')
    await expect(editor.locator('.kindy-page-break')).toHaveCount(1)
    await expect(editor).toContainText(formattedText)

    // ProseMirror groups adjacent typing transactions for 500ms. Separate the
    // next edit so undo/redo represents one visible user action.
    await page.waitForTimeout(650)
    await page.keyboard.type(' BẢN 2')
    await expect(editor).toContainText('PHỤ LỤC BẢN 2')
    await expect(editor).toContainText(formattedText)
    await page.waitForTimeout(650)
    const platformModifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${platformModifier}+z`)
    await expect(editor).not.toContainText('PHỤ LỤC BẢN 2')
    await expect(editor).toContainText('PHỤ LỤC')
    await expect(editor).toContainText(formattedText)
    await page.keyboard.press(`${platformModifier}+y`)
    await expect(editor).toContainText('PHỤ LỤC BẢN 2')
    await expect(editor).toContainText(formattedText)

    await expect(page.getByRole('status').filter({ hasText: 'Có thay đổi chưa lưu' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible({ timeout: 8_000 })
    const importedDocument = page.getByRole('button', { name: /editing-matrix-source/i })
    await page.getByRole('button', { name: /Hợp đồng nguyên tắc/i }).click()
    await expect(editor).toContainText('HỢP ĐỒNG NGUYÊN TẮC')
    await importedDocument.click()
    await expect(editor).toContainText(formattedText)
    await expect(editor).toContainText('PHỤ LỤC')
    await expect(editor.locator('ol')).toHaveCount(1)
    await expect(editor.locator('.kindy-page-break')).toHaveCount(1)

    const [exportDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Tải DOCX', exact: true }).click(),
    ])
    const exportedPath = testInfo.outputPath('editing-matrix-export.docx')
    await exportDownload.saveAs(exportedPath)
    const exportedArchive = unzipSync(await readFile(exportedPath))
    const documentXml = new TextDecoder().decode(exportedArchive['word/document.xml'])
    expect(documentXml).toContain('NỘI DUNG HỢP ĐỒNG')
    expect(documentXml).toContain(formattedText)
    expect(documentXml).toContain('<w:b')
    expect(documentXml).toContain('<w:i')
    expect(documentXml).toContain('<w:u')
    expect(documentXml).toContain('<w:numPr>')
    expect(documentXml).toContain('<w:br w:type="page"')
    expect(pageErrors).toEqual([])
  })
})

for (const corpus of [
  { variant: 'text', typingBudgetMs: 50 },
  { variant: 'mixed', typingBudgetMs: 75 },
] as const) {
  test(`100-page ${corpus.variant} document remains usable`, async ({ page }, testInfo) => {
    await page.goto(`./?benchmarkPages=100&benchmarkVariant=${corpus.variant}`)
    const result = page.locator('#benchmark-result')
    await expect(result).toContainText('100 trang', { timeout: 15_000 })

    const editor = page.locator('.kindy-editor')
    await editor.click()
    await editor.press('ControlOrMeta+End')
    for (let index = 0; index < 40; index += 1) await editor.type('x')

    await expect.poll(async () => {
      const samples = (await result.getAttribute('data-typing-samples')) || ''
      return samples.split(',').filter(Boolean).length
    }, { timeout: 10_000 }).toBeGreaterThanOrEqual(40)

    const text = await result.innerText()
    const openMs = Number(text.match(/^([\d.]+)ms/)?.[1])
    const typingP95Ms = Number(text.match(/typing p95 ([\d.]+)ms/)?.[1])
    const paginationMs = Number(text.match(/paginate ([\d.]+)ms/)?.[1])
    const samples = ((await result.getAttribute('data-typing-samples')) || '')
      .split(',')
      .filter(Boolean)
      .map(Number)
    const performanceResult = {
      generatedAt: new Date().toISOString(),
      browser: testInfo.project.name || 'chromium',
      buildMode: process.env.KINDY_E2E_BASE_URL ? 'external/dev' : 'production-preview',
      corpus: corpus.variant,
      pages: 100,
      openMs,
      typingP95Ms,
      typingMedianMs: samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)],
      typingMaxMs: Math.max(...samples),
      paginationMs,
      typingSamples: samples,
    }
    await mkdir('.artifacts', { recursive: true })
    await writeFile(`.artifacts/browser-performance-${corpus.variant}.json`, JSON.stringify(performanceResult, null, 2))
    await testInfo.attach(`browser-performance-${corpus.variant}.json`, {
      body: Buffer.from(JSON.stringify(performanceResult, null, 2)),
      contentType: 'application/json',
    })
    expect(openMs).toBeLessThanOrEqual(3_000)
    expect(typingP95Ms).toBeLessThanOrEqual(corpus.typingBudgetMs)
    expect(paginationMs).toBeLessThanOrEqual(500)
  })
}
