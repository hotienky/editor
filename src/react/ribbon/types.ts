import type { FormInstance } from 'antd'
import React from 'react'
import type Editor from '../../editor'
import {
  ListType,
  PageMode,
  PaperDirection,
  RowFlex,
  TextDecorationStyle,
  TitleLevel
} from '../../editor'

export interface RibbonProps {
  editor: Editor | null
  isCatalogOpen?: boolean
  onCatalogToggle?: () => void
  onCollapseChange?: (isCollapsed: boolean) => void
  className?: string
  style?: React.CSSProperties
}

export interface RibbonContextValue {
  editor: Editor | null
  activeTab: string
  setActiveTab: (tab: string) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void
  isCatalogOpen: boolean
  onCatalogToggle?: () => void

  // Editor states
  fontFamily: string
  setFontFamily: (font: string) => void
  fontSize: number
  setFontSize: (size: number) => void
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  underlineStyle: TextDecorationStyle
  setUnderlineStyle: (style: TextDecorationStyle) => void
  isStrikeout: boolean
  isSuperscript: boolean
  isSubscript: boolean
  color: string
  setColor: (color: string) => void
  highlight: string
  setHighlight: (color: string) => void
  titleLevel: TitleLevel | null
  setTitleLevel: (level: TitleLevel | null) => void
  rowFlex: RowFlex
  setRowFlex: (flex: RowFlex) => void
  listType: ListType | null
  setListType: (type: ListType | null) => void
  canUndo: boolean
  canRedo: boolean
  isPainterActive: boolean
  scale: number
  pageMode: PageMode
  paperSize: string
  setPaperSize: (size: string) => void
  paperDirection: PaperDirection
  setPaperDirection: (dir: PaperDirection) => void
  isFullscreen: boolean

  // Image preview
  previewImageSrc: string
  previewImageOpen: boolean
  setPreviewImageOpen: (open: boolean) => void

  // File Inputs
  fileInputRef: React.RefObject<HTMLInputElement | null>
  imageInputRef: React.RefObject<HTMLInputElement | null>
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleImageImport: (e: React.ChangeEvent<HTMLInputElement>) => void

  // Painter
  handlePainterClick: () => void
  handlePainterDblClick: () => void

  // Modals state & forms
  hyperlinkModalOpen: boolean
  setHyperlinkModalOpen: (open: boolean) => void
  codeModalOpen: boolean
  setCodeModalOpen: (open: boolean) => void
  latexModalOpen: boolean
  setLatexModalOpen: (open: boolean) => void
  watermarkModalOpen: boolean
  setWatermarkModalOpen: (open: boolean) => void
  marginModalOpen: boolean
  setMarginModalOpen: (open: boolean) => void
  pageSettingModalOpen: boolean
  setPageSettingModalOpen: (open: boolean) => void
  columnModalOpen: boolean
  setColumnModalOpen: (open: boolean) => void
  searchModalOpen: boolean
  setSearchModalOpen: (open: boolean) => void
  searchResultText: string
  setSearchResultText: (text: string) => void

  hyperlinkForm: FormInstance
  codeForm: FormInstance
  latexForm: FormInstance
  watermarkForm: FormInstance
  marginForm: FormInstance
  pageSettingForm: FormInstance
  columnForm: FormInstance
  searchForm: FormInstance

  // Helper actions
  openMarginModalWithCurrentSettings: () => void
  openPageSettingModal: () => void
}

export const FONT_FAMILIES = [
  { label: 'Segoe UI', value: 'Segoe UI' },
  { label: 'Nunito Sans', value: 'Nunito Sans' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Microsoft YaHei', value: 'Microsoft YaHei' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Ink Free', value: 'Ink Free' },
  { label: 'Fantasy', value: 'Fantasy' }
]

export const FONT_SIZES = [
  5, 5.5, 6.5, 7.5, 8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36,
  48, 56, 72
]

export const STYLE_PRESETS = [
  { label: 'Văn bản thường', level: null, font: 'Segoe UI', size: 11 },
  { label: 'Tiêu đề 1', level: TitleLevel.FIRST, font: 'Segoe UI', size: 18 },
  { label: 'Tiêu đề 2', level: TitleLevel.SECOND, font: 'Segoe UI', size: 14 },
  { label: 'Tiêu đề 3', level: TitleLevel.THIRD, font: 'Segoe UI', size: 12 },
  {
    label: 'Tiêu đề 4',
    level: TitleLevel.FOURTH,
    font: 'Segoe UI',
    size: 10.5
  }
]
