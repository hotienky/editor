import React from 'react'
import { message } from 'antd'
import { LineOutlined, CodeOutlined } from '@ant-design/icons'
import { useRibbon } from '../RibbonContext'

export const SectionDevTab: React.FC = () => {
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
        title="Ngắt đoạn phần"
        onClick={() => editor?.command.executePageBreak()}
      >
        <LineOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Section Break</span>
      </div>

      <div
        className="wps-btn-large"
        title="Ghi Macro"
        onClick={() => {
          if (editor?.macro.isRecording()) {
            editor.macro.cancelRecording()
            message.info('Đã dừng ghi Macro')
          } else {
            editor?.macro.startRecording()
            message.success('Đang ghi Macro...')
          }
        }}
      >
        <CodeOutlined style={{ fontSize: '20px', color: '#2b7de9' }} />
        <span>Macro</span>
      </div>
    </div>
  )
}
