import React from 'react'
import { Dropdown } from 'antd'
import {
  FileTextOutlined,
  ColumnWidthOutlined,
  BorderOutlined,
  SplitCellsOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useRibbon } from '../RibbonContext'
import { PaperDirection } from '../../../editor'

export const PageLayoutTab: React.FC = () => {
  const {
    editor,
    paperSize,
    setPaperSize,
    paperDirection,
    setPaperDirection,
    setColumnModalOpen,
    openMarginModalWithCurrentSettings,
    openPageSettingModal
  } = useRibbon()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '100%'
      }}
    >
      {/* Page Setup / Page Setting Modal Launcher */}
      <div
        className="wps-btn-large"
        title="Cài đặt toàn diện trang (Page Setup)"
        onClick={openPageSettingModal}
      >
        <SettingOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Page Setup</span>
      </div>

      <div
        style={{
          width: '1px',
          height: '36px',
          backgroundColor: '#e8e8e8',
          margin: '0 2px'
        }}
      />

      {/* Paper Size */}
      <Dropdown
        menu={{
          items: [
            {
              key: 'a4',
              label: 'A4 (210 × 297 mm)',
              onClick: () => {
                editor?.command.executePaperSize(794, 1123)
                setPaperSize('a4')
              }
            },
            {
              key: 'a3',
              label: 'A3 (297 × 420 mm)',
              onClick: () => {
                editor?.command.executePaperSize(1125, 1593)
                setPaperSize('a3')
              }
            },
            {
              key: 'a5',
              label: 'A5 (148 × 210 mm)',
              onClick: () => {
                editor?.command.executePaperSize(565, 796)
                setPaperSize('a5')
              }
            },
            {
              key: 'letter',
              label: 'Letter (8.5 × 11 in)',
              onClick: () => {
                editor?.command.executePaperSize(813, 1054)
                setPaperSize('letter')
              }
            },
            {
              type: 'divider'
            },
            {
              key: 'more_sizes',
              label: 'Tùy chỉnh khổ giấy khác...',
              onClick: openPageSettingModal
            }
          ]
        }}
        trigger={['click']}
      >
        <div className="wps-btn-large" title="Khổ giấy">
          <FileTextOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
          <span>Size: {(paperSize || 'a4').toUpperCase()}▾</span>
        </div>
      </Dropdown>

      {/* Orientation */}
      <Dropdown
        menu={{
          items: [
            {
              key: 'vertical',
              label: 'Hướng dọc (Portrait)',
              onClick: () => {
                editor?.command.executePaperDirection(PaperDirection.VERTICAL)
                setPaperDirection(PaperDirection.VERTICAL)
              }
            },
            {
              key: 'horizontal',
              label: 'Hướng ngang (Landscape)',
              onClick: () => {
                editor?.command.executePaperDirection(PaperDirection.HORIZONTAL)
                setPaperDirection(PaperDirection.HORIZONTAL)
              }
            }
          ]
        }}
        trigger={['click']}
      >
        <div className="wps-btn-large" title="Hướng giấy">
          <ColumnWidthOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
          <span>
            {paperDirection === PaperDirection.VERTICAL
              ? 'Portrait'
              : 'Landscape'}
            ▾
          </span>
        </div>
      </Dropdown>

      {/* Paper Margin in Inches */}
      <div
        className="wps-btn-large"
        title="Cài đặt lề trang (Inch)"
        onClick={openMarginModalWithCurrentSettings}
      >
        <BorderOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Margins (in)</span>
      </div>

      {/* Multi columns */}
      <div
        className="wps-btn-large"
        title="Chia cột tài liệu"
        onClick={() => setColumnModalOpen(true)}
      >
        <SplitCellsOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Columns</span>
      </div>
    </div>
  )
}
