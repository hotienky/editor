import { expect, test } from '@playwright/test'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { unzipSync } from 'fflate'

const realDocxPath = process.env.KINDY_REAL_DOCX

test.describe('Document Library workspace', () => {
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
