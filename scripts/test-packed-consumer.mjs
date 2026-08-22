import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { build } from 'vite'

const execFileAsync = promisify(execFile)
const artifactsDirectory = join(process.cwd(), '.artifacts')
await mkdir(artifactsDirectory, { recursive: true })
const directory = await mkdtemp(join(artifactsDirectory, 'packed-consumer-'))
const appDirectory = join(directory, 'app')
const packageDirectory = join(appDirectory, 'node_modules', 'kindy-editor')

try {
  const { stdout } = await execFileAsync(
    'npm',
    [
      'pack',
      '--ignore-scripts',
      '--json',
      '--cache',
      join(directory, 'npm-cache'),
      '--pack-destination',
      directory,
    ],
    { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 },
  )
  const [packed] = JSON.parse(stdout)
  if (!packed?.filename) throw new Error('npm pack did not return a tarball filename.')

  await mkdir(packageDirectory, { recursive: true })
  await execFileAsync('tar', [
    '-xzf',
    join(directory, packed.filename),
    '-C',
    packageDirectory,
    '--strip-components=1',
  ])

  const core = await import(
    `${pathToFileURL(join(packageDirectory, 'dist', 'kindy-core.js')).href}?smoke=${Date.now()}`
  )
  const state = core.createEmptyDocumentState()
  if (state.schemaVersion !== '2.0') throw new Error('Packed core returned an invalid state.')
  const require = createRequire(import.meta.url)
  const coreCommonJs = require(join(packageDirectory, 'dist', 'kindy-core.cjs'))
  if (coreCommonJs.createEmptyDocumentState().schemaVersion !== '2.0') {
    throw new Error('Packed CommonJS core returned an invalid state.')
  }

  await writeFile(
    join(appDirectory, 'index.html'),
    '<div id="app"></div><script type="module" src="/main.js"></script>',
  )
  await writeFile(
    join(appDirectory, 'main.js'),
    `import { createApp, h } from 'vue'
import { KindyDocumentLibrary, createMemoryDocumentAdapter } from 'kindy-editor'
import 'kindy-editor/style'

createApp({
  render: () => h(KindyDocumentLibrary, { adapter: createMemoryDocumentAdapter() }),
}).mount('#app')
`,
  )

  await build({
    root: appDirectory,
    configFile: false,
    logLevel: 'warn',
    build: { outDir: 'bundle', emptyOutDir: true, target: 'es2018' },
  })

  const bundleDirectory = join(appDirectory, 'bundle')
  await access(join(bundleDirectory, 'index.html'))
  const files = await readdir(bundleDirectory, { recursive: true })
  const worker = files.find((file) => /docx\.worker-.+\.js$/.test(file))
  if (!worker) throw new Error('Packed consumer bundle did not emit the DOCX worker.')
  if (!files.some((file) => file.endsWith('.css'))) {
    throw new Error('Packed consumer bundle did not include the public stylesheet.')
  }

  const JavaScriptFiles = files.filter(
    (file) => file.endsWith('.js') && !/docx\.worker-/.test(file),
  )
  const JavaScript = await Promise.all(
    JavaScriptFiles.map((file) => readFile(join(bundleDirectory, file), 'utf8')),
  )
  if (JavaScript.some((code) => code.includes('/kindy-editor/assets/docx.worker-'))) {
    throw new Error('Packed worker URL still contains the demo base path.')
  }

  console.log(`Packed consumer smoke passed (${packed.size} bytes, worker: ${worker}).`)
} finally {
  await rm(directory, { recursive: true, force: true })
}
