import React from 'react'
import { message } from 'antd'
import { UnorderedListOutlined, PictureOutlined } from '@ant-design/icons'
import { useRibbon } from '../RibbonContext'

export const ReferencesTab: React.FC = () => {
  const { onCatalogToggle } = useRibbon()

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
        className="wps-btn-large"
        title="Bật/Tắt mục lục"
        onClick={onCatalogToggle}
      >
        <UnorderedListOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Table of Contents</span>
      </div>

      <div
        className="wps-btn-large"
        title="Thêm chú thích ảnh"
        onClick={() =>
          message.info('Nhấp chuột phải vào ảnh để thêm chú thích')
        }
      >
        <PictureOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Insert Caption</span>
      </div>
    </div>
  )
}
