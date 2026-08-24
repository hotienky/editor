import React from 'react'
import {
  EyeOutlined,
  FileTextOutlined,
  LineOutlined,
  MinusOutlined,
  PlusOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons'
import { useRibbon } from '../RibbonContext'
import { PageMode } from '../../../editor'

export const ViewTab: React.FC = () => {
  const {
    editor,
    isCatalogOpen,
    onCatalogToggle,
    pageMode,
    scale,
    isFullscreen
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
      <div
        className={`wps-btn-large ${isCatalogOpen ? 'active' : ''}`}
        title="Mục lục"
        onClick={onCatalogToggle}
      >
        <EyeOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Catalog</span>
      </div>

      <div
        className={`wps-btn-large ${pageMode === PageMode.PAGING ? 'active' : ''}`}
        title="Chế độ phân trang"
        onClick={() => editor?.command.executePageMode(PageMode.PAGING)}
      >
        <FileTextOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Paging</span>
      </div>

      <div
        className={`wps-btn-large ${pageMode === PageMode.CONTINUITY ? 'active' : ''}`}
        title="Chế độ liền mạch"
        onClick={() => editor?.command.executePageMode(PageMode.CONTINUITY)}
      >
        <LineOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Continuous</span>
      </div>

      <div className="wps-divider" />

      <div
        className="wps-btn-large"
        title="Thu nhỏ (-)"
        onClick={() => editor?.command.executePageScaleMinus()}
      >
        <MinusOutlined style={{ fontSize: '18px', color: '#2b7de9' }} />
        <span>Zoom Out</span>
      </div>

      <div
        className="wps-btn-large"
        title="Tỉ lệ chuẩn 100%"
        onClick={() => editor?.command.executePageScaleRecovery()}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#2b7de9'
          }}
        >
          {scale}%
        </span>
        <span>Reset 100%</span>
      </div>

      <div
        className="wps-btn-large"
        title="Phóng to (+)"
        onClick={() => editor?.command.executePageScaleAdd()}
      >
        <PlusOutlined style={{ fontSize: '18px', color: '#2b7de9' }} />
        <span>Zoom In</span>
      </div>

      <div
        className="wps-btn-large"
        title="Toàn màn hình"
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
          } else {
            document.exitFullscreen()
          }
        }}
      >
        {isFullscreen ? (
          <FullscreenExitOutlined
            style={{ fontSize: '20px', color: '#2b7de9' }}
          />
        ) : (
          <FullscreenOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        )}
        <span>Fullscreen</span>
      </div>
    </div>
  )
}
