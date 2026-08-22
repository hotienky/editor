import fs from 'node:fs'
import path from 'node:path'

const VIRTUAL_ID = 'virtual:svg-icons-register'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

function renderSymbol(filePath, symbolId) {
  const source = fs.readFileSync(filePath, 'utf8')
  const match = source.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i)
  if (!match) throw new Error(`[kindy-svg-sprite] Invalid SVG: ${filePath}`)
  const attributes = match[1]
    .replace(/\s(?:xmlns|width|height)=(?:"[^"]*"|'[^']*')/gi, '')
    .trim()
  return `<symbol id="${symbolId}"${attributes ? ` ${attributes}` : ''}>${match[2]}</symbol>`
}

export function createKindySvgSpritePlugin({ iconDir, customDomId = 'kindy-icons' }) {
  const loadSprite = (pluginContext) => {
    const files = fs.readdirSync(iconDir)
      .filter((name) => name.endsWith('.svg'))
      .sort()
    const symbols = files.map((name) => {
      const filePath = path.join(iconDir, name)
      pluginContext?.addWatchFile(filePath)
      return renderSymbol(filePath, `kindy-icon-${path.basename(name, '.svg')}`)
    })
    return `<svg id="${customDomId}" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>`
  }

  return {
    name: 'kindy-svg-sprite',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      const sprite = loadSprite(this)
      return `
const sprite = ${JSON.stringify(sprite)};
function mountKindySprite() {
  if (typeof document === 'undefined' || !document.body) return;
  const current = document.getElementById(${JSON.stringify(customDomId)});
  if (current) current.outerHTML = sprite;
  else document.body.insertAdjacentHTML('afterbegin', sprite);
}
if (typeof document !== 'undefined') {
  if (document.body) mountKindySprite();
  else document.addEventListener('DOMContentLoaded', mountKindySprite, { once: true });
}
export default sprite;
`
    },
  }
}
