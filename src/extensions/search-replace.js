import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const searchReplaceKey = new PluginKey('kindySearchReplace')

const getRegex = (s, disableRegex, caseSensitive) => {
  return RegExp(
    disableRegex ? s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : s,
    caseSensitive ? 'gu' : 'gui',
  )
}

const processSearches = (doc, searchTerm, searchResultClass, resultIndex) => {
  const decorations = []
  const results = []

  let textNodesWithPosition = []
  let index = 0

  if (!searchTerm) {
    return {
      decorationsToReturn: DecorationSet.empty,
      results: [],
    }
  }

  doc?.descendants((node, pos) => {
    if (node.isText) {
      if (textNodesWithPosition[index]) {
        textNodesWithPosition[index] = {
          text: textNodesWithPosition[index].text + node.text,
          pos: textNodesWithPosition[index].pos,
        }
      } else {
        textNodesWithPosition[index] = {
          text: `${node.text}`,
          pos,
        }
      }
    } else {
      index += 1
    }
  })

  textNodesWithPosition = textNodesWithPosition.filter(Boolean)

  for (const element of textNodesWithPosition) {
    const { text, pos } = element
    const matches = Array.from(text.matchAll(searchTerm)).filter(
      ([matchText]) => matchText.trim(),
    )

    for (const m of matches) {
      if (m[0] === '') break

      if (m.index !== undefined) {
        results.push({
          from: pos + m.index,
          to: pos + m.index + m[0].length,
        })
      }
    }
  }

  for (let i = 0; i < results.length; i += 1) {
    const r = results[i]
    const className =
      i === resultIndex
        ? `${searchResultClass} ${searchResultClass}-current`
        : searchResultClass
    const decoration = Decoration.inline(r.from, r.to, {
      class: className,
    })

    decorations.push(decoration)
  }

  return {
    decorationsToReturn: DecorationSet.create(doc, decorations),
    results,
  }
}

const replace = (replaceTerm, results, { state, dispatch }) => {
  const [firstResult] = results

  if (!firstResult) return false

  const { from, to } = firstResult

  if (dispatch) dispatch(state.tr.insertText(replaceTerm, from, to))
  return true
}

const rebaseNextResult = (replaceTerm, index, lastOffset, results) => {
  const nextIndex = index + 1

  if (!results[nextIndex]) return null

  const { from: currentFrom, to: currentTo } = results[index]

  const offset = currentTo - currentFrom - replaceTerm.length + lastOffset

  const { from, to } = results[nextIndex]

  results[nextIndex] = {
    to: to - offset,
    from: from - offset,
  }

  return [offset, results]
}

const replaceAll = (replaceTerm, results, { tr, dispatch }) => {
  let offset = 0

  let resultsCopy = results.slice()

  if (!resultsCopy.length) return false

  for (let i = 0; i < resultsCopy.length; i += 1) {
    const { from, to } = resultsCopy[i]

    tr.insertText(replaceTerm, from, to)

    const rebaseNextResultResponse = rebaseNextResult(
      replaceTerm,
      i,
      offset,
      resultsCopy,
    )

    if (!rebaseNextResultResponse) continue
    ;[offset, resultsCopy] = rebaseNextResultResponse
  }

  if (dispatch) dispatch(tr)
  return true
}

