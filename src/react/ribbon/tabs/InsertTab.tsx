import React, { useState } from 'react'
import { Dropdown, Popover, message, type MenuProps } from 'antd'
import {
  TableOutlined,
  PictureOutlined,
  LinkOutlined,
  FormOutlined,
  CodeOutlined,
  CalculatorOutlined,
  SecurityScanOutlined,
  EditOutlined,
  LineOutlined
} from '@ant-design/icons'
import { useRibbon } from '../RibbonContext'
import { ControlType, ElementType } from '../../../editor'
import { Signature } from '../../../components/signature/Signature'

export const InsertTab: React.FC = () => {
  const {
    editor,
    imageInputRef,
    hyperlinkForm,
    setHyperlinkModalOpen,
    setCodeModalOpen,
    setLatexModalOpen,
    setWatermarkModalOpen
  } = useRibbon()

  // Table selector hover grid
  const [tableHoverRows, setTableHoverRows] = useState<number>(0)
  const [tableHoverCols, setTableHoverCols] = useState<number>(0)

  // Form Controls items
  const controlMenuItems: MenuProps['items'] = [
    {
      key: 'text',
      label: 'Văn bản (Text)',
      onClick: () => {
        editor?.command.executeInsertControl({
          type: ElementType.CONTROL,
          value: '',
          control: {
            type: ControlType.TEXT,
            value: null,
            placeholder: 'Nhập văn bản'
          }
        })
      }
    },
    {
      key: 'number',
      label: 'Số (Number)',
      onClick: () => {
        editor?.command.executeInsertControl({
          type: ElementType.CONTROL,
          value: '',
          control: {
            type: ControlType.NUMBER,
            value: null,
            placeholder: 'Nhập số'
          }
        })
      }
    },
    {
      key: 'select',
      label: 'Danh sách chọn (Select)',
      onClick: () => {
        editor?.command.executeInsertControl({
          type: ElementType.CONTROL,
          value: '',
          control: {
            type: ControlType.SELECT,
            value: null,
            placeholder: 'Chọn danh sách',
            valueSets: [
              { code: '1', value: 'Lựa chọn 1' },
              { code: '2', value: 'Lựa chọn 2' }
            ]
          }
        })
      }
    },
    {
      key: 'date',
      label: 'Ngày tháng (Date)',
      onClick: () => {
        editor?.command.executeInsertControl({
          type: ElementType.CONTROL,
          value: '',
          control: {
            type: ControlType.DATE,
            value: null,
            placeholder: 'Chọn ngày'
          }
        })
      }
    },
    {
      key: 'checkbox',
      label: 'Hộp chọn (Checkbox)',
      onClick: () =>
        editor?.command.executeInsertElementList([
          {
            type: ElementType.CHECKBOX,
            checkbox: { value: false },
            value: ''
          }
        ])
    },
    {
      key: 'radio',
      label: 'Nút chọn (Radio)',
      onClick: () =>
        editor?.command.executeInsertElementList([
          {
            type: ElementType.RADIO,
            checkbox: { value: false },
            value: ''
          }
        ])
    }
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '100%'
      }}
    >
      {/* Table Grid Popover */}
      <Popover
        trigger="click"
        content={
          <div style={{ width: 170, padding: 4 }}>
            <div
              style={{
                fontSize: '12px',
                marginBottom: 6,
                fontWeight: 500
              }}
            >
              {tableHoverRows > 0
                ? `${tableHoverRows} hàng × ${tableHoverCols} cột`
                : 'Chèn bảng'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 14px)',
                gap: 2
              }}
            >
              {Array.from({ length: 10 }).map((_, r) =>
                Array.from({ length: 10 }).map((_, c) => {
                  const isHovered = r < tableHoverRows && c < tableHoverCols
                  return (
                    <div
                      key={`${r}-${c}`}
                      onMouseEnter={() => {
                        setTableHoverRows(r + 1)
                        setTableHoverCols(c + 1)
                      }}
                      onClick={() => {
                        editor?.command.executeInsertTable(r + 1, c + 1)
                        message.success(`Đã chèn bảng ${r + 1}×${c + 1}`)
                      }}
                      style={{
                        width: 14,
                        height: 14,
                        border: '1px solid #d9d9d9',
                        backgroundColor: isHovered ? '#2b7de9' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    />
                  )
                })
              )}
            </div>
          </div>
        }
      >
        <div className="wps-btn-large" title="Chèn bảng">
          <TableOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
          <span>Table▾</span>
        </div>
      </Popover>

      {/* Picture Upload */}
      <div
        className="wps-btn-large"
        title="Chèn hình ảnh"
        onClick={() => imageInputRef.current?.click()}
      >
        <PictureOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Picture</span>
      </div>

      {/* Hyperlink */}
      <div
        className="wps-btn-large"
        title="Chèn liên kết"
        onClick={() => {
          hyperlinkForm.setFieldsValue({
            name: editor?.command.getRangeText() || '',
            url: ''
          })
          setHyperlinkModalOpen(true)
        }}
      >
        <LinkOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Link</span>
      </div>

      <div className="wps-divider" />

      {/* Form Controls */}
      <Dropdown menu={{ items: controlMenuItems }} trigger={['click']}>
        <div className="wps-btn-large" title="Điều khiển biểu mẫu">
          <FormOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
          <span>Control▾</span>
        </div>
      </Dropdown>

      {/* Code block */}
      <div
        className="wps-btn-large"
        title="Chèn khối mã nguồn"
        onClick={() => setCodeModalOpen(true)}
      >
        <CodeOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Code</span>
      </div>

      {/* LaTeX Formula */}
      <div
        className="wps-btn-large"
        title="Công thức LaTeX"
        onClick={() => setLatexModalOpen(true)}
      >
        <CalculatorOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>LaTeX</span>
      </div>

      {/* Watermark */}
      <div
        className="wps-btn-large"
        title="Hình mờ (Watermark)"
        onClick={() => setWatermarkModalOpen(true)}
      >
        <SecurityScanOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Watermark</span>
      </div>

      {/* Signature */}
      <div
        className="wps-btn-large"
        title="Chữ ký điện tử"
        onClick={() => {
          new Signature({
            onConfirm: payload => {
              if (!payload || !editor) return
              const { value, width, height } = payload
              if (!value || !width || !height) return
              editor.command.executeImage({ value, width, height })
            }
          })
        }}
      >
        <EditOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Signature</span>
      </div>

      {/* Page break */}
      <div
        className="wps-btn-large"
        title="Ngắt trang"
        onClick={() => editor?.command.executePageBreak()}
      >
        <LineOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Page Break</span>
      </div>
    </div>
  )
}
