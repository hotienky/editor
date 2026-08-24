import {
    AppstoreOutlined,
    BorderOutlined,
    CheckOutlined,
    ColumnWidthOutlined,
    CompassOutlined,
    DownOutlined,
    EditOutlined,
    EyeOutlined,
    FileOutlined,
    FileTextOutlined,
    FormOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    HighlightOutlined,
    HistoryOutlined,
    LockOutlined,
    MinusOutlined,
    PlusOutlined,
    PrinterOutlined,
    SettingOutlined,
    SplitCellsOutlined,
    UnorderedListOutlined
} from '@ant-design/icons';
import {
    Button,
    Divider,
    Dropdown,
    Form,
    Input,
    InputNumber,
    MenuProps,
    Modal,
    Select,
    Space,
    Switch,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import React, { FC, useEffect, useState } from 'react';
import type Editor from '../editor';
import { EditorMode, PageMode, PaperDirection } from '../editor';

const { Text } = Typography

export interface FooterProps {
  editor?: Editor | null
  className?: string
  style?: React.CSSProperties
  isCatalogOpen?: boolean
  onCatalogToggle?: () => void
}

const PAPER_SIZES = [
  { label: 'A4', value: '794*1123' },
  { label: 'A2', value: '1593*2251' },
  { label: 'A3', value: '1125*1593' },
  { label: 'A5', value: '565*796' },
  { label: 'Phong bì số 5', value: '412*488' },
  { label: 'Phong bì số 6', value: '450*866' },
  { label: 'Phong bì số 7', value: '609*862' },
  { label: 'Phong bì số 9', value: '862*1221' },
  { label: 'Giấy pháp lý (Legal)', value: '813*1266' },
  { label: 'Khổ thư (Letter)', value: '813*1054' }
]

const MODE_CONFIG: {
  mode: EditorMode
  name: string
  icon: React.ReactNode
}[] = [
  { mode: EditorMode.EDIT, name: 'Chế độ chỉnh sửa', icon: <EditOutlined /> },
  { mode: EditorMode.CLEAN, name: 'Chế độ xem sạch', icon: <EyeOutlined /> },
  { mode: EditorMode.READONLY, name: 'Chế độ chỉ đọc', icon: <LockOutlined /> },
  { mode: EditorMode.FORM, name: 'Chế độ biểu mẫu', icon: <FormOutlined /> },
  { mode: EditorMode.PRINT, name: 'Chế độ in ấn', icon: <PrinterOutlined /> },
  { mode: EditorMode.DESIGN, name: 'Chế độ thiết kế', icon: <AppstoreOutlined /> },
  {
    mode: EditorMode.GRAFFITI,
    name: 'Chế độ vẽ tự do',
    icon: <HighlightOutlined />
  },
  { mode: EditorMode.TRACE, name: 'Chế độ ghi vết', icon: <HistoryOutlined /> }
]

export const Footer: FC<FooterProps> = ({
  editor,
  className = '',
  style,
  isCatalogOpen = false,
  onCatalogToggle
}) => {
  // Trạng thái hiển thị & dữ liệu editor
  const [pageMode, setPageMode] = useState<string>('paging')
  const [visiblePages, setVisiblePages] = useState<string>('1')
  const [pageNo, setPageNo] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(1)
  const [wordCount, setWordCount] = useState<number>(0)
  const [rowNo, setRowNo] = useState<number>(0)
  const [colNo, setColNo] = useState<number>(0)
  const [scale, setScale] = useState<number>(100)
  const [currentMode, setCurrentMode] = useState<EditorMode>(EditorMode.EDIT)
  const [traceEnabled, setTraceEnabled] = useState<boolean>(true)
  const [paperSize, setPaperSize] = useState<string>('794*1123')
  const [paperDirection, setPaperDirection] = useState<string>('vertical')
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Modals state
  const [marginModalVisible, setMarginModalVisible] = useState(false)
  const [columnModalVisible, setColumnModalVisible] = useState(false)
  const [optionModalVisible, setOptionModalVisible] = useState(false)

  const [marginForm] = Form.useForm()
  const [columnForm] = Form.useForm()
  const [optionForm] = Form.useForm()

  // Đồng bộ trạng thái ban đầu và đăng ký listener từ editor
  useEffect(() => {
    if (!editor) return

    const opts = editor.command.getOptions()
    if (opts.mode) setCurrentMode(opts.mode)
    if (opts.pageMode) setPageMode(opts.pageMode)
    if (opts.scale) setScale(Math.floor(opts.scale * 100))
    if (opts.trace) setTraceEnabled(!opts.trace.disabled)
    if (opts.paperDirection) setPaperDirection(opts.paperDirection)

    // Khởi tạo số từ
    editor.command.getWordCount().then(cnt => setWordCount(cnt || 0))

    // Lắng nghe thay đổi toàn màn hình
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [editor])

  // Lắng nghe các event từ editor thông qua listener
  useEffect(() => {
    if (!editor) return

    const prevVisiblePageNoListChange = editor.listener.visiblePageNoListChange
    editor.listener.visiblePageNoListChange = payload => {
      prevVisiblePageNoListChange?.(payload)
      const text = payload.map(i => i + 1).join(', ')
      setVisiblePages(text || '1')
    }

    const prevPageSizeChange = editor.listener.pageSizeChange
    editor.listener.pageSizeChange = payload => {
      prevPageSizeChange?.(payload)
      setPageSize(payload || 1)
    }

    const prevIntersectionPageNoChange =
      editor.listener.intersectionPageNoChange
    editor.listener.intersectionPageNoChange = payload => {
      prevIntersectionPageNoChange?.(payload)
      setPageNo(payload + 1)
    }

    const prevPageScaleChange = editor.listener.pageScaleChange
    editor.listener.pageScaleChange = payload => {
      prevPageScaleChange?.(payload)
      setScale(Math.floor(payload * 100))
    }

    const prevPageModeChange = editor.listener.pageModeChange
    editor.listener.pageModeChange = payload => {
      prevPageModeChange?.(payload)
      setPageMode(payload)
    }

    const prevRangeStyleChange = editor.listener.rangeStyleChange
    editor.listener.rangeStyleChange = payload => {
      prevRangeStyleChange?.(payload)
      const ctx = editor.command.getRangeContext()
      if (ctx) {
        setRowNo(ctx.startRowNo + 1)
        setColNo(ctx.startColNo + 1)
      }
    }

    const prevContentChange = editor.listener.contentChange
    editor.listener.contentChange = () => {
      prevContentChange?.()
      editor.command.getWordCount().then(cnt => setWordCount(cnt || 0))
    }
  }, [editor])

  // Xử lý chế độ editor
  const handleModeChange = (mode: EditorMode) => {
    if (!editor) return
    setCurrentMode(mode)
    editor.command.executeMode(mode)

    const isReadonly = mode === EditorMode.READONLY || mode === EditorMode.TRACE
    const enableMenuList = ['search', 'print', 'save']
    document.querySelectorAll<HTMLDivElement>('.menu-item>div').forEach(dom => {
      const menu = dom.dataset.menu
      isReadonly && (!menu || !enableMenuList.includes(menu))
        ? dom.classList.add('disable')
        : dom.classList.remove('disable')
    })
  }

  // Xử lý bật/tắt ghi vết
  const handleTraceToggle = (checked: boolean) => {
    if (!editor) return
    setTraceEnabled(checked)
    editor.command.executeToggleTrace(checked)
  }

  // Xử lý chế độ trang
  const handlePageModeChange = (mode: PageMode) => {
    if (!editor) return
    setPageMode(mode)
    editor.command.executePageMode(mode)
  }

  // Xử lý kích thước giấy
  const handlePaperSizeChange = (val: string) => {
    if (!editor) return
    setPaperSize(val)
    const [width, height] = val.split('*').map(Number)
    editor.command.executePaperSize(width, height)
  }

  // Xử lý hướng giấy
  const handlePaperDirectionChange = (val: string) => {
    if (!editor) return
    if (val.startsWith('section:')) {
      const dir = val.replace('section:', '')
      editor.command.executePageDirection(
        dir === 'inherit' ? null : (dir as PaperDirection)
      )
    } else {
      setPaperDirection(val)
      editor.command.executePaperDirection(val as PaperDirection)
    }
  }

  // Xử lý lề trang (đơn vị inch, 1 inch = 96 px)
  const openMarginModal = () => {
    if (!editor) return
    const margins = editor.command.getPaperMargin() || []
    const [top, right, bottom, left] = margins
    const toInch = (px?: number) =>
      px !== undefined && px !== null ? Number((px / 96).toFixed(2)) : 0.6
    marginForm.setFieldsValue({
      top: toInch(top),
      right: toInch(right),
      bottom: toInch(bottom),
      left: toInch(left)
    })
    setMarginModalVisible(true)
  }

  const handleMarginSubmit = () => {
    marginForm.validateFields().then(values => {
      if (!editor) return
      const toPx = (inch: number) => Math.round((Number(inch) || 0.6) * 96)
      editor.command.executeSetPaperMargin([
        toPx(values.top),
        toPx(values.right),
        toPx(values.bottom),
        toPx(values.left)
      ])
      setMarginModalVisible(false)
    })
  }

  // Xử lý chia cột
  const openColumnModal = () => {
    if (!editor) return
    const current = editor.command.getColumns()
    columnForm.setFieldsValue({
      count: current?.count ?? 1,
      gap: current?.gap ?? 20,
      separator: current?.separator ?? false
    })
    setColumnModalVisible(true)
  }

  const handleColumnSubmit = () => {
    columnForm.validateFields().then(values => {
      if (!editor) return
      editor.command.executeSetColumns({
        count: Number(values.count),
        gap: Number(values.gap),
        separator: Boolean(values.separator)
      })
      setColumnModalVisible(false)
    })
  }

  // Xử lý cấu hình editor
  const openOptionModal = () => {
    if (!editor) return
    const opts = editor.command.getOptions()
    optionForm.setFieldsValue({
      option: JSON.stringify(opts, null, 2)
    })
    setOptionModalVisible(true)
  }

  const handleOptionSubmit = () => {
    optionForm.validateFields().then(values => {
      if (!editor) return
      try {
        const newOpts = JSON.parse(values.option)
        editor.command.executeUpdateOptions(newOpts)
        setOptionModalVisible(false)
      } catch (err) {
        console.error('Invalid JSON options:', err)
      }
    })
  }

  // Xử lý toàn màn hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // Menus cho Dropdowns
  const pageModeMenuItems: MenuProps['items'] = [
    {
      key: 'paging',
      label: (
        <span
          data-page-mode="paging"
          className={pageMode === 'paging' ? 'active' : ''}
        >
          Từng trang (Paging)
        </span>
      ),
      icon:
        pageMode === 'paging' ? (
          <CheckOutlined />
        ) : (
          <span style={{ display: 'inline-block', width: 14 }} />
        ),
      onClick: () => handlePageModeChange(PageMode.PAGING)
    },
    {
      key: 'continuity',
      label: (
        <span
          data-page-mode="continuity"
          className={pageMode === 'continuity' ? 'active' : ''}
        >
          Cuộn liên tục (Continuity)
        </span>
      ),
      icon:
        pageMode === 'continuity' ? (
          <CheckOutlined />
        ) : (
          <span style={{ display: 'inline-block', width: 14 }} />
        ),
      onClick: () => handlePageModeChange(PageMode.CONTINUITY)
    }
  ]

  const editorModeMenuItems: MenuProps['items'] = MODE_CONFIG.map(item => {
    if (item.mode === EditorMode.TRACE) {
      return {
        key: item.mode,
        label: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: 180
            }}
            onClick={e => {
              e.stopPropagation()
            }}
          >
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => handleModeChange(item.mode)}
            >
              {item.name}
            </span>
            <Tooltip title="Bật/tắt ghi lại các thay đổi vào lịch sử vết">
              <Switch
                size="small"
                checked={traceEnabled}
                disabled={currentMode === EditorMode.TRACE}
                onChange={handleTraceToggle}
              />
            </Tooltip>
          </div>
        ),
        icon: item.icon,
        onClick: () => handleModeChange(item.mode)
      }
    }
    return {
      key: item.mode,
      label: item.name,
      icon: item.icon,
      onClick: () => handleModeChange(item.mode)
    }
  })

  const paperSizeMenuItems: MenuProps['items'] = PAPER_SIZES.map(item => ({
    key: item.value,
    label: (
      <span
        data-paper-size={item.value}
        className={paperSize === item.value ? 'active' : ''}
      >
        {item.label}
      </span>
    ),
    icon:
      paperSize === item.value ? (
        <CheckOutlined />
      ) : (
        <span style={{ display: 'inline-block', width: 14 }} />
      ),
    onClick: () => handlePaperSizeChange(item.value)
  }))

  const paperDirectionMenuItems: MenuProps['items'] = [
    {
      key: 'vertical',
      label: (
        <span
          data-paper-direction="vertical"
          className={paperDirection === 'vertical' ? 'active' : ''}
        >
          Dọc (Portrait)
        </span>
      ),
      icon:
        paperDirection === 'vertical' ? (
          <CheckOutlined />
        ) : (
          <span style={{ display: 'inline-block', width: 14 }} />
        ),
      onClick: () => handlePaperDirectionChange('vertical')
    },
    {
      key: 'horizontal',
      label: (
        <span
          data-paper-direction="horizontal"
          className={paperDirection === 'horizontal' ? 'active' : ''}
        >
          Ngang (Landscape)
        </span>
      ),
      icon:
        paperDirection === 'horizontal' ? (
          <CheckOutlined />
        ) : (
          <span style={{ display: 'inline-block', width: 14 }} />
        ),
      onClick: () => handlePaperDirectionChange('horizontal')
    },
    {
      type: 'divider'
    },
    {
      key: 'section-group',
      type: 'group',
      label: 'Trang chỉ định (Section)',
      children: [
        {
          key: 'section:horizontal',
          label: (
            <span data-section-direction="horizontal">Phần này nằm ngang</span>
          ),
          onClick: () => handlePaperDirectionChange('section:horizontal')
        },
        {
          key: 'section:vertical',
          label: (
            <span data-section-direction="vertical">Phần này nằm dọc</span>
          ),
          onClick: () => handlePaperDirectionChange('section:vertical')
        },
        {
          key: 'section:inherit',
          label: (
            <span data-section-direction="inherit">Theo mặc định chung</span>
          ),
          onClick: () => handlePaperDirectionChange('section:inherit')
        }
      ]
    }
  ]

  const currentModeInfo =
    MODE_CONFIG.find(m => m.mode === currentMode) || MODE_CONFIG[0]

  return (
    <div
      className={`footer-inner ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        fontSize: 12,
        userSelect: 'none',
        position: 'relative',
        ...style
      }}
    >
      {/* Khối bên trái: Mục lục, Chế độ trang, Thông số trang, từ, hàng, cột */}
      <Space size={6} align="center" style={{ flexShrink: 0 }}>
        {/* Toggle Catalog */}
        <Tooltip title="Mục lục">
          <Button
            type={isCatalogOpen ? 'primary' : 'text'}
            size="small"
            className="catalog-mode"
            icon={<UnorderedListOutlined />}
            onClick={onCatalogToggle}
            onMouseDown={e => e.preventDefault()}
            style={{ height: 24, padding: '0 6px' }}
          />
        </Tooltip>

        {/* Chế độ trang */}
        <Dropdown
          menu={{ items: pageModeMenuItems }}
          placement="topLeft"
          trigger={['click']}
        >
          <Tooltip title="Chế độ trang (Từng trang / Cuộn liên tục)">
            <Button
              type="text"
              size="small"
              className="page-mode"
              icon={<FileTextOutlined />}
              onMouseDown={e => e.preventDefault()}
              style={{ height: 24, padding: '0 6px' }}
            >
              <DownOutlined style={{ fontSize: 9, marginLeft: 2 }} />
            </Button>
          </Tooltip>
        </Dropdown>

        <Divider type="vertical" style={{ margin: '0 4px' }} />

        {/* Thông tin trang */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          Trang hiển thị:{' '}
          <Text strong className="page-no-list">
            {visiblePages}
          </Text>
        </Text>

        <Divider orientation="vertical" style={{ margin: '0 4px' }} />

        <Text type="secondary" style={{ fontSize: 12 }}>
          Trang:{' '}
          <Text strong>
            <span className="page-no">{pageNo}</span>/
            <span className="page-size">{pageSize}</span>
          </Text>
        </Text>

        <Divider orientation="vertical" style={{ margin: '0 4px' }} />

        {/* Số từ */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          Số từ:{' '}
          <Text strong className="word-count">
            {wordCount}
          </Text>
        </Text>

        <Divider orientation="vertical" style={{ margin: '0 4px' }} />

        {/* Hàng / Cột */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          Hàng:{' '}
          <Text strong className="row-no">
            {rowNo}
          </Text>
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Cột:{' '}
          <Text strong className="col-no">
            {colNo}
          </Text>
        </Text>
      </Space>

      {/* Khối ở giữa: Chế độ biên tập (Editor Mode) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Dropdown
          menu={{ items: editorModeMenuItems }}
          placement="top"
          trigger={['click']}
        >
          <Button
            size="small"
            className="editor-mode"
            onMouseDown={e => e.preventDefault()}
            style={{
              height: 24,
              fontSize: 12,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {currentModeInfo.icon}
            <span className="text">{currentModeInfo.name}</span>
            <DownOutlined style={{ fontSize: 9 }} />
          </Button>
        </Dropdown>
      </div>

      {/* Khối bên phải: Thu phóng, Kích thước giấy, Hướng giấy, Lề, Chia cột, Thước, Toàn màn hình, Cài đặt */}
      <Space size={4} align="center" style={{ flexShrink: 0 }}>
        {/* Thu nhỏ */}
        <Tooltip title="Thu nhỏ (Ctrl+-)" placement="top">
          <Button
            type="text"
            size="small"
            className="page-scale-minus"
            icon={<MinusOutlined style={{ fontSize: 11 }} />}
            onClick={() => editor?.command.executePageScaleMinus()}
            onMouseDown={e => e.preventDefault()}
            style={{ height: 24, width: 24, padding: 0 }}
          />
        </Tooltip>

        {/* Phần trăm phóng to/thu nhỏ */}
        <Tooltip title="Khôi phục 100% (Ctrl+0)" placement="top">
          <Tag
            className="page-scale-percentage"
            onClick={() => editor?.command.executePageScaleRecovery()}
            onMouseDown={e => e.preventDefault()}
            style={{
              margin: '0 2px',
              cursor: 'pointer',
              fontSize: 11,
              lineHeight: '20px',
              padding: '0 6px',
              borderRadius: 4
            }}
          >
            {scale}%
          </Tag>
        </Tooltip>

        {/* Phóng to */}
        <Tooltip title="Phóng to (Ctrl+=)" placement="top">
          <Button
            type="text"
            size="small"
            className="page-scale-add"
            icon={<PlusOutlined style={{ fontSize: 11 }} />}
            onClick={() => editor?.command.executePageScaleAdd()}
            onMouseDown={e => e.preventDefault()}
            style={{ height: 24, width: 24, padding: 0 }}
          />
        </Tooltip>

        <Divider type="vertical" style={{ margin: '0 4px' }} />

        {/* Kích thước giấy */}
        <Dropdown
          menu={{ items: paperSizeMenuItems }}
          placement="topRight"
          trigger={['click']}
        >
          <Tooltip title="Kích thước giấy" placement="top">
            <Button
              type="text"
              size="small"
              className="paper-size"
              icon={<FileOutlined />}
              onMouseDown={e => e.preventDefault()}
              style={{ height: 24, padding: '0 6px' }}
            >
              <DownOutlined style={{ fontSize: 9, marginLeft: 2 }} />
            </Button>
          </Tooltip>
        </Dropdown>

        {/* Hướng giấy */}
        <Dropdown
          menu={{ items: paperDirectionMenuItems }}
          placement="topRight"
          trigger={['click']}
        >
          <Tooltip title="Hướng giấy" placement="top">
            <Button
              type="text"
              size="small"
              className="paper-direction"
              icon={<CompassOutlined />}
              onMouseDown={e => e.preventDefault()}
              style={{ height: 24, padding: '0 6px' }}
            >
              <DownOutlined style={{ fontSize: 9, marginLeft: 2 }} />
            </Button>
          </Tooltip>
        </Dropdown>

        {/* Lề trang */}
        <Tooltip title="Lề trang" placement="topRight">
          <Button
            type="text"
            size="small"
            className="paper-margin"
            icon={<BorderOutlined />}
            onClick={openMarginModal}
            onMouseDown={e => e.preventDefault()}
            style={{ height: 24, width: 24, padding: 0 }}
          />
        </Tooltip>

        {/* Chia cột */}
        <Tooltip title="Chia cột" placement="topRight">
          <Button
            type="text"
            size="small"
            className="column-config"
            icon={<SplitCellsOutlined />}
            onClick={openColumnModal}
            onMouseDown={e => e.preventDefault()}
            style={{ height: 24, width: 24, padding: 0 }}
          />
        </Tooltip>

        {/* Thước đo */}
        <Tooltip title="Thước đo" placement="topRight">
          <Button
            type="text"
            size="small"
            className="ruler-toggle"
            icon={<ColumnWidthOutlined />}
            onClick={() => editor?.command.executeToggleRuler()}
            onMouseDown={e => e.preventDefault()}
            style={{ height: 24, width: 24, padding: 0 }}
          />
        </Tooltip>

        {/* Toàn màn hình */}
        <Tooltip
          title={
            isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình (F11)'
          }
          placement="topRight"
        >
          <Button
            type="text"
            size="small"
            className={`fullscreen ${isFullscreen ? 'exist' : ''}`}
            icon={
              isFullscreen ? (
                <FullscreenExitOutlined />
              ) : (
                <FullscreenOutlined />
              )
            }
            onClick={toggleFullscreen}
            onMouseDown={e => e.preventDefault()}
            style={{ height: 24, width: 24, padding: 0 }}
          />
        </Tooltip>

        {/* Cài đặt */}
        <Tooltip title="Cài đặt cấu hình trình soạn thảo" placement="topRight">
          <Button
            type="text"
            size="small"
            className="editor-option"
            icon={<SettingOutlined />}
            onClick={openOptionModal}
            onMouseDown={e => e.preventDefault()}
            style={{ height: 24, width: 24, padding: 0 }}
          />
        </Tooltip>
      </Space>

      {/* Modal Lề trang */}
      <Modal
        title="Cấu hình Lề trang (Inch)"
        open={marginModalVisible}
        onOk={handleMarginSubmit}
        onCancel={() => setMarginModalVisible(false)}
        okText="Áp dụng"
        cancelText="Hủy"
        width={400}
        destroyOnClose
      >
        <Form form={marginForm} layout="vertical" style={{ marginTop: 16 }}>
          <Space size={16} style={{ width: '100%', display: 'flex' }}>
            <Form.Item
              name="top"
              label="Lề trên (in)"
              rules={[{ required: true, message: 'Nhập lề trên' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={10}
                step={0.1}
                precision={2}
                placeholder="0.6"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              name="bottom"
              label="Lề dưới (in)"
              rules={[{ required: true, message: 'Nhập lề dưới' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={10}
                step={0.1}
                precision={2}
                placeholder="0.6"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>
          <Space size={16} style={{ width: '100%', display: 'flex' }}>
            <Form.Item
              name="left"
              label="Lề trái (in)"
              rules={[{ required: true, message: 'Nhập lề trái' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={10}
                step={0.1}
                precision={2}
                placeholder="0.6"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              name="right"
              label="Lề phải (in)"
              rules={[{ required: true, message: 'Nhập lề phải' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={10}
                step={0.1}
                precision={2}
                placeholder="0.6"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Modal Chia cột */}
      <Modal
        title="Cấu hình Chia cột"
        open={columnModalVisible}
        onOk={handleColumnSubmit}
        onCancel={() => setColumnModalVisible(false)}
        okText="Áp dụng"
        cancelText="Hủy"
        width={400}
        destroyOnClose
      >
        <Form form={columnForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="count"
            label="Số cột"
            rules={[{ required: true, message: 'Chọn số cột' }]}
          >
            <Select
              options={[
                { value: 1, label: '1 (Tắt chia cột)' },
                { value: 2, label: '2 cột' },
                { value: 3, label: '3 cột' },
                { value: 4, label: '4 cột' },
                { value: 5, label: '5 cột' }
              ]}
            />
          </Form.Item>
          <Form.Item
            name="gap"
            label="Khoảng cách giữa các cột (px)"
            rules={[{ required: true, message: 'Nhập khoảng cách cột' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="separator"
            label="Đường phân cách cột"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hiển thị" unCheckedChildren="Ẩn" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Cài đặt cấu hình JSON */}
      <Modal
        title="Cấu hình Trình soạn thảo"
        open={optionModalVisible}
        onOk={handleOptionSubmit}
        onCancel={() => setOptionModalVisible(false)}
        okText="Cập nhật"
        cancelText="Hủy"
        width={550}
        destroyOnHidden
      >
        <Form form={optionForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="option"
            label="Thông số cấu hình (JSON)"
            rules={[{ required: true, message: 'Nhập JSON cấu hình' }]}
          >
            <Input.TextArea
              rows={12}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              placeholder="Nhập JSON cấu hình trình soạn thảo"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Footer
