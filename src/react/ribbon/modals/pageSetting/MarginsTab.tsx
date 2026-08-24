import React from 'react'
import { Form, InputNumber, Select, Space, Button, Segmented } from 'antd'
import {
  MarginUnit,
  MarginPreset,
  MARGIN_PRESETS,
  UNIT_CONFIG
} from './types'

interface MarginsTabProps {
  selectedUnit: MarginUnit
  onUnitChange: (unit: MarginUnit) => void
  onApplyPreset: (preset: MarginPreset) => void
}

export const MarginsTab: React.FC<MarginsTabProps> = ({
  selectedUnit,
  onUnitChange,
  onApplyPreset
}) => {
  const currentUnitConfig = UNIT_CONFIG[selectedUnit]

  return (
    <div>
      {/* Unit Selector Bar with Instant Conversion */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          padding: '6px 10px',
          backgroundColor: '#f6f8fa',
          borderRadius: '6px',
          border: '1px solid #e1e4e8'
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>
          Đơn vị đo (Measurement unit):
        </span>
        <Segmented
          value={selectedUnit}
          onChange={val => onUnitChange(val as MarginUnit)}
          options={[
            { label: 'inch', value: 'inch' },
            { label: 'mm', value: 'mm' },
            { label: 'cm', value: 'cm' },
            { label: 'pt', value: 'pt' }
          ]}
        />
      </div>

      {/* Presets */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            color: '#666',
            marginBottom: 6
          }}
        >
          Mẫu lề nhanh (Presets):
        </div>
        <Space wrap size={[6, 6]}>
          {MARGIN_PRESETS.map((p, idx) => (
            <Button
              key={idx}
              size="small"
              onClick={() => onApplyPreset(p)}
            >
              {p.label.split(' ')[0]}
            </Button>
          ))}
        </Space>
      </div>

      {/* Margin Inputs in selected unit */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}
      >
        <Form.Item
          name="top"
          label="Lề trên (Top)"
          rules={[{ required: true, message: 'Nhập lề trên' }]}
        >
          <InputNumber
            step={currentUnitConfig.step}
            precision={currentUnitConfig.precision}
            min={0}
            max={currentUnitConfig.max}
            style={{ width: '100%' }}
            suffix={currentUnitConfig.addon}
          />
        </Form.Item>
        <Form.Item
          name="bottom"
          label="Lề dưới (Bottom)"
          rules={[{ required: true, message: 'Nhập lề dưới' }]}
        >
          <InputNumber
            step={currentUnitConfig.step}
            precision={currentUnitConfig.precision}
            min={0}
            max={currentUnitConfig.max}
            style={{ width: '100%' }}
            suffix={currentUnitConfig.addon}
          />
        </Form.Item>
        <Form.Item
          name="left"
          label="Lề trái (Left)"
          rules={[{ required: true, message: 'Nhập lề trái' }]}
        >
          <InputNumber
            step={currentUnitConfig.step}
            precision={currentUnitConfig.precision}
            min={0}
            max={currentUnitConfig.max}
            style={{ width: '100%' }}
            suffix={currentUnitConfig.addon}
          />
        </Form.Item>
        <Form.Item
          name="right"
          label="Lề phải (Right)"
          rules={[{ required: true, message: 'Nhập lề phải' }]}
        >
          <InputNumber
            step={currentUnitConfig.step}
            precision={currentUnitConfig.precision}
            min={0}
            max={currentUnitConfig.max}
            style={{ width: '100%' }}
            suffix={currentUnitConfig.addon}
          />
        </Form.Item>
      </div>

      {/* Gutter Inputs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          borderTop: '1px dashed #e8e8e8',
          paddingTop: '12px',
          marginTop: '4px'
        }}
      >
        <Form.Item
          name="gutter"
          label="Gáy sách (Gutter width)"
          tooltip="Khoảng cách bổ sung dành riêng cho đóng gáy tài liệu"
        >
          <InputNumber
            step={currentUnitConfig.step}
            precision={currentUnitConfig.precision}
            min={0}
            max={currentUnitConfig.max / 2}
            style={{ width: '100%' }}
            suffix={currentUnitConfig.addon}
          />
        </Form.Item>
        <Form.Item
          name="gutterPosition"
          label="Vị trí gáy (Gutter position)"
          tooltip="Vị trí đặt lề đóng gáy sách (Trái hoặc Trên)"
        >
          <Select
            options={[
              { value: 'left', label: 'Bên trái (Left)' },
              { value: 'top', label: 'Phía trên (Top)' }
            ]}
          />
        </Form.Item>
      </div>
    </div>
  )
}
