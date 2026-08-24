import {
  AppstoreOutlined,
  BorderOutlined,
  FileTextOutlined,
  SettingOutlined,
  SplitCellsOutlined
} from '@ant-design/icons'
import { Form, Modal, Tabs, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { PageMode, PaperDirection } from '../../../editor'
import { useRibbon } from '../RibbonContext'
import {
  ColumnsTab,
  LayoutTab,
  MarginPreset,
  MarginUnit,
  MarginsTab,
  PAPER_PRESETS,
  PaperTab,
  PreviewBox,
  PreviewValues,
  convertUnit,
  fromMm,
  mmToPx,
  pxToMm,
  toMm
} from './pageSetting'

export const PageSettingModal: React.FC = () => {
  const {
    editor,
    pageSettingModalOpen,
    setPageSettingModalOpen,
    pageSettingForm,
    paperSize,
    setPaperSize,
    paperDirection,
    setPaperDirection,
    pageMode
  } = useRibbon()

  const [activeTabKey, setActiveTabKey] = useState<string>('margins')
  const [selectedUnit, setSelectedUnit] = useState<MarginUnit>('inch')
  const [selectedPaperKey, setSelectedPaperKey] = useState<string>(
    paperSize || 'a4'
  )
  const [currentDirection, setCurrentDirection] = useState<PaperDirection>(
    paperDirection || PaperDirection.VERTICAL
  )

  // Watch form values for live mini-preview (values normalized in mm)
  const [previewValues, setPreviewValues] = useState<PreviewValues>({
    topMm: 25.4,
    rightMm: 25.4,
    bottomMm: 25.4,
    leftMm: 25.4,
    gutterMm: 0,
    gutterPosition: 'left',
    headerMm: 7.9,
    footerMm: 7.9,
    columnCount: 1,
    columnSpacingMm: 5.3,
    columnSeparator: false,
    width: 794,
    height: 1123
  })

  useEffect(() => {
    if (pageSettingModalOpen && editor) {
      const margins = editor.command.getPaperMargin() || [96, 96, 96, 96]
      const curDirection = paperDirection || PaperDirection.VERTICAL
      const curSizeKey = paperSize || 'a4'
      const curPaper = PAPER_PRESETS[curSizeKey] || PAPER_PRESETS.a4

      const editorOpts = editor.command.getOptions?.()
      const headerTopPx = editorOpts?.header?.top ?? 30
      const footerBottomPx = editorOpts?.footer?.bottom ?? 30
      const headerTopMm = pxToMm(headerTopPx)
      const footerBottomMm = pxToMm(footerBottomPx)

      const gutterPx = editorOpts?.gutter ?? 0
      const gutterPos: 'left' | 'top' = editorOpts?.gutterPosition ?? 'left'
      const gutterMm = pxToMm(gutterPx)

      const curColumns = editor.command.getColumns?.()
      const colCount = curColumns?.count ?? 1
      const colGapPx = curColumns?.gap ?? 20
      const colGapMm = pxToMm(colGapPx)
      const colSeparator = curColumns?.separator ?? false

      setSelectedPaperKey(curSizeKey)
      setCurrentDirection(curDirection)

      const rawTopMm = pxToMm(margins[0])
      const rightMm = pxToMm(margins[1])
      const bottomMm = pxToMm(margins[2])
      const rawLeftMm = pxToMm(margins[3])

      const topMm = Math.max(0, rawTopMm - (gutterPos === 'top' ? gutterMm : 0))
      const leftMm = Math.max(0, rawLeftMm - (gutterPos === 'left' ? gutterMm : 0))

      const unit = selectedUnit
      const initialValues = {
        unit,
        top: fromMm(topMm, unit),
        right: fromMm(rightMm, unit),
        bottom: fromMm(bottomMm, unit),
        left: fromMm(leftMm, unit),
        gutter: fromMm(gutterMm, unit),
        gutterPosition: gutterPos,
        headerDistance: fromMm(headerTopMm, unit),
        footerDistance: fromMm(footerBottomMm, unit),
        columnCount: colCount,
        columnSpacing: fromMm(colGapMm, unit),
        columnSeparator: colSeparator,
        paperKey: curSizeKey,
        customWidth: curPaper.width,
        customHeight: curPaper.height,
        direction: curDirection,
        pageMode: pageMode || PageMode.PAGING,
        pageGap: 20
      }

      pageSettingForm.setFieldsValue(initialValues)
      setPreviewValues({
        topMm,
        rightMm,
        bottomMm,
        leftMm,
        gutterMm,
        gutterPosition: gutterPos,
        headerMm: headerTopMm,
        footerMm: footerBottomMm,
        columnCount: colCount,
        columnSpacingMm: colGapMm,
        columnSeparator: colSeparator,
        width: initialValues.customWidth,
        height: initialValues.customHeight
      })
    }
  }, [pageSettingModalOpen, editor])

  /**
   * Instant unit switch: Convert current input numbers to the new unit immediately
   */
  const handleUnitChange = (newUnit: MarginUnit) => {
    if (newUnit === selectedUnit) return

    const currentValues = pageSettingForm.getFieldsValue()
    const curTop = Number(currentValues.top) || 0
    const curRight = Number(currentValues.right) || 0
    const curBottom = Number(currentValues.bottom) || 0
    const curLeft = Number(currentValues.left) || 0
    const curGutter = Number(currentValues.gutter) || 0
    const curHeader = Number(currentValues.headerDistance) || 0
    const curFooter = Number(currentValues.footerDistance) || 0
    const curSpacing = Number(currentValues.columnSpacing) || 0

    const convertedTop = convertUnit(curTop, selectedUnit, newUnit)
    const convertedRight = convertUnit(curRight, selectedUnit, newUnit)
    const convertedBottom = convertUnit(curBottom, selectedUnit, newUnit)
    const convertedLeft = convertUnit(curLeft, selectedUnit, newUnit)
    const convertedGutter = convertUnit(curGutter, selectedUnit, newUnit)
    const convertedHeader = convertUnit(curHeader, selectedUnit, newUnit)
    const convertedFooter = convertUnit(curFooter, selectedUnit, newUnit)
    const convertedSpacing = convertUnit(curSpacing, selectedUnit, newUnit)

    pageSettingForm.setFieldsValue({
      unit: newUnit,
      top: convertedTop,
      right: convertedRight,
      bottom: convertedBottom,
      left: convertedLeft,
      gutter: convertedGutter,
      headerDistance: convertedHeader,
      footerDistance: convertedFooter,
      columnSpacing: convertedSpacing
    })

    setSelectedUnit(newUnit)

    // Update preview with normalized mm
    setPreviewValues(prev => ({
      ...prev,
      topMm: toMm(convertedTop, newUnit),
      rightMm: toMm(convertedRight, newUnit),
      bottomMm: toMm(convertedBottom, newUnit),
      leftMm: toMm(convertedLeft, newUnit),
      gutterMm: toMm(convertedGutter, newUnit),
      headerMm: toMm(convertedHeader, newUnit),
      footerMm: toMm(convertedFooter, newUnit),
      columnSpacingMm: toMm(convertedSpacing, newUnit)
    }))
  }

  const handleApplyPreset = (preset: MarginPreset) => {
    const top = fromMm(preset.top, selectedUnit)
    const right = fromMm(preset.right, selectedUnit)
    const bottom = fromMm(preset.bottom, selectedUnit)
    const left = fromMm(preset.left, selectedUnit)

    pageSettingForm.setFieldsValue({
      top,
      right,
      bottom,
      left
    })

    setPreviewValues(prev => ({
      ...prev,
      topMm: preset.top,
      rightMm: preset.right,
      bottomMm: preset.bottom,
      leftMm: preset.left
    }))
  }

  const handleApplyColumnPreset = (
    type: 'one' | 'two' | 'three' | 'left' | 'right'
  ) => {
    let count = 1
    if (type === 'one') count = 1
    else if (type === 'two' || type === 'left' || type === 'right') count = 2
    else if (type === 'three') count = 3

    pageSettingForm.setFieldsValue({
      columnCount: count
    })

    setPreviewValues(prev => ({
      ...prev,
      columnCount: count
    }))
  }

  const handlePaperKeyChange = (key: string) => {
    setSelectedPaperKey(key)
    if (key !== 'custom' && PAPER_PRESETS[key]) {
      const { width, height } = PAPER_PRESETS[key]
      pageSettingForm.setFieldsValue({
        customWidth: width,
        customHeight: height
      })
      setPreviewValues(prev => ({
        ...prev,
        width,
        height
      }))
    }
  }

  const handleFormValuesChange = (_: any, allValues: any) => {
    const curUnit = selectedUnit
    setPreviewValues({
      topMm: toMm(Number(allValues.top) || 0, curUnit),
      rightMm: toMm(Number(allValues.right) || 0, curUnit),
      bottomMm: toMm(Number(allValues.bottom) || 0, curUnit),
      leftMm: toMm(Number(allValues.left) || 0, curUnit),
      gutterMm: toMm(Number(allValues.gutter) || 0, curUnit),
      gutterPosition: allValues.gutterPosition || 'left',
      headerMm: toMm(Number(allValues.headerDistance) || 0, curUnit),
      footerMm: toMm(Number(allValues.footerDistance) || 0, curUnit),
      columnCount: Number(allValues.columnCount) || 1,
      columnSpacingMm: toMm(Number(allValues.columnSpacing) || 0, curUnit),
      columnSeparator: !!allValues.columnSeparator,
      width: Number(allValues.customWidth) || 794,
      height: Number(allValues.customHeight) || 1123
    })
    if (allValues.direction) {
      setCurrentDirection(allValues.direction)
    }
  }

  const handleOk = () => {
    pageSettingForm.validateFields().then(values => {
      if (!editor) return

      try {
        const allFormValues = {
          ...pageSettingForm.getFieldsValue(),
          ...values
        }

        const curUnit = selectedUnit
        const topMm = toMm(Number(allFormValues.top) || 0, curUnit)
        const rightMm = toMm(Number(allFormValues.right) || 0, curUnit)
        const bottomMm = toMm(Number(allFormValues.bottom) || 0, curUnit)
        const leftMm = toMm(Number(allFormValues.left) || 0, curUnit)
        const gutterMm = toMm(Number(allFormValues.gutter) || 0, curUnit)
        const gutterPos = (allFormValues.gutterPosition || 'left') as
          | 'left'
          | 'top'
        const gutterPx = mmToPx(gutterMm)

        // 1. Save Gutter into options and apply
        const editorOpts = editor.command.getOptions?.()
        if (editorOpts) {
          editorOpts.gutter = gutterPx
          editorOpts.gutterPosition = gutterPos
        }
        if (editor.command.executeSetGutter) {
          editor.command.executeSetGutter({
            width: gutterPx,
            position: gutterPos
          })
        }

        // 2. Apply Margins taking Gutter into account
        const effectiveTopMm = topMm + (gutterPos === 'top' ? gutterMm : 0)
        const effectiveLeftMm = leftMm + (gutterPos === 'left' ? gutterMm : 0)

        const marginPx: [number, number, number, number] = [
          mmToPx(effectiveTopMm),
          mmToPx(rightMm),
          mmToPx(bottomMm),
          mmToPx(effectiveLeftMm)
        ]
        editor.command.executeSetPaperMargin(marginPx)

        // 3. Apply Header & Footer distance (top/bottom offsets)
        const headerMm = toMm(
          Number(allFormValues.headerDistance) || 0,
          curUnit
        )
        const footerMm = toMm(
          Number(allFormValues.footerDistance) || 0,
          curUnit
        )
        const headerTopPx = mmToPx(headerMm)
        const footerBottomPx = mmToPx(footerMm)

        if (editorOpts) {
          if (editorOpts.header) {
            editorOpts.header.top = headerTopPx
          }
          if (editorOpts.footer) {
            editorOpts.footer.bottom = footerBottomPx
          }
        }

        // 4. Apply Multi-columns
        const colCount = Number(allFormValues.columnCount) || 1
        const colSpacingMm = toMm(
          Number(allFormValues.columnSpacing) || 0,
          curUnit
        )
        const colGapPx = Math.max(5, mmToPx(colSpacingMm) || 20)
        const colSeparator = !!allFormValues.columnSeparator

        if (editor.command.executeSetColumns) {
          editor.command.executeSetColumns({
            count: colCount,
            gap: colGapPx,
            separator: colSeparator
          })
        }

        // 5. Apply Paper Size safely
        const targetPaperKey = allFormValues.paperKey || paperSize || 'a4'
        if (targetPaperKey === 'custom') {
          const w = Number(allFormValues.customWidth) || 794
          const h = Number(allFormValues.customHeight) || 1123
          editor.command.executePaperSize(w, h)
          setPaperSize('custom')
        } else if (PAPER_PRESETS[targetPaperKey]) {
          const { width, height } = PAPER_PRESETS[targetPaperKey]
          editor.command.executePaperSize(width, height)
          setPaperSize(targetPaperKey)
        }

        // 6. Apply Paper Direction safely
        const targetDirection =
          allFormValues.direction || paperDirection || PaperDirection.VERTICAL
        if (targetDirection !== paperDirection) {
          editor.command.executePaperDirection(targetDirection)
          setPaperDirection(targetDirection)
        }

        // 7. Apply Page Mode safely
        const targetPageMode =
          allFormValues.pageMode || pageMode || PageMode.PAGING
        if (targetPageMode !== pageMode) {
          editor.command.executePageMode(targetPageMode)
        }

        setPageSettingModalOpen(false)
        message.success('Đã áp dụng cài đặt trang thành công')
      } catch (err) {
        console.error('Error applying page settings:', err)
        setPageSettingModalOpen(false)
      }
    })
  }

  const isLandscape = currentDirection === PaperDirection.HORIZONTAL

  // Calculate dynamic column width
  const curPageWidthMm = pxToMm(previewValues.width)
  const availableWidthMm = Math.max(
    10,
    curPageWidthMm - previewValues.leftMm - previewValues.rightMm
  )
  const calculatedColWidthMm =
    previewValues.columnCount > 1
      ? Math.max(
          5,
          (availableWidthMm -
            (previewValues.columnCount - 1) *
              previewValues.columnSpacingMm) /
            previewValues.columnCount
        )
      : availableWidthMm
  const calculatedColWidth = fromMm(calculatedColWidthMm, selectedUnit)

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined style={{ color: '#2b7de9' }} />
          <span>Cài đặt trang (Page Setup)</span>
        </div>
      }
      open={pageSettingModalOpen}
      onOk={handleOk}
      onCancel={() => setPageSettingModalOpen(false)}
      width={800}
      destroyOnHidden
      okText="Áp dụng"
      cancelText="Hủy"
    >
      <Form
        form={pageSettingForm}
        layout="vertical"
        onValuesChange={handleFormValuesChange}
        style={{ marginTop: 8 }}
      >
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Left Form Content */}
          <div style={{ flex: 1 }}>
            <Tabs
              activeKey={activeTabKey}
              onChange={setActiveTabKey}
              items={[
                {
                  key: 'margins',
                  forceRender: true,
                  label: (
                    <span>
                      <BorderOutlined /> Lề trang (Margins)
                    </span>
                  ),
                  children: (
                    <MarginsTab
                      selectedUnit={selectedUnit}
                      onUnitChange={handleUnitChange}
                      onApplyPreset={handleApplyPreset}
                    />
                  )
                },
                {
                  key: 'paper',
                  forceRender: true,
                  label: (
                    <span>
                      <FileTextOutlined /> Khổ giấy & Hướng
                    </span>
                  ),
                  children: (
                    <PaperTab
                      selectedPaperKey={selectedPaperKey}
                      onPaperKeyChange={handlePaperKeyChange}
                    />
                  )
                },
                {
                  key: 'layout',
                  forceRender: true,
                  label: (
                    <span>
                      <AppstoreOutlined /> Bố cục trang
                    </span>
                  ),
                  children: (
                    <LayoutTab
                      selectedUnit={selectedUnit}
                      onUnitChange={handleUnitChange}
                    />
                  )
                },
                {
                  key: 'columns',
                  forceRender: true,
                  label: (
                    <span>
                      <SplitCellsOutlined /> Chia cột (Columns)
                    </span>
                  ),
                  children: (
                    <ColumnsTab
                      selectedUnit={selectedUnit}
                      currentColumnCount={previewValues.columnCount}
                      calculatedColWidth={calculatedColWidth}
                      onApplyColumnPreset={handleApplyColumnPreset}
                    />
                  )
                }
              ]}
            />
          </div>

          {/* Right Live Mini-Preview */}
          <PreviewBox
            isLandscape={isLandscape}
            previewValues={previewValues}
            selectedUnit={selectedUnit}
            calculatedColWidth={calculatedColWidth}
          />
        </div>
      </Form>
    </Modal>
  )
}
