import React from 'react'
import { message } from 'antd'
import { FormOutlined, FileTextOutlined } from '@ant-design/icons'
import { useRibbon } from '../RibbonContext'

export const ReviewTab: React.FC = () => {
  const { editor } = useRibbon()

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
        title="Thêm bình luận"
        onClick={() => {
          const text = editor?.command.getRangeText()
          if (!text) {
            message.warning('Vui lòng chọn một đoạn văn bản để bình luận')
            return
          }
          editor?.command.executeSetGroup()
          message.success('Đã gắn vùng bình luận')
        }}
      >
        <FormOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>New Comment</span>
      </div>

      <div
        className="wps-btn-large"
        title="Đếm số từ"
        onClick={async () => {
          const wordCount = await editor?.command.getWordCount()
          message.info(`Tổng số từ: ${wordCount || 0}`)
        }}
      >
        <FileTextOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Word Count</span>
      </div>
    </div>
  )
}
