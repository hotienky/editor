// @ts-check
import { readFileSync } from 'node:fs'
import path from 'node:path'

const msgPath = process.argv[2] || path.resolve('.git/COMMIT_EDITMSG')
let msg = ''
try {
  msg = readFileSync(msgPath, 'utf-8').trim()
} catch {
  process.exit(0)
}

const commitRE =
  /^(revert: )?(feat|fix|docs|dx|style|refactor|perf|test|workflow|build|ci|chore|types|wip|release|improve)(\(.+\))?: .+/i

if (msg && !commitRE.test(msg) && !msg.startsWith('Merge ') && !msg.startsWith('Revert ')) {
  console.error(
    `[ERROR] Invalid commit message format:\n\n` +
      `  "${msg}"\n\n` +
      `Proper commit message format is required (Conventional Commits). Examples:\n\n` +
      `  feat: add page header\n` +
      `  fix: IME position error\n` +
      `  refactor: cleanup unused components\n`,
  )
  process.exit(1)
}
