import { Form, InputNumber, Radio, Segmented, Space } from 'antd';
import React from 'react';
import { PageMode } from '../../../../editor';
import { MarginUnit, UNIT_CONFIG } from './types';

interface LayoutTabProps {
  selectedUnit: MarginUnit
  onUnitChange: (unit: MarginUnit) => void
}

export const LayoutTab: React.FC<LayoutTabProps> = ({
  selectedUnit,
  onUnitChange
}) => {
  const currentUnitConfig = UNIT_CONFIG[selectedUnit]

  return (
    <div>
      {/* Measurement unit in Layout Tab */}
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

      {/* Header & Footer Distances from Edge */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            color: '#666',
            marginBottom: 8,
            fontWeight: 500
          }}
        >
          Khoảng cách từ mép trang (Header / Footer distance):
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}
        >
          <Form.Item
            name="headerDistance"
            label="Đầu trang (Header distance)"
            tooltip="Khoảng cách từ mép trên cùng của trang đến tiêu đề đầu trang"
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
            name="footerDistance"
            label="Chân trang (Footer distance)"
            tooltip="Khoảng cách từ mép dưới cùng của trang đến tiêu đề chân trang"
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
      </div>

      {/* Page Mode */}
      <div
        style={{
          borderTop: '1px dashed #e8e8e8',
          paddingTop: '12px',
          marginTop: '4px'
        }}
      >
        <Form.Item name="pageMode" label="Chế độ hiển thị trang (Page Mode)">
          <Radio.Group>
            <Space vertical>
              <Radio value={PageMode.PAGING}>
                <strong>Phân trang (Paging)</strong> - Phân trang chuẩn như tài
                liệu in ấn
              </Radio>
              <Radio value={PageMode.CONTINUITY}>
                <strong>Liên tục (Continuity)</strong> - Hiển thị cuộn trang liền
                mạch
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
      </div>
    </div>
  )
}
