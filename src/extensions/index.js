import Bold from '@tiptap/extension-bold'
import Link from '@tiptap/extension-link'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Mathematics from '@tiptap/extension-mathematics'
import NodeRange from '@tiptap/extension-node-range'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'
import { TableOfContents } from '@tiptap/extension-table-of-contents'
import { TextStyleKit } from '@tiptap/extension-text-style'
import Typography from '@tiptap/extension-typography'
import {
  CharacterCount,
  Dropcursor,
  Focus,
  Placeholder,
  Selection,
  UndoRedo,
} from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'

import { l } from '@/composables/i18n'
import { useState } from '@/composables/state'
import { getImageDimensions } from '@/utils/file'
import { shortId } from '@/utils/short-id'

import Audio from './audio'
import Bookmark from './bookmark'
import BreakMarks from './break-marks'
import BulletList from './bullet-list'
import Callout from './callout'
import CodeBlock from './code-block'
import Datetime from './datetime'
import Echarts from './echarts'
import File from './file'
import FileHandler from './file-handler'
import FormatPainter from './format-painter'
import HorizontalRule from './horizontal-rule'
import Iframe from './iframe'
import { BlockImage, InlineImage } from './image'
import Indent from './indent'
import Margin from './margin'
import Mention from './mention'
import getUsersSuggestion from './mention/suggestion'
import NodeAlign from './node-align'
import NodeSelect from './node-select'
import OptionBox from './option-box'
import OrderedList from './ordered-list'
import PageBreak from './page-break'
import { Table, TableCell, TableHeader, TableRow } from './table'
import Tag from './tag'
import TextAlign from './text-align'
import TextBox from './text-box'
import Toc from './toc'
import typeWriter from './type-writer'
import Video from './video'

export const getDefaultExtensions = ({ container, options, uploadFileMap }) => {
  const { page, document: doc, users, file, disableExtensions } = options.value

  const EXTENSIONS = {
    'ordered-list': OrderedList,
    'bullet-list': BulletList,
    'task-list': TaskList,
    margin: Margin,
    link: Link.configure({
      openOnClick: false,
      enableClickSelection: true,
    }),
    image: BlockImage,
    inlineImage: InlineImage,
    video: Video,
    audio: Audio,
    'code-block': CodeBlock,
    symbol: Symbol,
    math: Mathematics.configure({
      katex: { throwOnError: false },
    }),
    tag: Tag,
    callout: Callout,
    mention: Mention.configure({
      suggestion: getUsersSuggestion(users ?? [], container),
    }),
    'date-time': Datetime,
    optionBox: OptionBox,
    bookmark: Bookmark.configure({
      class: 'umo-editor-bookmark',
    }),
    'hard-break': BreakMarks.configure({
      visible: page?.showBreakMarks,
    }),
    'horizontal-rule': HorizontalRule,
    toc: Toc,
    'text-box': TextBox,
    'web-page': Iframe,
  }

  const extensions = [
    StarterKit.configure({
      bold: false,
      bulletList: false,
      orderedList: false,
      codeBlock: false,
      horizontalRule: false,
      undoRedo: false,
      history: false,
      link: false,
      placeholder: false,
      dropcursor: false,
    }),
    TextStyleKit,
    UndoRedo.extend({
      addKeyboardShortcuts() {
        // 返回空对象表示移除所有默认快捷键
        return {}
      },
    }),
    Focus.configure({
      className: 'umo-node-focused',
      mode: 'all',
    }),
    Placeholder.configure({
      placeholder: () => String(l(doc?.placeholder ?? '')),
    }),
    NodeSelect,
    FormatPainter,
    Bold.extend({
      renderHTML: ({ HTMLAttributes }) => ['b', HTMLAttributes, 0],
    }),
    Subscript,
    Superscript,
    Indent,
    TextAlign,
    NodeAlign,
    TaskItem,

    // 插入
    File,

    // 表格
    Table.configure({
      allowTableNodeSelection: true,
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,

    // 工具
    Echarts,

    // 页面
    PageBreak,

    // 其他
    Selection.configure({
      className: 'umo-text-selection',
    }),
    NodeRange,
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      scrollParent: () =>
        document.querySelector(`${container} .umo-zoomable-container`),
      getId: () => shortId(6),
    }),
    Typography.configure(doc?.typographyRules),
    CharacterCount.configure({
      limit: doc?.characterLimit !== 0 ? doc?.characterLimit : undefined,
    }),
    FileHandler.configure({
      allowedMimeTypes: file?.allowedMimeTypes,
      onPaste: async (editor, files) => {
        // 记录 已有位置
        const pageContainer = document.querySelector(
          `${container} .umo-zoomable-container`,
        )
        const scrollTop = pageContainer?.scrollTop || 0
        for (const file of files) {
          const fileDim = await getImageDimensions(file)
          editor.commands.insertFile({
            file,
            uploadFileMap: uploadFileMap.value,
            autoType: true,
            fileDim,
          })
        }
        // 恢复滚动位置
        if (pageContainer) {
          // 使用 setTimeout 确保 DOM 更新完成后再恢复滚动位置
          setTimeout(() => {
            pageContainer.scrollTop = scrollTop
          }, 0)
        }
      },
      onDrop: (editor, files, pos) => {
        for (const file of files) {
          editor.commands.insertFile({
            file,
            uploadFileMap: uploadFileMap.value,
            autoType: true,
            pos,
          })
        }
      },
    }),
    Dropcursor.configure({
      color: 'var(--umo-primary-color)',
    }),
    typeWriter,
  ]

  // 合并扩展
  Object.values(EXTENSIONS).forEach((item) => {
    if (!disableExtensions?.includes(item.name)) {
      if (Array.isArray(item)) {
        extensions.push(...item)
        return
      }
      extensions.push(item)
    }
  })

  return extensions
}

export const inputAndPasteRules = (options) => {
  let enableRules = true
  const $document = useState('document', options)
  if (
    !options.value.document?.enableMarkdown ||
    !$document.value?.enableMarkdown
  ) {
    enableRules = [Mathematics, Typography, BlockImage]
  }
  return enableRules
}
