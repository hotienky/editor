import { useState, useEffect, useRef } from 'react'
import { Form, message } from 'antd'
import {
  ElementType,
  ListStyle,
  ListType,
  PageMode,
  PaperDirection,
  RowFlex,
  TextDecorationStyle,
  TitleLevel
} from '../../editor'
import type { RibbonContextValue, RibbonProps } from './types'

export function useRibbonState(props: RibbonProps): RibbonContextValue {
  const { editor, isCatalogOpen = false, onCatalogToggle } = props

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('home')
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)

  // Sync collapsed state with document.body and callback
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('ribbon-collapsed', isCollapsed)
    }
    props.onCollapseChange?.(isCollapsed)
  }, [isCollapsed, props.onCollapseChange])

  // Editor states
  const [fontFamily, setFontFamily] = useState<string>('Segoe UI')
  const [fontSize, setFontSize] = useState<number>(11)
  const [isBold, setIsBold] = useState<boolean>(false)
  const [isItalic, setIsItalic] = useState<boolean>(false)
  const [isUnderline, setIsUnderline] = useState<boolean>(false)
  const [underlineStyle, setUnderlineStyle] = useState<TextDecorationStyle>(
    TextDecorationStyle.SOLID
  )
  const [isStrikeout, setIsStrikeout] = useState<boolean>(false)
  const [isSuperscript, setIsSuperscript] = useState<boolean>(false)
  const [isSubscript, setIsSubscript] = useState<boolean>(false)
  const [color, setColor] = useState<string>('#000000')
  const [highlight, setHighlight] = useState<string>('#FFFF00')
  const [titleLevel, setTitleLevel] = useState<TitleLevel | null>(null)
  const [rowFlex, setRowFlex] = useState<RowFlex>(RowFlex.LEFT)
  const [, setRowMargin] = useState<number>(1)
  const [listType, setListType] = useState<ListType | null>(null)
  const [, setListStyle] = useState<ListStyle | null>(null)
  const [canUndo, setCanUndo] = useState<boolean>(false)
  const [canRedo, setCanRedo] = useState<boolean>(false)
  const [isPainterActive, setIsPainterActive] = useState<boolean>(false)
  const [scale, setScale] = useState<number>(100)
  const [pageMode, setPageMode] = useState<PageMode>(PageMode.PAGING)
  const [paperSize, setPaperSize] = useState<string>('a4')
  const [paperDirection, setPaperDirection] = useState<PaperDirection>(
    PaperDirection.VERTICAL
  )
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Image preview state
  const [previewImageSrc, setPreviewImageSrc] = useState<string>('')
  const [previewImageOpen, setPreviewImageOpen] = useState<boolean>(false)

  // Modal dialog states
  const [hyperlinkModalOpen, setHyperlinkModalOpen] = useState<boolean>(false)
  const [codeModalOpen, setCodeModalOpen] = useState<boolean>(false)
  const [latexModalOpen, setLatexModalOpen] = useState<boolean>(false)
  const [watermarkModalOpen, setWatermarkModalOpen] = useState<boolean>(false)
  const [marginModalOpen, setMarginModalOpen] = useState<boolean>(false)
  const [pageSettingModalOpen, setPageSettingModalOpen] = useState<boolean>(false)
  const [columnModalOpen, setColumnModalOpen] = useState<boolean>(false)
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false)
  const [searchResultText, setSearchResultText] = useState<string>('')

  // Forms
  const [hyperlinkForm] = Form.useForm()
  const [codeForm] = Form.useForm()
  const [latexForm] = Form.useForm()
  const [watermarkForm] = Form.useForm()
  const [marginForm] = Form.useForm()
  const [pageSettingForm] = Form.useForm()
  const [columnForm] = Form.useForm()
  const [searchForm] = Form.useForm()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  // Sync editor states
  useEffect(() => {
    if (!editor) return

    const handleRangeStyleChange = (payload: any) => {
      if (!payload) return
      setFontFamily(payload.font || 'Segoe UI')
      setFontSize(payload.size || 11)
      setIsBold(!!payload.bold)
      setIsItalic(!!payload.italic)
      setIsUnderline(!!payload.underline)
      setIsStrikeout(!!payload.strikeout)
      setIsSuperscript(payload.type === ElementType.SUPERSCRIPT)
      setIsSubscript(payload.type === ElementType.SUBSCRIPT)
      setColor(payload.color || '#000000')
      setHighlight(payload.highlight || '#FFFF00')
      setTitleLevel(payload.level || null)
      setRowFlex(payload.rowFlex || RowFlex.LEFT)
      setRowMargin(payload.rowMargin !== undefined ? payload.rowMargin : 1)
      setListType(payload.listType || null)
      setListStyle(payload.listStyle || null)
      setCanUndo(payload.undo !== undefined ? payload.undo : true)
      setCanRedo(payload.redo !== undefined ? payload.redo : true)
      setIsPainterActive(!!payload.painter)
    }

    const handlePageScaleChange = (val: number) => {
      setScale(Math.round(val * 100))
    }

    const handlePageModeChange = (mode: PageMode) => {
      setPageMode(mode)
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    const handleImageDblclick = (payload: any) => {
      if (!payload?.element?.value) return
      setPreviewImageSrc(payload.element.value)
      setPreviewImageOpen(true)
    }

    editor.listener.rangeStyleChange = handleRangeStyleChange
    editor.listener.pageScaleChange = handlePageScaleChange
    editor.listener.pageModeChange = handlePageModeChange
    editor.eventBus.on('imageDblclick', handleImageDblclick)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      editor.eventBus.off('imageDblclick', handleImageDblclick)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [editor])

  // File import handler
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      try {
        await editor.command.executeImportDocx(file)
        message.success('Đã mở file Word thành công')
      } catch {
        message.error('Không thể nhập file Word!')
      }
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string)
          editor.command.executeImportJson(json)
          message.success('Đã mở file JSON thành công')
        } catch {
          message.error('File JSON không hợp lệ!')
        }
      }
      reader.readAsText(file)
    }
    e.target.value = ''
  }

  // Image import handler
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      const value = reader.result as string
      const img = new Image()
      img.src = value
      img.onload = () => {
        editor.command.executeImage({
          value,
          width: img.width,
          height: img.height
        })
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Format Painter click & double-click
  let painterTimer: number
  const handlePainterClick = () => {
    window.clearTimeout(painterTimer)
    painterTimer = window.setTimeout(() => {
      editor?.command.executePainter({ isDblclick: false })
    }, 200)
  }
  const handlePainterDblClick = () => {
    window.clearTimeout(painterTimer)
    editor?.command.executePainter({ isDblclick: true })
  }

  const openMarginModalWithCurrentSettings = () => {
    const margins = editor?.command.getPaperMargin() || [58, 58, 58, 58]
    const toInch = (px: number) => Number((px / 96).toFixed(2))
    marginForm.setFieldsValue({
      top: toInch(margins[0]),
      right: toInch(margins[1]),
      bottom: toInch(margins[2]),
      left: toInch(margins[3])
    })
    setMarginModalOpen(true)
  }

  const openPageSettingModal = () => {
    setPageSettingModalOpen(true)
  }

  return {
    editor,
    activeTab,
    setActiveTab,
    isCollapsed,
    setIsCollapsed,
    isCatalogOpen,
    onCatalogToggle,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    isBold,
    isItalic,
    isUnderline,
    underlineStyle,
    setUnderlineStyle,
    isStrikeout,
    isSuperscript,
    isSubscript,
    color,
    setColor,
    highlight,
    setHighlight,
    titleLevel,
    setTitleLevel,
    rowFlex,
    setRowFlex,
    listType,
    setListType,
    canUndo,
    canRedo,
    isPainterActive,
    scale,
    pageMode,
    paperSize,
    setPaperSize,
    paperDirection,
    setPaperDirection,
    isFullscreen,
    fileInputRef,
    imageInputRef,
    handleFileImport,
    handleImageImport,
    handlePainterClick,
    handlePainterDblClick,
    previewImageSrc,
    previewImageOpen,
    setPreviewImageOpen,
    hyperlinkModalOpen,
    setHyperlinkModalOpen,
    codeModalOpen,
    setCodeModalOpen,
    latexModalOpen,
    setLatexModalOpen,
    watermarkModalOpen,
    setWatermarkModalOpen,
    marginModalOpen,
    setMarginModalOpen,
    pageSettingModalOpen,
    setPageSettingModalOpen,
    columnModalOpen,
    setColumnModalOpen,
    searchModalOpen,
    setSearchModalOpen,
    searchResultText,
    setSearchResultText,
    hyperlinkForm,
    codeForm,
    latexForm,
    watermarkForm,
    marginForm,
    pageSettingForm,
    columnForm,
    searchForm,
    openMarginModalWithCurrentSettings,
    openPageSettingModal
  }
}
