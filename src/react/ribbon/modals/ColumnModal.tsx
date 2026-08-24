import { Checkbox, Form, InputNumber, message, Modal, Select } from 'antd';
import React from 'react';
import { useRibbon } from '../RibbonContext';

export const ColumnModal: React.FC = () => {
  const { editor, columnModalOpen, setColumnModalOpen, columnForm } = useRibbon()

  const handleOk = () => {
    columnForm.validateFields().then(values => {
      if (!editor) return
      editor.command.executeSetColumns({
        count: Number(values.count || 1),
        gap: Number(values.gap || 20),
        separator: !!values.separator
      })
      setColumnModalOpen(false)
      message.success('Đã cập nhật chia cột')
    })
  }

  return (
    <Modal
      title="Chia cột văn bản"
      open={columnModalOpen}
      onOk={handleOk}
      onCancel={() => setColumnModalOpen(false)}
      destroyOnHidden
    >
      <Form
        form={columnForm}
        layout="vertical"
        initialValues={{ count: 2, gap: 20, separator: false }}
      >
        <Form.Item name="count" label="Số lượng cột">
          <Select
            options={[
              { label: '1 cột (Mặc định)', value: 1 },
              { label: '2 cột', value: 2 },
              { label: '3 cột', value: 3 }
            ]}
          />
        </Form.Item>
        <Form.Item name="gap" label="Khoảng cách giữa các cột (px)">
          <InputNumber min={5} max={100} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="separator" valuePropName="checked">
          <Checkbox>Đường kẻ phân cách giữa các cột</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  )
}
