import React from 'react'
import { Form, InputNumber, Select, Radio, Space } from 'antd'
import { ColumnWidthOutlined } from '@ant-design/icons'
import { PAPER_PRESETS } from './types'
import { PaperDirection } from '../../../../editor'

interface PaperTabProps {
  selectedPaperKey: string
  onPaperKeyChange: (key: string) => void
}

export const PaperTab: React.FC<PaperTabProps> = ({
  selectedPaperKey,
  onPaperKeyChange
}) => {
  return (
    <div>
      <Form.Item name="paperKey" label="Khổ giấy (Paper Size)">
        <Select
          value={selectedPaperKey}
          onChange={onPaperKeyChange}
          options={Object.entries(PAPER_PRESETS).map(([key, val]) => ({
            value: key,
            label: val.label
          }))}
        />
      </Form.Item>

      {selectedPaperKey === 'custom' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}
        >
          <Form.Item
            name="customWidth"
            label="Chiều rộng (Width)"
            rules={[{ required: true, message: 'Nhập chiều rộng' }]}
          >
            <InputNumber
              min={200}
              max={3000}
              style={{ width: '100%' }}
              suffix="px"
            />
          </Form.Item>
          <Form.Item
            name="customHeight"
            label="Chiều cao (Height)"
            rules={[{ required: true, message: 'Nhập chiều cao' }]}
          >
            <InputNumber
              min={200}
              max={4000}
              style={{ width: '100%' }}
              suffix="px"
            />
          </Form.Item>
        </div>
      )}

      <Form.Item
        name="direction"
        label="Hướng trang (Orientation)"
        style={{ marginTop: 8 }}
      >
        <Radio.Group style={{ width: '100%' }}>
          <Space size={16}>
            <Radio value={PaperDirection.VERTICAL}>
              <Space>
                <ColumnWidthOutlined rotate={90} />
                <span>Hướng dọc (Portrait)</span>
              </Space>
            </Radio>
            <Radio value={PaperDirection.HORIZONTAL}>
              <Space>
                <ColumnWidthOutlined />
                <span>Hướng ngang (Landscape)</span>
              </Space>
            </Radio>
          </Space>
        </Radio.Group>
      </Form.Item>
    </div>
  )
}
