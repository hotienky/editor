import React from 'react'
import { Modal, Form, Input, message } from 'antd'
import { useRibbon } from '../RibbonContext'
import { ElementType } from '../../../editor'

export const LatexModal: React.FC = () => {
  const { editor, latexModalOpen, setLatexModalOpen, latexForm } = useRibbon()

  const handleOk = () => {
    latexForm.validateFields().then(values => {
      if (!editor) return
      editor.command.executeInsertElementList([
        {
          type: ElementType.LATEX,
          value: values.code
        }
      ])
      setLatexModalOpen(false)
      latexForm.resetFields()
      message.success('Đã chèn công thức toán')
    })
  }

  return (
    <Modal
      title="Chèn công thức toán học LaTeX"
      open={latexModalOpen}
      onOk={handleOk}
      onCancel={() => setLatexModalOpen(false)}
      destroyOnClose
    >
      <Form form={latexForm} layout="vertical">
        <Form.Item
          name="code"
          label="Công thức LaTeX"
          rules={[{ required: true, message: 'Vui lòng nhập công thức LaTeX' }]}
        >
          <Input.TextArea rows={4} placeholder="E = mc^2 hoặc \frac{a}{b}" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
