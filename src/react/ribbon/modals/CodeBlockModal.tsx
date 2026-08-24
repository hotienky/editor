import { Form, Input, message, Modal } from 'antd';
import prism from 'prismjs';
import React from 'react';
import { splitText } from '../../../editor';
import { formatPrismToken } from '../../../utils/prism';
import { useRibbon } from '../RibbonContext';

export const CodeBlockModal: React.FC = () => {
  const { editor, codeModalOpen, setCodeModalOpen, codeForm } = useRibbon()

  const handleOk = () => {
    codeForm.validateFields().then(values => {
      if (!editor) return
      const tokenList = prism.tokenize(
        values.code,
        prism.languages.javascript || prism.languages.clike
      )
      const formatTokenList = formatPrismToken(tokenList)
      const elementList: any[] = []
      for (let i = 0; i < formatTokenList.length; i++) {
        const formatToken = formatTokenList[i]
        const tokenStringList = splitText(formatToken.content)
        for (let j = 0; j < tokenStringList.length; j++) {
          const value = tokenStringList[j]
          const el: any = { value }
          if (formatToken.color) el.color = formatToken.color
          if (formatToken.bold) el.bold = true
          if (formatToken.italic) el.italic = true
          elementList.push(el)
        }
      }
      elementList.unshift({ value: '\n' })
      editor.command.executeInsertElementList(elementList)
      setCodeModalOpen(false)
      codeForm.resetFields()
      message.success('Đã chèn khối mã')
    })
  }

  return (
    <Modal
      title="Chèn khối mã nguồn"
      open={codeModalOpen}
      onOk={handleOk}
      onCancel={() => setCodeModalOpen(false)}
      width={550}
      destroyOnHidden
    >
      <Form form={codeForm} layout="vertical">
        <Form.Item
          name="code"
          label="Mã nguồn (JavaScript, TypeScript, HTML, CSS...)"
          rules={[{ required: true, message: 'Vui lòng nhập mã nguồn' }]}
        >
          <Input.TextArea rows={8} placeholder="const message = 'Hello world!'" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
