import React from 'react'
import { Modal, Form, Input, message } from 'antd'
import { useRibbon } from '../RibbonContext'
import { splitText } from '../../../editor'

export const HyperlinkModal: React.FC = () => {
  const {
    editor,
    hyperlinkModalOpen,
    setHyperlinkModalOpen,
    hyperlinkForm,
    fontSize
  } = useRibbon()

  const handleOk = () => {
    hyperlinkForm.validateFields().then(values => {
      if (!editor) return
      editor.command.executeHyperlink({
        url: values.url,
        valueList: splitText(values.name).map(n => ({
          value: n,
          size: fontSize
        }))
      })
      setHyperlinkModalOpen(false)
      hyperlinkForm.resetFields()
      message.success('Đã chèn liên kết')
    })
  }

  return (
    <Modal
      title="Chèn liên kết (Hyperlink)"
      open={hyperlinkModalOpen}
      onOk={handleOk}
      onCancel={() => setHyperlinkModalOpen(false)}
      destroyOnClose
    >
      <Form form={hyperlinkForm} layout="vertical">
        <Form.Item
          name="name"
          label="Văn bản hiển thị"
          rules={[{ required: true, message: 'Vui lòng nhập văn bản hiển thị' }]}
        >
          <Input placeholder="Văn bản liên kết..." />
        </Form.Item>
        <Form.Item
          name="url"
          label="Đường dẫn URL"
          rules={[{ required: true, message: 'Vui lòng nhập đường dẫn URL' }]}
        >
          <Input placeholder="https://example.com" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
