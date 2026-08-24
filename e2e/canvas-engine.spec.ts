import { expect, test } from '@playwright/test'

const pages = (page: import('@playwright/test').Page) => page.locator('.ce-page-container canvas[data-index]')

test.describe('CanvasEngine editor', () => {
  test('mounts the CanvasEngine Vietnamese contract UI', async ({ page }) => {
    await page.goto('./?kindy-benchmark=1')

    await expect(page.locator('.word-editor-app')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tệp', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Chèn', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bố cục', exact: true })).toBeVisible()
    await expect(pages(page).first()).toBeVisible()
    await expect(page.locator('.status-text').filter({ hasText: 'Trang:' })).toBeVisible()
  })

  test('keeps the ribbon usable and confines page overflow on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('./')

    await expect(page.getByRole('button', { name: 'Tệp', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Chèn', exact: true })).toBeVisible()
    await expect(page.locator('.canvas-scroll-container')).toBeVisible()
    const rootOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(rootOverflow).toBe(0)
    expect(await page.locator('.canvas-scroll-container').evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  })

  test('uses an A4 paper box and scales page, content and ruler together', async ({ page }) => {
    await page.goto('./')
    const firstPage = pages(page).first()
    await expect(firstPage).toBeVisible()

    const baseline = await firstPage.evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height }
    })
    expect(baseline.width).toBeCloseTo((210 / 25.4) * 96, 0)
    expect(baseline.height).toBeCloseTo((297 / 25.4) * 96, 0)

    for (let step = 0; step < 5; step += 1) {
      await page.locator('.zoom-btn').first().click()
    }
    const zoomed = await firstPage.evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height }
    })
    expect(zoomed.width).toBeCloseTo(baseline.width * 0.5, 0)
    expect(Math.abs(zoomed.height - baseline.height * 0.5)).toBeLessThanOrEqual(1)
  })

  test('creates a physical page after the page-break command', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Chèn', exact: true }).click()
    const pageBreak = page.getByRole('button', { name: 'Ngắt trang', exact: true })
    await expect(pageBreak).toBeVisible()
    const initialCount = await pages(page).count()

    await pageBreak.click()

    await expect.poll(() => pages(page).count()).toBeGreaterThan(initialCount)
  })

  test('exposes real header and footer editing zones', async ({ page }) => {
    await page.goto('./?kindy-benchmark=1')
    await page.getByRole('button', { name: 'Bố cục', exact: true }).click()

    const headerAction = page.getByText('Sửa đầu trang (Header)', { exact: true })
    await expect(headerAction).toBeVisible()
    await expect(page.getByText('Sửa chân trang (Footer)', { exact: true })).toBeVisible()
    await headerAction.click()
    await expect.poll(() => page.evaluate(() => (
      (window as any).__KINDY_CANVAS_BENCHMARK__?.getCanvasEditor().command.getRangeContext()?.zone
    ))).toBe('header')
  })

  test('materializes only a bounded canvas window for a multi-page document', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Chèn', exact: true }).click()
    const pageBreak = page.getByRole('button', { name: 'Ngắt trang', exact: true })
    for (let index = 0; index < 12; index += 1) await pageBreak.click()
    await expect.poll(() => pages(page).count()).toBeGreaterThanOrEqual(10)

    const allocation = await pages(page).evaluateAll((canvases) => ({
      total: canvases.length,
      materialized: canvases.filter((canvas) => canvas.width > 1 && canvas.height > 1).length,
    }))
    expect(allocation.total).toBeGreaterThanOrEqual(10)
    expect(allocation.materialized).toBeLessThanOrEqual(5)
  })

  test('lays out 200 manual pages in one browser transaction without 200 backing bitmaps', async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto('./?kindy-benchmark=1')

    const result = await page.evaluate(() => {
      const canvasEditor = (window as any).__KINDY_CANVAS_BENCHMARK__?.getCanvasEditor()
      if (!canvasEditor) throw new Error('CanvasEngine test handle is unavailable')
      const main: Array<Record<string, unknown>> = []
      for (let index = 0; index < 200; index += 1) {
        main.push({ value: `Trang ${index + 1} — nội dung kiểm thử hợp đồng tiếng Việt.\n` })
        if (index < 199) main.push({ type: 'pageBreak', value: '\n' })
      }
      const startedAt = performance.now()
      canvasEditor.command.executeSetValue({ header: [], main, footer: [] })
      const layoutMs = performance.now() - startedAt
      const canvases = [...document.querySelectorAll<HTMLCanvasElement>('.ce-page-container canvas[data-index]')]
      return {
        layoutMs,
        total: canvases.length,
        materialized: canvases.filter((canvas) => canvas.width > 1 && canvas.height > 1).length,
      }
    })

    expect(result.total).toBe(200)
    expect(result.materialized).toBeLessThanOrEqual(5)
    expect(result.layoutMs).toBeLessThan(5_000)
    console.info(`[canvas-benchmark] pages=${result.total} layoutMs=${result.layoutMs.toFixed(1)} backingBitmaps=${result.materialized}`)
  })

  test('toggles the comments sidebar without injecting sample comments', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Xem', exact: true }).click()
    const commentBtn = page.getByRole('button', { name: 'Bình luận', exact: true })
    await expect(commentBtn).toBeVisible()
    await commentBtn.click()

    const commentsSidebar = page.locator('.comments-sidebar')
    await expect(commentsSidebar).toBeVisible()
    await expect(commentsSidebar.getByText('Chưa có bình luận nào')).toBeVisible()
    await expect(page.locator('.comment-card')).toHaveCount(0)
  })
})
