import React from 'react'
import { Modal, Form, InputNumber, message } from 'antd'
import { useRibbon } from '../RibbonContext'

export const MarginModal: React.FC = () => {
  const { editor, marginModalOpen, setMarginModalOpen, marginForm } = useRibbon()

  const handleOk = () => {
    marginForm.validateFields().then(values => {
      if (!editor) return
      const toPx = (inch: number) => Math.round((Number(inch) || 0.6) * 96)
      editor.command.executeSetPaperMargin([
        toPx(values.top),
        toPx(values.right),
        toPx(values.bottom),
        toPx(values.left)
      ])
      setMarginModalOpen(false)
      message.success('Đã áp dụng lề trang')
    })
  }

  return (
    <Modal
      title="Cài đặt lề trang (Inch)"
      open={marginModalOpen}
      onOk={handleOk}
      onCancel={() => setMarginModalOpen(false)}
      destroyOnClose
    >
      <Form form={marginForm} layout="vertical">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}
        >
          <Form.Item
            name="top"
            label="Lề trên (Top in)"
            rules={[{ required: true, message: 'Nhập lề trên' }]}
          >
            <InputNumber
              step={0.1}
              precision={2}
              min={0.1}
              max={5}
              style={{ width: '100%' }}
              addonAfter="in"
            />
          </Form.Item>
          <Form.Item
            name="bottom"
            label="Lề dưới (Bottom in)"
            rules={[{ required: true, message: 'Nhập lề dưới' }]}
          >
            <InputNumber
              step={0.1}
              precision={2}
              min={0.1}
              max={5}
              style={{ width: '100%' }}
              addonAfter="in"
            />
          </Form.Item>
          <Form.Item
            name="left"
            label="Lề trái (Left in)"
            rules={[{ required: true, message: 'Nhập lề trái' }]}
          >
            <InputNumber
              step={0.1}
              precision={2}
              min={0.1}
              max={5}
              style={{ width: '100%' }}
              addonAfter="in"
            />
          </Form.Item>
          <Form.Item
            name="right"
            label="Lề phải (Right in)"
            rules={[{ required: true, message: 'Nhập lề phải' }]}
          >
            <InputNumber
              step={0.1}
              precision={2}
              min={0.1}
              max={5}
              style={{ width: '100%' }}
              addonAfter="in"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  )
}
