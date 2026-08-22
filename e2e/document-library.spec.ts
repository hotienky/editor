import { expect, test } from '@playwright/test'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'

test.describe('Document Library workspace', () => {
  test('import → edit → autosave → version → restore → export → print', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => pageErrors.push(error))

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
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible()

    const editor = page.locator('.kindy-editor')
    await editor.fill('HỢP ĐỒNG KIỂM THỬ\nĐiều 1. Nội dung đã được chỉnh sửa trực tiếp.')
    await expect(page.getByRole('status').filter({ hasText: 'Có thay đổi chưa lưu' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible({ timeout: 8_000 })

    await editor.fill('HỢP ĐỒNG KIỂM THỬ\nĐiều 1. Nội dung phiên bản thứ hai.')
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
    await expect(page.getByRole('button', { name: /199 Ký tự/ })).toBeVisible()
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
