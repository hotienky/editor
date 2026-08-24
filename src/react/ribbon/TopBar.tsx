import React from 'react'
import { Dropdown, Tooltip, message, type MenuProps } from 'antd'
import {
  MenuOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  PrinterOutlined,
  SearchOutlined,
  UndoOutlined,
  RedoOutlined,
  DownOutlined,
  UpOutlined,
  SettingOutlined,
  MoreOutlined,
  FileWordOutlined,
  FileTextOutlined,
  SecurityScanOutlined
} from '@ant-design/icons'
import { useRibbon } from './RibbonContext'

export const TopBar: React.FC = () => {
  const {
    editor,
    activeTab,
    setActiveTab,
    isCollapsed,
    setIsCollapsed,
    canUndo,
    canRedo,
    fileInputRef,
    setSearchModalOpen,
    setWatermarkModalOpen,
    openMarginModalWithCurrentSettings
  } = useRibbon()

  // Top Menu Dropdown items
  const menuDropdownItems: MenuProps['items'] = [
    {
      key: 'new',
      label: 'Tạo tài liệu mới',
      icon: <FileTextOutlined />,
      onClick: () => {
        editor?.command.executeSetValue({
          header: [],
          main: [{ value: '' }],
          footer: []
        })
        message.success('Đã tạo tài liệu mới')
      }
    },
    {
      key: 'open',
      label: 'Mở tệp (.docx, .doc, .json)...',
      icon: <FolderOpenOutlined />,
      onClick: () => fileInputRef.current?.click()
    },
    { type: 'divider' },
    {
      key: 'save-json',
      label: 'Lưu tệp JSON (Ctrl+S)',
      icon: <SaveOutlined />,
      onClick: () => {
        editor?.command.executeExportJson('canvas-editor-document.json')
        message.success('Đã lưu file JSON')
      }
    },
    {
      key: 'export-docx',
      label: 'Xuất file Word (.docx)',
      icon: <FileWordOutlined />,
      onClick: () => {
        editor?.command.executeExportDocx('canvas-editor-document.docx')
        message.success('Đang xuất tệp Word...')
      }
    },
    { type: 'divider' },
    {
      key: 'print',
      label: 'In tài liệu (Ctrl+P)',
      icon: <PrinterOutlined />,
      onClick: () => editor?.command.executePrint()
    },
    {
      key: 'page-setup',
      label: 'Cài đặt lề trang (Inch)...',
      icon: <SettingOutlined />,
      onClick: openMarginModalWithCurrentSettings
    },
    {
      key: 'watermark',
      label: 'Quản lý hình mờ (Watermark)...',
      icon: <SecurityScanOutlined />,
      onClick: () => setWatermarkModalOpen(true)
    }
  ]

  const tabs = [
    { key: 'home', label: 'Home' },
    { key: 'insert', label: 'Insert' },
    { key: 'layout', label: 'Page Layout' },
    { key: 'references', label: 'References' },
    { key: 'review', label: 'Review' },
    { key: 'view', label: 'View' },
    { key: 'section', label: 'Section' },
    { key: 'developer', label: 'Developer' }
  ]

  return (
    <div
      className="wps-ribbon-top-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '32px',
        padding: '0 8px',
        backgroundColor: '#f5f7fa',
        borderBottom: '1px solid #e4e7ed'
      }}
    >
      {/* Left: Menu & Quick Access & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Menu Button */}
        <Dropdown menu={{ items: menuDropdownItems }} trigger={['click']}>
          <div
            className="wps-menu-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '24px',
              padding: '0 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              color: '#2b7de9',
              backgroundColor: '#ffffff',
              border: '1px solid #d4e2f8',
              marginRight: '6px'
            }}
          >
            <MenuOutlined style={{ fontSize: '13px' }} />
            <span>Menu</span>
            <DownOutlined style={{ fontSize: '9px', marginLeft: '2px' }} />
          </div>
        </Dropdown>

        {/* Quick Access Toolbar */}
        <div
          className="wps-quick-access"
          style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
        >
          <Tooltip title="Mở tệp (Ctrl+O)">
            <div
              className="wps-icon-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <FolderOpenOutlined />
            </div>
          </Tooltip>

          <Tooltip title="Lưu JSON (Ctrl+S)">
            <div
              className="wps-icon-btn"
              onClick={() => {
                editor?.command.executeExportJson('canvas-editor-document.json')
                message.success('Đã lưu file JSON')
              }}
            >
              <SaveOutlined />
            </div>
          </Tooltip>

          <Tooltip title="Xuất file Word (.docx)">
            <div
              className="wps-icon-btn"
              onClick={() => {
                editor?.command.executeExportDocx('canvas-editor-document.docx')
                message.success('Đang xuất tệp Word...')
              }}
            >
              <FileWordOutlined />
            </div>
          </Tooltip>

          <Tooltip title="In tài liệu (Ctrl+P)">
            <div
              className="wps-icon-btn"
              onClick={() => editor?.command.executePrint()}
            >
              <PrinterOutlined />
            </div>
          </Tooltip>

          <Tooltip title="Tìm kiếm & Thay thế (Ctrl+F)">
            <div
              className="wps-icon-btn"
              onClick={() => setSearchModalOpen(true)}
            >
              <SearchOutlined />
            </div>
          </Tooltip>

          <Tooltip title="Hoàn tác (Ctrl+Z)">
            <div
              className={`wps-icon-btn ${!canUndo ? 'disabled' : ''}`}
              onClick={() => editor?.command.executeUndo()}
            >
              <UndoOutlined />
            </div>
          </Tooltip>

          <Tooltip title="Làm lại (Ctrl+Y)">
            <div
              className={`wps-icon-btn ${!canRedo ? 'disabled' : ''}`}
              onClick={() => editor?.command.executeRedo()}
            >
              <RedoOutlined />
            </div>
          </Tooltip>
        </div>

        {/* Vertical Separator */}
        <div
          style={{
            width: '1px',
            height: '16px',
            backgroundColor: '#cfd4dc',
            margin: '0 8px'
          }}
        />

        {/* Ribbon Tabs */}
        <div
          className="wps-tabs"
          style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <div
                key={tab.key}
                className={`wps-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.key)
                  if (isCollapsed) setIsCollapsed(false)
                }}
                style={{
                  padding: '3px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : '#333333',
                  backgroundColor: isActive ? '#2b7de9' : 'transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </div>
            )
          })}

          {/* Vertical Separator before Header/Footer */}
          <div
            style={{
              width: '1px',
              height: '14px',
              backgroundColor: '#cfd4dc',
              margin: '0 6px'
            }}
          />

          {/* Special Header/Footer Tab */}
          <div
            className="wps-tab-special"
            onClick={() => {
              editor?.command.executeInsertElementList([
                { value: '\n', size: 12 }
              ])
              message.info('Khu vực Header / Footer')
            }}
            style={{
              padding: '3px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#1e70eb',
              fontWeight: 500
            }}
          >
            Header/Footer
          </div>
        </div>
      </div>

      {/* Right: Settings, Collapse Chevron */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#666'
        }}
      >
        <Tooltip title="Cài đặt lề trang (Inch)">
          <div
            className="wps-icon-btn"
            onClick={openMarginModalWithCurrentSettings}
          >
            <SettingOutlined />
          </div>
        </Tooltip>

        <div
          style={{
            width: '1px',
            height: '14px',
            backgroundColor: '#cfd4dc'
          }}
        />

        <Tooltip title="Tùy chọn khác">
          <div className="wps-icon-btn">
            <MoreOutlined />
          </div>
        </Tooltip>

        <Tooltip title={isCollapsed ? 'Mở rộng Ribbon' : 'Thu gọn Ribbon'}>
          <div
            className="wps-icon-btn"
            onClick={() => setIsCollapsed((prev: boolean) => !prev)}
          >
            {isCollapsed ? <DownOutlined /> : <UpOutlined />}
          </div>
        </Tooltip>
      </div>
    </div>
  )
}
