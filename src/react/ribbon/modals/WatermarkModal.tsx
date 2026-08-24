import { Form, Input, InputNumber, Modal, Select, message } from 'antd';
import React from 'react';
import { useRibbon } from '../RibbonContext';

export const WatermarkModal: React.FC = () => {
  const {
    editor,
    watermarkModalOpen,
    setWatermarkModalOpen,
    watermarkForm
  } = useRibbon()

  const handleOk = () => {
    watermarkForm.validateFields().then(values => {
      if (!editor) return
      editor.command.executeAddWatermark({
        data: values.data,
        color:
          typeof values.color === 'string'
            ? values.color
            : values.color?.toHexString?.() || '#AEB5C0',
        size: Number(values.size || 100),
        opacity: Number(values.opacity || 0.3),
        repeat: values.repeat === '1'
      })
      setWatermarkModalOpen(false)
      message.success('Đã thêm hình mờ')
    })
  }

  const handleDelete = () => {
    editor?.command.executeDeleteWatermark()
    setWatermarkModalOpen(false)
    message.success('Đã xóa hình mờ')
  }

  return (
    <Modal
      title="Cài đặt hình mờ (Watermark)"
      open={watermarkModalOpen}
      onOk={handleOk}
      footer={[
        <button
          key="delete"
          className="ant-btn ant-btn-dangerous"
          onClick={handleDelete}
        >
          Xóa hình mờ
        </button>,
        <button
          key="cancel"
          className="ant-btn ant-btn-default"
          onClick={() => setWatermarkModalOpen(false)}
        >
          Hủy
        </button>,
        <button
          key="ok"
          className="ant-btn ant-btn-primary"
          onClick={() => watermarkForm.submit()}
        >
          Áp dụng
        </button>
      ]}
      onCancel={() => setWatermarkModalOpen(false)}
      destroyOnHidden
    >
      <Form
        form={watermarkForm}
        layout="vertical"
        initialValues={{
          data: 'BẢO MẬT',
          color: '#AEB5C0',
          size: 100,
          opacity: 0.3,
          repeat: '0'
        }}
      >
        <Form.Item
          name="data"
          label="Nội dung hình mờ"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
        >
          <Input placeholder="Văn bản hình mờ..." />
        </Form.Item>
        <Form.Item name="size" label="Cỡ chữ">
          <InputNumber min={20} max={200} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="opacity" label="Độ trong suốt (0 - 1)">
          <InputNumber min={0.05} max={1} step={0.05} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="repeat" label="Lặp lại toàn trang">
          <Select
            options={[
              { label: 'Không lặp', value: '0' },
              { label: 'Lặp lại toàn trang', value: '1' }
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
