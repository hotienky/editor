import { performance } from 'node:perf_hooks'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { computePagesFromHeights } from '../src/utils/dom-page-calculator.js'
import { countFixtureNodes, createLongDocumentFixture } from '../src/performance/long-document.js'

const assertBudgets = process.argv.includes('--assert')
const outputPath = process.argv.find((value) => value.startsWith('--output='))?.slice('--output='.length)
const requestedPages = process.argv
  .filter((value) => /^\d+$/.test(value))
  .map(Number)
const pageCounts = requestedPages.length ? requestedPages : [100, 200]

const percentile = (values, ratio) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))]
}

const measure = (operation, iterations) => {
  const samples = []
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now()
    operation()
    samples.push(performance.now() - startedAt)
  }
  return {
    medianMs: Number(percentile(samples, 0.5).toFixed(2)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(2)),
  }
}

const results = pageCounts.map((pages) => {
  const state = createLongDocumentFixture({ pages })
  const heights = Array.from({ length: pages * 14 }, () => ({
    height: 56,
    marginBefore: 8,
    forceBreak: false,
    avoidBreak: false,
  }))
  const json = JSON.stringify(state)
  const clone = measure(() => structuredClone(state), 25)
  const serialize = measure(() => JSON.stringify(state), 25)
  const paginate = measure(() => computePagesFromHeights(heights, 900), 250)
  const computedPages = computePagesFromHeights(heights, 900).length

  return {
    pages,
    topLevelBlocks: state.content.content.length,
    totalNodes: countFixtureNodes(state),
    jsonBytes: Buffer.byteLength(json),
    computedAutoPages: computedPages,
    clone,
    serialize,
    paginate,
  }
})

console.table(results.map((result) => ({
  pages: result.pages,
  blocks: result.topLevelBlocks,
  nodes: result.totalNodes,
  jsonKB: Number((result.jsonBytes / 1024).toFixed(1)),
  cloneP95: result.clone.p95Ms,
  stringifyP95: result.serialize.p95Ms,
  paginateP95: result.paginate.p95Ms,
})))
const report = { generatedAt: new Date().toISOString(), results }
console.log(JSON.stringify(report, null, 2))
if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
}

if (assertBudgets) {
  const failures = results.filter((result) => (
    result.clone.p95Ms > result.pages ||
    result.serialize.p95Ms > result.pages ||
    result.paginate.p95Ms > 20
  ))
  if (failures.length) {
    console.error('Long-document synthetic performance budget failed.')
    process.exitCode = 1
  }
}
