import { parseStyleAttribute, unwrapNode } from '../utils'

export const transformRemoveBookmarks = (html) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, `text/html`)
  const bookmarks = doc.querySelectorAll(`[style*="mso-bookmark:"]`)
  bookmarks.forEach((node) => {
    const bookmark = parseStyleAttribute(node)[`mso-bookmark`]
    const bookmarkLink = doc.querySelector(`a[name="${bookmark}"]`)
    if (bookmarkLink) {
      unwrapNode(bookmarkLink)
    }
    unwrapNode(node)
  })

  return doc.documentElement.outerHTML
}
