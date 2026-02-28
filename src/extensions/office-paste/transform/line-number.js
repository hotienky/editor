import { unwrapNode } from '../utils'

export const transformRemoveLineNumberWrapper = (html) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, `text/html`)
  const lineNumbers = doc.querySelectorAll(`[class*="MsoLineNumber"]`)
  lineNumbers.forEach((node) => unwrapNode(node))

  return doc.documentElement.outerHTML
}
