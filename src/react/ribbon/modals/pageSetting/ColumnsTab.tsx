import React from 'react'
import { Form, InputNumber, Button, Card, Checkbox } from 'antd'
import { MarginUnit, UNIT_CONFIG } from './types'

interface ColumnsTabProps {
  selectedUnit: MarginUnit
  currentColumnCount: number
  calculatedColWidth: number
  onApplyColumnPreset: (type: 'one' | 'two' | 'three' | 'left' | 'right') => void
}

export const ColumnsTab: React.FC<ColumnsTabProps> = ({
  selectedUnit,
  currentColumnCount,
  calculatedColWidth,
  onApplyColumnPreset
}) => {
  const currentUnitConfig = UNIT_CONFIG[selectedUnit]

  return (
    <div>
      {/* Presets: One, Two, Three, Left, Right */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            color: '#666',
            marginBottom: 8,
            fontWeight: 500
          }}
        >
          Mẫu chia cột nhanh (Presets):
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px'
          }}
        >
          <Button
            size="small"
            onClick={() => onApplyColumnPreset('one')}
            type={currentColumnCount === 1 ? 'primary' : 'default'}
          >
            One (1)
          </Button>
          <Button
            size="small"
            onClick={() => onApplyColumnPreset('two')}
            type={currentColumnCount === 2 ? 'primary' : 'default'}
          >
            Two (2)
          </Button>
          <Button
            size="small"
            onClick={() => onApplyColumnPreset('three')}
            type={currentColumnCount === 3 ? 'primary' : 'default'}
          >
            Three (3)
          </Button>
          <Button
            size="small"
            onClick={() => onApplyColumnPreset('left')}
          >
            Left
          </Button>
          <Button
            size="small"
            onClick={() => onApplyColumnPreset('right')}
          >
            Right
          </Button>
        </div>
      </div>

      {/* Number of columns & Spacing */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}
      >
        <Form.Item
          name="columnCount"
          label="Số lượng cột (Number of columns)"
          rules={[{ required: true, message: 'Chọn số cột' }]}
        >
          <InputNumber
            min={1}
            max={10}
            step={1}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          name="columnSpacing"
          label="Khoảng cách cột (Spacing)"
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

      {/* Dynamic Column Width Display */}
      <Card
        size="small"
        style={{
          backgroundColor: '#fafafa',
          borderColor: '#e8e8e8',
          marginTop: '2px',
          marginBottom: '12px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12
          }}
        >
          <span style={{ color: '#666' }}>
            Độ rộng mỗi cột (Column width):
          </span>
          <strong style={{ color: '#2b7de9' }}>
            {calculatedColWidth} {currentUnitConfig.addon}
          </strong>
        </div>
      </Card>

      {/* Line between */}
      <Form.Item name="columnSeparator" valuePropName="checked">
        <Checkbox>
          Đường kẻ phân cách giữa các cột (Line between)
        </Checkbox>
      </Form.Item>
    </div>
  )
}
