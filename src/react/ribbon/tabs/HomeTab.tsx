import {
    AlignCenterOutlined,
    AlignLeftOutlined,
    AlignRightOutlined,
    BoldOutlined,
    BorderOutlined,
    ClearOutlined,
    CopyOutlined,
    DownOutlined,
    EditOutlined,
    FileTextOutlined,
    FormatPainterOutlined,
    ItalicOutlined,
    OrderedListOutlined,
    ScissorOutlined,
    SearchOutlined,
    SettingOutlined,
    StrikethroughOutlined,
    SwapOutlined,
    UnderlineOutlined,
    UnorderedListOutlined
} from '@ant-design/icons';
import {
    AutoComplete,
    ColorPicker,
    Dropdown,
    Select,
    Tooltip,
    message,
    type MenuProps
} from 'antd';
import React from 'react';
import {
    ListStyle,
    ListType,
    RowFlex,
    TextDecorationStyle,
    TitleLevel,
    splitText
} from '../../../editor';
import { useRibbon } from '../RibbonContext';
import { FONT_FAMILIES, FONT_SIZES, STYLE_PRESETS } from '../types';

export const HomeTab: React.FC = () => {
  const {
    editor,
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
    listType,
    isPainterActive,
    handlePainterClick,
    handlePainterDblClick,
    setSearchModalOpen,
    setColumnModalOpen,
    openMarginModalWithCurrentSettings
  } = useRibbon()

  const [fontSizeInput, setFontSizeInput] = React.useState<string>(
    String(fontSize)
  )

  React.useEffect(() => {
    setFontSizeInput(String(fontSize))
  }, [fontSize])

  const handleApplyFontSize = (val: string | number) => {
    const num = Number(val)
    if (!isNaN(num) && num > 0 && num <= 500) {
      setFontSize(num)
      setFontSizeInput(String(num))
      editor?.command.executeSize(num)
    } else {
      setFontSizeInput(String(fontSize))
    }
  }

  // Underline dropdown
  const underlineMenuItems: MenuProps['items'] = [
    {
      key: TextDecorationStyle.SOLID,
      label: '— Nét liền đơn',
      onClick: () => {
        editor?.command.executeUnderline({ style: TextDecorationStyle.SOLID })
        setUnderlineStyle(TextDecorationStyle.SOLID)
      }
    },
    {
      key: TextDecorationStyle.DOUBLE,
      label: '═ Nét đôi',
      onClick: () => {
        editor?.command.executeUnderline({ style: TextDecorationStyle.DOUBLE })
        setUnderlineStyle(TextDecorationStyle.DOUBLE)
      }
    },
    {
      key: TextDecorationStyle.DASHED,
      label: '- - Nét đứt gạch',
      onClick: () => {
        editor?.command.executeUnderline({ style: TextDecorationStyle.DASHED })
        setUnderlineStyle(TextDecorationStyle.DASHED)
      }
    },
    {
      key: TextDecorationStyle.DOTTED,
      label: '··· Nét chấm tròn',
      onClick: () => {
        editor?.command.executeUnderline({ style: TextDecorationStyle.DOTTED })
        setUnderlineStyle(TextDecorationStyle.DOTTED)
      }
    },
    {
      key: TextDecorationStyle.WAVY,
      label: '〰 Nét lượn sóng',
      onClick: () => {
        editor?.command.executeUnderline({ style: TextDecorationStyle.WAVY })
        setUnderlineStyle(TextDecorationStyle.WAVY)
      }
    }
  ]

  // Change Case items (Aa ▾)
  const changeCaseItems: MenuProps['items'] = [
    {
      key: 'upper',
      label: 'CHỮ IN HOA (UPPERCASE)',
      onClick: () => {
        const text = editor?.command.getRangeText()
        if (text && editor) {
          editor.command.executeInsertElementList(
            splitText(text.toUpperCase()).map(t => ({ value: t }))
          )
        }
      }
    },
    {
      key: 'lower',
      label: 'chữ thường (lowercase)',
      onClick: () => {
        const text = editor?.command.getRangeText()
        if (text && editor) {
          editor.command.executeInsertElementList(
            splitText(text.toLowerCase()).map(t => ({ value: t }))
          )
        }
      }
    },
    {
      key: 'title',
      label: 'Viết Hoa Đầu Từ (Capitalize)',
      onClick: () => {
        const text = editor?.command.getRangeText()
        if (text && editor) {
          const cap = text.replace(/\b\w/g, l => l.toUpperCase())
          editor.command.executeInsertElementList(
            splitText(cap).map(t => ({ value: t }))
          )
        }
      }
    }
  ]

  // Bullet list dropdown
  const bulletListItems: MenuProps['items'] = [
    {
      key: 'none',
      label: 'Hủy danh sách',
      onClick: () => editor?.command.executeList(null)
    },
    { type: 'divider' },
    {
      key: 'disc',
      label: '● Chấm tròn đặc (Disc)',
      onClick: () => editor?.command.executeList(ListType.UL, ListStyle.DISC)
    },
    {
      key: 'circle',
      label: '○ Vòng tròn rỗng (Circle)',
      onClick: () => editor?.command.executeList(ListType.UL, ListStyle.CIRCLE)
    },
    {
      key: 'square',
      label: '■ Ô vuông đặc (Square)',
      onClick: () => editor?.command.executeList(ListType.UL, ListStyle.SQUARE)
    },
    {
      key: 'dash',
      label: '- Gạch đầu dòng (Dash)',
      onClick: () => editor?.command.executeList(ListType.UL, ListStyle.DASH)
    },
    {
      key: 'checkbox',
      label: '☑️ Ô kiểm (Checkbox)',
      onClick: () => editor?.command.executeList(ListType.UL, ListStyle.CHECKBOX)
    }
  ]

  // Numbered list dropdown
  const numberedListItems: MenuProps['items'] = [
    {
      key: 'none',
      label: 'Hủy danh sách',
      onClick: () => editor?.command.executeList(null)
    },
    { type: 'divider' },
    {
      key: 'decimal',
      label: '1. 2. 3. (Số thập phân)',
      onClick: () => editor?.command.executeList(ListType.OL, ListStyle.DECIMAL)
    }
  ]

  // Line spacing dropdown (↕ ▾)
  const lineSpacingItems: MenuProps['items'] = [
    0.5, 0.75, 1, 1.15, 1.25, 1.5, 1.75, 2, 2.5, 3
  ].map(val => ({
    key: String(val),
    label: `${val}x`,
    onClick: () => editor?.command.executeRowMargin(val)
  }))

  return (
    <>
      {/* GROUP 1: Clipboard */}
      <div
        className="wps-group"
        style={{ display: 'flex', alignItems: 'center' }}
      >
        {/* Large Paste */}
        <Dropdown
          menu={{
            items: [
              {
                key: 'paste',
                label: 'Dán (Paste)',
                onClick: async () => {
                  try {
                    const text = await navigator.clipboard.readText()
                    if (text && editor) {
                      editor.command.executeInsertElementList(
                        splitText(text).map(t => ({ value: t }))
                      )
                    }
                  } catch {
                    message.info('Nhấn Ctrl+V để dán nội dung')
                  }
                }
              }
            ]
          }}
          trigger={['click']}
        >
          <div
            className="wps-btn-large"
            title="Dán (Ctrl+V)"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText()
                if (text && editor) {
                  editor.command.executeInsertElementList(
                    splitText(text).map(t => ({ value: t }))
                  )
                }
              } catch {
                message.info('Nhấn Ctrl+V để dán')
              }
            }}
          >
            <CopyOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
            <span style={{ marginTop: '2px' }}>
              Paste <DownOutlined style={{ fontSize: '8px' }} />
            </span>
          </div>
        </Dropdown>

        {/* Cut & Copy column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '2px',
            marginLeft: '2px'
          }}
        >
          <div
            className="wps-btn-small-text"
            title="Cắt (Ctrl+X)"
            onClick={() => {
              const text = editor?.command.getRangeText()
              if (text) {
                navigator.clipboard.writeText(text)
                editor?.command.executeBackspace()
              }
            }}
          >
            <ScissorOutlined style={{ fontSize: '13px' }} />
            <span>Cut</span>
          </div>
          <div
            className="wps-btn-small-text"
            title="Sao chép (Ctrl+C)"
            onClick={() => {
              const text = editor?.command.getRangeText()
              if (text) {
                navigator.clipboard.writeText(text)
                message.success('Đã sao chép')
              }
            }}
          >
            <CopyOutlined style={{ fontSize: '13px' }} />
            <span>Copy</span>
          </div>
        </div>

        {/* Large Format Painter */}
        <div
          className={`wps-btn-large ${isPainterActive ? 'active' : ''}`}
          title="Sao chép định dạng (Nhấp đôi để dùng liên tục)"
          onClick={handlePainterClick}
          onDoubleClick={handlePainterDblClick}
          style={{ marginLeft: '4px' }}
        >
          <FormatPainterOutlined
            style={{
              fontSize: '20px',
              color: isPainterActive ? '#2b7de9' : '#555'
            }}
          />
          <span
            style={{
              fontSize: '10px',
              textAlign: 'center',
              lineHeight: '11px',
              marginTop: '2px'
            }}
          >
            Format<br />Painter
          </span>
        </div>
      </div>

      <div className="wps-divider" />

      {/* GROUP 2: Font / Typography */}
      <div
        className="wps-group"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '3px'
        }}
      >
        {/* Top Row: Font Family, Font Size, Grow, Shrink, Clear Format, Change Case */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Select
            size="small"
            value={fontFamily}
            style={{ width: 110 }}
            onChange={val => {
              setFontFamily(val)
              editor?.command.executeFont(val)
            }}
            options={FONT_FAMILIES}
          />

          <AutoComplete
            size="small"
            value={fontSizeInput}
            style={{ width: 62 }}
            options={FONT_SIZES.map(s => ({
              label: String(s),
              value: String(s)
            }))}
            onChange={val => setFontSizeInput(val)}
            onSelect={val => handleApplyFontSize(val)}
            onBlur={() => handleApplyFontSize(fontSizeInput)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleApplyFontSize(fontSizeInput)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
          />

          <Tooltip title="Tăng cỡ chữ (Ctrl+[)">
            <div
              className="wps-tool-btn"
              onClick={() => editor?.command.executeSizeAdd()}
            >
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>A⁺</span>
            </div>
          </Tooltip>

          <Tooltip title="Giảm cỡ chữ (Ctrl+])">
            <div
              className="wps-tool-btn"
              onClick={() => editor?.command.executeSizeMinus()}
            >
              <span style={{ fontWeight: 'bold', fontSize: '11px' }}>A⁻</span>
            </div>
          </Tooltip>

          <Tooltip title="Xóa định dạng">
            <div
              className="wps-tool-btn"
              onClick={() => editor?.command.executeFormat()}
            >
              <ClearOutlined style={{ fontSize: '13px' }} />
            </div>
          </Tooltip>

          <Dropdown menu={{ items: changeCaseItems }} trigger={['click']}>
            <div className="wps-tool-btn" title="Đổi kiểu chữ hoa / thường">
              <span>Aa</span>
              <DownOutlined style={{ fontSize: '8px', marginLeft: '1px' }} />
            </div>
          </Dropdown>
        </div>

        {/* Bottom Row: Bold, Italic, Underline, Strike, Super, Sub, Effects, Highlight, Color, Border */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Tooltip title="In đậm (Ctrl+B)">
            <div
              className={`wps-tool-btn ${isBold ? 'active' : ''}`}
              onClick={() => editor?.command.executeBold()}
            >
              <BoldOutlined />
            </div>
          </Tooltip>

          <Tooltip title="In nghiêng (Ctrl+I)">
            <div
              className={`wps-tool-btn ${isItalic ? 'active' : ''}`}
              onClick={() => editor?.command.executeItalic()}
            >
              <ItalicOutlined />
            </div>
          </Tooltip>

          {/* Underline with dropdown */}
          <Dropdown
            menu={{ items: underlineMenuItems }}
            trigger={['click']}
          >
            <div
              className={`wps-tool-btn ${isUnderline ? 'active' : ''}`}
              title="Gạch chân (Ctrl+U)"
              onClick={() =>
                editor?.command.executeUnderline({
                  style: underlineStyle
                })
              }
            >
              <UnderlineOutlined />
              <DownOutlined style={{ fontSize: '8px', marginLeft: '1px' }} />
            </div>
          </Dropdown>

          <Tooltip title="Gạch giữa (Ctrl+Shift+X)">
            <div
              className={`wps-tool-btn ${isStrikeout ? 'active' : ''}`}
              onClick={() => editor?.command.executeStrikeout()}
            >
              <StrikethroughOutlined />
            </div>
          </Tooltip>

          <Tooltip title="Chỉ số trên (Ctrl+Shift+,)">
            <div
              className={`wps-tool-btn ${isSuperscript ? 'active' : ''}`}
              onClick={() => editor?.command.executeSuperscript()}
            >
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>X²</span>
            </div>
          </Tooltip>

          <Tooltip title="Chỉ số dưới (Ctrl+Shift+.)">
            <div
              className={`wps-tool-btn ${isSubscript ? 'active' : ''}`}
              onClick={() => editor?.command.executeSubscript()}
            >
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>X₂</span>
            </div>
          </Tooltip>

          {/* Text Effects dropdown */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'normal',
                  label: 'Văn bản thường',
                  onClick: () => editor?.command.executeTitle(null)
                },
                {
                  key: 'h1',
                  label: 'Tiêu đề 1 (26px)',
                  onClick: () => editor?.command.executeTitle(TitleLevel.FIRST)
                },
                {
                  key: 'h2',
                  label: 'Tiêu đề 2 (24px)',
                  onClick: () => editor?.command.executeTitle(TitleLevel.SECOND)
                },
                {
                  key: 'h3',
                  label: 'Tiêu đề 3 (22px)',
                  onClick: () => editor?.command.executeTitle(TitleLevel.THIRD)
                }
              ]
            }}
            trigger={['click']}
          >
            <div className="wps-tool-btn" title="Hiệu ứng chữ / Tiêu đề">
              <span style={{ fontWeight: 'bold', color: '#1e70eb' }}>A</span>
              <DownOutlined style={{ fontSize: '8px', marginLeft: '1px' }} />
            </div>
          </Dropdown>

          {/* Highlight color picker */}
          <ColorPicker
            value={highlight}
            onChange={c => {
              const hex = c.toHexString()
              setHighlight(hex)
              editor?.command.executeHighlight(hex)
            }}
          >
            <div
              className="wps-tool-btn"
              title="Màu nền chữ (Highlight)"
              style={{ position: 'relative' }}
            >
              <span style={{ fontSize: '12px' }}>🖌</span>
              <div
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '4px',
                  right: '4px',
                  height: '3px',
                  backgroundColor: highlight,
                  borderRadius: '1px'
                }}
              />
            </div>
          </ColorPicker>

          {/* Font color picker */}
          <ColorPicker
            value={color}
            onChange={c => {
              const hex = c.toHexString()
              setColor(hex)
              editor?.command.executeColor(hex)
            }}
          >
            <div
              className="wps-tool-btn"
              title="Màu chữ (Font Color)"
              style={{ position: 'relative' }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>A</span>
              <div
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '4px',
                  right: '4px',
                  height: '3px',
                  backgroundColor: color,
                  borderRadius: '1px'
                }}
              />
            </div>
          </ColorPicker>

          {/* Character border icon [A] */}
          <Tooltip title="Đóng khung ký tự">
            <div
              className="wps-tool-btn"
              onClick={() => message.info('Đóng khung ký tự')}
            >
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>[A]</span>
            </div>
          </Tooltip>
        </div>
      </div>

      <div className="wps-divider" />

      {/* GROUP 3: Paragraph */}
      <div
        className="wps-group"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '3px'
        }}
      >
        {/* Top Row: Bullets, Numbering, Decrease Indent, Increase Indent, Line Spacing, Sort, Formatting Mark, Border */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Dropdown menu={{ items: bulletListItems }} trigger={['click']}>
            <div
              className={`wps-tool-btn ${listType === ListType.UL ? 'active' : ''}`}
              title="Danh sách dấu đầu dòng"
            >
              <UnorderedListOutlined />
              <DownOutlined style={{ fontSize: '8px', marginLeft: '1px' }} />
            </div>
          </Dropdown>

          <Dropdown menu={{ items: numberedListItems }} trigger={['click']}>
            <div
              className={`wps-tool-btn ${listType === ListType.OL ? 'active' : ''}`}
              title="Danh sách số thứ tự"
            >
              <OrderedListOutlined />
              <DownOutlined style={{ fontSize: '8px', marginLeft: '1px' }} />
            </div>
          </Dropdown>

          <Tooltip title="Giảm lề thụt đầu dòng">
            <div
              className="wps-tool-btn"
              onClick={() => message.info('Giảm lề đoạn')}
            >
              <span style={{ fontSize: '12px' }}>⇤</span>
            </div>
          </Tooltip>

          <Tooltip title="Tăng lề thụt đầu dòng">
            <div
              className="wps-tool-btn"
              onClick={() => message.info('Tăng lề đoạn')}
            >
              <span style={{ fontSize: '12px' }}>⇥</span>
            </div>
          </Tooltip>

          <Dropdown menu={{ items: lineSpacingItems }} trigger={['click']}>
            <div className="wps-tool-btn" title="Khoảng cách dòng / đoạn">
              <span style={{ fontSize: '12px' }}>↕</span>
              <DownOutlined style={{ fontSize: '8px', marginLeft: '1px' }} />
            </div>
          </Dropdown>

          <Tooltip title="Sắp xếp danh sách (A-Z)">
            <div
              className="wps-tool-btn"
              onClick={() => message.info('Sắp xếp đoạn văn')}
            >
              <SwapOutlined style={{ transform: 'rotate(90deg)' }} />
            </div>
          </Tooltip>

          <Tooltip title="Hiện/ẩn dấu định dạng">
            <div
              className="wps-tool-btn"
              onClick={() => message.info('Hiện dấu đoạn văn')}
            >
              <span>↵</span>
            </div>
          </Tooltip>

          <Dropdown
            menu={{
              items: [
                {
                  key: 'solid',
                  label: 'Đường liền nét',
                  onClick: () => editor?.command.executeSeparator([])
                },
                {
                  key: 'dashed',
                  label: 'Đường nét đứt',
                  onClick: () => editor?.command.executeSeparator([3, 1])
                }
              ]
            }}
            trigger={['click']}
          >
            <div className="wps-tool-btn" title="Đường viền / Phân cách">
              <BorderOutlined />
              <DownOutlined style={{ fontSize: '8px', marginLeft: '1px' }} />
            </div>
          </Dropdown>
        </div>

        {/* Bottom Row: Align Left, Center, Right, Justify, Distributed, Sub-list, Shading, Gridlines */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Tooltip title="Căn trái (Ctrl+L)">
            <div
              className={`wps-tool-btn ${rowFlex === RowFlex.LEFT ? 'active' : ''}`}
              onClick={() => editor?.command.executeRowFlex(RowFlex.LEFT)}
            >
              <AlignLeftOutlined />
            </div>
          </Tooltip>

          <Tooltip title="Căn giữa (Ctrl+E)">
            <div
              className={`wps-tool-btn ${rowFlex === RowFlex.CENTER ? 'active' : ''}`}
              onClick={() => editor?.command.executeRowFlex(RowFlex.CENTER)}
            >
              <AlignCenterOutlined />
            </div>
          </Tooltip>

          <Tooltip title="Căn phải (Ctrl+R)">
            <div
              className={`wps-tool-btn ${rowFlex === RowFlex.RIGHT ? 'active' : ''}`}
              onClick={() => editor?.command.executeRowFlex(RowFlex.RIGHT)}
            >
              <AlignRightOutlined />
            </div>
          </Tooltip>

          <Tooltip title="Căn đều hai bên (Ctrl+J)">
            <div
              className={`wps-tool-btn ${rowFlex === RowFlex.ALIGNMENT ? 'active' : ''}`}
              onClick={() => editor?.command.executeRowFlex(RowFlex.ALIGNMENT)}
            >
              <span style={{ fontWeight: 'bold' }}>≡</span>
            </div>
          </Tooltip>

          <Tooltip title="Căn giãn đều (Ctrl+Shift+J)">
            <div
              className={`wps-tool-btn ${rowFlex === RowFlex.JUSTIFY ? 'active' : ''}`}
              onClick={() => editor?.command.executeRowFlex(RowFlex.JUSTIFY)}
            >
              <span style={{ fontSize: '11px', letterSpacing: '1px' }}>
                |←→|
              </span>
            </div>
          </Tooltip>

          <Tooltip title="Danh sách phân cấp">
            <div
              className="wps-tool-btn"
              onClick={() =>
                editor?.command.executeList(ListType.OL, ListStyle.DECIMAL)
              }
            >
              <span style={{ fontSize: '11px' }}>1.1▾</span>
            </div>
          </Tooltip>

          <Tooltip title="Đổ màu nền đoạn">
            <div
              className="wps-tool-btn"
              onClick={() => message.info('Màu nền đoạn')}
            >
              <span>🪣▾</span>
            </div>
          </Tooltip>

          <Tooltip title="Bật/Tắt đường lưới">
            <div
              className="wps-tool-btn"
              onClick={() => message.info('Bật đường lưới')}
            >
              <BorderOutlined />
            </div>
          </Tooltip>
        </div>
      </div>

      <div className="wps-divider" />

      {/* GROUP 4: Styles Gallery (Quick Styles Box) */}
      <div
        className="wps-group"
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <div
          className="wps-styles-gallery"
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #d4d7dc',
            borderRadius: '3px',
            height: '52px',
            padding: '2px',
            gap: '4px',
            backgroundColor: '#fafbfc'
          }}
        >
          {STYLE_PRESETS.map((preset, idx) => {
            const isActive = titleLevel === preset.level
            return (
              <div
                key={idx}
                className={`wps-style-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setTitleLevel(preset.level)
                  editor?.command.executeTitle(preset.level)
                }}
                style={{
                  width: '78px',
                  height: '46px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#e8f0fe' : '#ffffff',
                  border: isActive ? '1px solid #2b7de9' : '1px solid #e1e4e8',
                  padding: '2px'
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: preset.level ? 'bold' : 'normal',
                    color: preset.level ? '#1e70eb' : '#333'
                  }}
                >
                  AaBbCcDd
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#666',
                    marginTop: '1px'
                  }}
                >
                  {preset.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="wps-divider" />

      {/* GROUP 5: Action Tools: Word Typesetting, Find and Replace, Select, Settings */}
      <div
        className="wps-group"
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        {/* Word Typesetting */}
        <Dropdown
          menu={{
            items: [
              {
                key: 'word-tool',
                label: 'Định dạng chuẩn tài liệu',
                onClick: () => {
                  editor?.command.executeWordTool()
                  message.success('Đã áp dụng định dạng chuẩn')
                }
              }
            ]
          }}
          trigger={['click']}
        >
          <div
            className="wps-btn-large"
            title="Định dạng chuẩn kiểu Word"
            onClick={() => editor?.command.executeWordTool()}
          >
            <FileTextOutlined style={{ fontSize: '19px', color: '#2b7de9' }} />
            <span
              style={{
                fontSize: '10px',
                textAlign: 'center',
                lineHeight: '11px',
                marginTop: '2px'
              }}
            >
              Word<br />Typesetting▾
            </span>
          </div>
        </Dropdown>

        {/* Find and Replace */}
        <Dropdown
          menu={{
            items: [
              {
                key: 'search',
                label: 'Tìm kiếm (Ctrl+F)',
                onClick: () => setSearchModalOpen(true)
              },
              {
                key: 'replace',
                label: 'Thay thế (Ctrl+H)',
                onClick: () => setSearchModalOpen(true)
              }
            ]
          }}
          trigger={['click']}
        >
          <div
            className="wps-btn-large"
            title="Tìm kiếm & Thay thế (Ctrl+F)"
            onClick={() => setSearchModalOpen(true)}
          >
            <SearchOutlined style={{ fontSize: '19px', color: '#2b7de9' }} />
            <span
              style={{
                fontSize: '10px',
                textAlign: 'center',
                lineHeight: '11px',
                marginTop: '2px'
              }}
            >
              Find and<br />Replace▾
            </span>
          </div>
        </Dropdown>

        {/* Select */}
        <Dropdown
          menu={{
            items: [
              {
                key: 'select-all',
                label: 'Chọn tất cả (Ctrl+A)',
                onClick: () => editor?.command.executeSelectAll()
              }
            ]
          }}
          trigger={['click']}
        >
          <div className="wps-btn-large" title="Chọn vùng văn bản">
            <EditOutlined style={{ fontSize: '19px', color: '#2b7de9' }} />
            <span
              style={{
                fontSize: '10px',
                textAlign: 'center',
                lineHeight: '11px',
                marginTop: '2px'
              }}
            >
              Select▾
            </span>
          </div>
        </Dropdown>

        {/* Settings */}
        <Dropdown
          menu={{
            items: [
              {
                key: 'margin',
                label: 'Lề trang (Inch)...',
                onClick: openMarginModalWithCurrentSettings
              },
              {
                key: 'columns',
                label: 'Chia cột văn bản...',
                onClick: () => setColumnModalOpen(true)
              }
            ]
          }}
          trigger={['click']}
        >
          <div className="wps-btn-large" title="Cài đặt bố cục">
            <SettingOutlined style={{ fontSize: '19px', color: '#2b7de9' }} />
            <span
              style={{
                fontSize: '10px',
                textAlign: 'center',
                lineHeight: '11px',
                marginTop: '2px'
              }}
            >
              Settings▾
            </span>
          </div>
        </Dropdown>
      </div>
    </>
  )
}
