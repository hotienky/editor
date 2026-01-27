import { Fragment } from '@tiptap/pm/model'

export const updateFootnoteReferences = (tr) => {
  let count = 1
  const nodes = []
  tr.doc.descendants((node, pos) => {
    if (node.type.name === 'footnoteReference') {
      const next = `${count}`
      if (node.attrs.referenceNumber !== next) {
        tr.setNodeAttribute(pos, 'referenceNumber', next)
      }
      nodes.push(node)
      count += 1
    }
  })
  return nodes
}

const normalizeCaption = (value) => {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

const getFootnoteCaptionText = (footnote) => {
  const parts = []
  footnote.content.descendants((node) => {
    if (node.type.name !== 'paragraph') return
    const text = normalizeCaption(node.textContent)
    if (text) parts.push(text)
  })
  return normalizeCaption(parts.join(' '))
}

export const syncFootnoteReferenceCaptions = (tr) => {
  const idToCaption = {}
  tr.doc.descendants((node) => {
    if (node.type.name !== 'footnote') return
    const id = node.attrs?.['data-fn-id']
    if (!id) return
    const caption = getFootnoteCaptionText(node)
    if (caption) idToCaption[id] = caption
  })

  let changed = false
  tr.doc.descendants((node, pos) => {
    if (node.type.name !== 'footnoteReference') return
    const id = node.attrs?.['data-fn-id']
    if (!id) return
    const caption = idToCaption[id]
    if (!caption) return
    if (normalizeCaption(node.attrs?.caption) === caption) return
    tr.setNodeAttribute(pos, 'caption', caption)
    changed = true
  })
  return changed
}

const getFootnotes = (tr) => {
  let footnotesRange
  const footnotes = []
  tr.doc.descendants((node, pos) => {
    if (node.type.name === 'footnote') {
      footnotes.push(node)
    } else if (node.type.name === 'footnotes') {
      footnotesRange = { from: pos, to: pos + node.nodeSize }
    } else {
      return false
    }
  })
  return { footnotesRange, footnotes }
}

const isEmptyFootnoteContent = (footnote) => {
  if (!footnote || footnote.childCount !== 1) return false
  const first = footnote.firstChild
  if (!first || first.type.name !== 'paragraph') return false
  return first.content.size === 0
}

export const updateFootnotesList = (tr, state) => {
  const footnoteReferences = updateFootnoteReferences(tr)

  const footnoteType = state.schema.nodes.footnote
  const footnotesType = state.schema.nodes.footnotes
  const paragraphType = state.schema.nodes.paragraph

  const emptyParagraph = state.schema.nodeFromJSON({
    type: 'paragraph',
    content: [],
  })

  const { footnotesRange, footnotes } = getFootnotes(tr)

  // a mapping of footnote id -> footnote node
  const footnoteIds = footnotes.reduce((obj, footnote) => {
    obj[footnote.attrs['data-fn-id']] = footnote
    return obj
  }, {})

  const newFootnotes = []

  const footnoteRefIds = new Set(
    footnoteReferences.map((ref) => ref.attrs['data-fn-id']),
  )
  const deleteFootnoteIds = new Set()
  for (const footnote of footnotes) {
    const id = footnote.attrs['data-fn-id']
    if (!footnoteRefIds.has(id) || deleteFootnoteIds.has(id)) {
      deleteFootnoteIds.add(id)
      footnote.content.descendants((node) => {
        if (node.type.name === 'footnoteReference')
          deleteFootnoteIds.add(node.attrs['data-fn-id'])
      })
    }
  }

  for (let i = 0; i < footnoteReferences.length; i++) {
    const ref = footnoteReferences[i]
    const refId = ref.attrs['data-fn-id']
    if (deleteFootnoteIds.has(refId)) continue
    const initialCaption = normalizeCaption(ref.attrs?.caption)
    if (refId in footnoteIds) {
      const footnote = footnoteIds[refId]
      const nextContent =
        initialCaption && isEmptyFootnoteContent(footnote)
          ? Fragment.from([
              paragraphType.create(
                undefined,
                state.schema.text(initialCaption),
              ),
            ])
          : footnote.content
      newFootnotes.push(
        footnoteType.create(
          { ...footnote.attrs, id: `fn:${i + 1}` },
          nextContent,
        ),
      )
    } else {
      const content = initialCaption
        ? [paragraphType.create(undefined, state.schema.text(initialCaption))]
        : [emptyParagraph]
      const newNode = footnoteType.create(
        {
          'data-fn-id': refId,
          id: `fn:${i + 1}`,
        },
        content,
      )
      newFootnotes.push(newNode)
    }
  }

  if (newFootnotes.length === 0) {
    if (footnotesRange) {
      tr.delete(footnotesRange.from, footnotesRange.to)
    }
  } else if (!footnotesRange) {
    tr.insert(
      tr.doc.content.size,
      footnotesType.create(undefined, Fragment.from(newFootnotes)),
    )
  } else {
    tr.replaceWith(
      footnotesRange.from + 1,
      footnotesRange.to - 1,
      Fragment.from(newFootnotes),
    )
  }
}
