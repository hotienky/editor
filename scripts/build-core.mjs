import { build } from 'esbuild'
import ts from 'typescript'

await Promise.all([
  build({ entryPoints: ['src/core/index.ts'], outfile: 'dist/kindy-core.js', bundle: true, format: 'esm', platform: 'neutral', target: 'es2022' }),
  build({ entryPoints: ['src/core/index.ts'], outfile: 'dist/kindy-core.cjs', bundle: true, format: 'cjs', platform: 'node', target: 'node20' }),
])

const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.core.json')
if (!configPath) throw new Error('tsconfig.core.json was not found.')
const loaded = ts.readConfigFile(configPath, ts.sys.readFile)
if (loaded.error) throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'))
const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, process.cwd())
const program = ts.createProgram(parsed.fileNames, parsed.options)
const emitted = program.emit()
const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitted.diagnostics)
if (diagnostics.length) {
  const host = { getCanonicalFileName: (name) => name, getCurrentDirectory: ts.sys.getCurrentDirectory, getNewLine: () => ts.sys.newLine }
  throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host))
}

