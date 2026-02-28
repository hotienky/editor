export const transformMsoHtmlClasses = (html) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, `text/html`)
  doc.querySelectorAll(`p[class*="MsoNormal"]`).forEach((node) => {
    node.classList.remove(`MsoNormal`)
  })

  return doc.documentElement.outerHTML
}