export const SearchAndReplace = Extension.create({
  name: 'searchAndReplace',
  addOptions() {
    return {
      searchResultClass: 'kindy-search-result',
      disableRegex: true,
    }
  },
  addStorage() {
    return {
      searchTerm: '',
      replaceTerm: '',
      results: [],
      lastSearchTerm: '',
      caseSensitive: false,
      lastCaseSensitive: false,
      resultIndex: 0,
      lastResultIndex: 0,
    }
  },
  addCommands() {
    return {
      setSearchTerm:
        (searchTerm) =>
        ({ editor, state, dispatch }) => {
          editor.storage.searchAndReplace.searchTerm = searchTerm
          if (dispatch) dispatch(state.tr.setMeta(searchReplaceKey, 'refresh'))
          return true
        },
      setReplaceTerm:
        (replaceTerm) =>
        ({ editor }) => {
          editor.storage.searchAndReplace.replaceTerm = replaceTerm
          return true
        },
      setCaseSensitive:
        (caseSensitive) =>
        ({ editor, state, dispatch }) => {
          editor.storage.searchAndReplace.caseSensitive = caseSensitive
          if (dispatch) dispatch(state.tr.setMeta(searchReplaceKey, 'refresh'))
          return true
        },
      resetIndex:
        () =>
        ({ editor, state, dispatch }) => {
          editor.storage.searchAndReplace.resultIndex = 0
          if (dispatch) dispatch(state.tr.setMeta(searchReplaceKey, 'refresh'))
          return true
        },
      nextSearchResult:
        () =>
        ({ editor, state, dispatch }) => {
          const { results, resultIndex } = editor.storage.searchAndReplace

          const nextIndex = resultIndex + 1

          if (results[nextIndex]) {
            editor.storage.searchAndReplace.resultIndex = nextIndex
          } else {
            editor.storage.searchAndReplace.resultIndex = 0
          }

          if (dispatch) dispatch(state.tr.setMeta(searchReplaceKey, 'refresh'))
          return true
        },
      previousSearchResult:
        () =>
        ({ editor, state, dispatch }) => {
          const { results, resultIndex } = editor.storage.searchAndReplace

          const prevIndex = resultIndex - 1

          if (results[prevIndex]) {
            editor.storage.searchAndReplace.resultIndex = prevIndex
          } else {
            editor.storage.searchAndReplace.resultIndex = results.length - 1
          }

          if (dispatch) dispatch(state.tr.setMeta(searchReplaceKey, 'refresh'))
          return true
        },
      replace:
        () =>
        ({ editor, state, dispatch }) => {
          const { replaceTerm, results } = editor.storage.searchAndReplace

          return replace(replaceTerm, results, { state, dispatch })
        },
      replaceAll:
        () =>
        ({ editor, tr, dispatch }) => {
          const { replaceTerm, results } = editor.storage.searchAndReplace

          return replaceAll(replaceTerm, results, { tr, dispatch })
        },
    }
  },

  addProseMirrorPlugins() {
    const { editor } = this
    const { searchResultClass, disableRegex } = this.options

    const setLastSearchTerm = (t) =>
      (editor.storage.searchAndReplace.lastSearchTerm = t)
    const setLastCaseSensitive = (t) =>
      (editor.storage.searchAndReplace.lastCaseSensitive = t)
    const setLastResultIndex = (t) =>
      (editor.storage.searchAndReplace.lastResultIndex = t)

    return [
      new Plugin({
        key: searchReplaceKey,
        state: {
          init: () => DecorationSet.empty,
          apply({ doc, docChanged }, oldState) {
            const {
              searchTerm,
              lastSearchTerm,
              caseSensitive,
              lastCaseSensitive,
              resultIndex,
              lastResultIndex,
            } = editor.storage.searchAndReplace

            if (
              !docChanged &&
              lastSearchTerm === searchTerm &&
              lastCaseSensitive === caseSensitive &&
              lastResultIndex === resultIndex
            )
              return oldState

            setLastSearchTerm(searchTerm)
            setLastCaseSensitive(caseSensitive)
            setLastResultIndex(resultIndex)

            if (!searchTerm) {
              editor.storage.searchAndReplace.results = []
              return DecorationSet.empty
            }

            const { decorationsToReturn, results } = processSearches(
              doc,
              getRegex(searchTerm, disableRegex, caseSensitive),
              searchResultClass,
              resultIndex,
            )

            editor.storage.searchAndReplace.results = results

            return decorationsToReturn
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

export default SearchAndReplace
