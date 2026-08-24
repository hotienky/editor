import React from 'react'
import { MarginUnit, PreviewValues, UNIT_CONFIG, fromMm } from './types'

interface PreviewBoxProps {
  isLandscape: boolean
  previewValues: PreviewValues
  selectedUnit: MarginUnit
  calculatedColWidth: number
}

export const PreviewBox: React.FC<PreviewBoxProps> = ({
  isLandscape,
  previewValues,
  selectedUnit,
  calculatedColWidth
}) => {
  const currentUnitConfig = UNIT_CONFIG[selectedUnit]

  return (
    <div
      style={{
        width: '170px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderLeft: '1px solid #f0f0f0',
        paddingLeft: '16px'
      }}
    >
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        Xem trước (Preview):
      </div>
      <div
        style={{
          width: isLandscape ? '135px' : '95px',
          height: isLandscape ? '95px' : '135px',
          backgroundColor: '#ffffff',
          border: '1px solid #b0c4de',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '2px',
          position: 'relative',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {/* Gutter visual indicator */}
        {previewValues.gutterMm > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              ...(previewValues.gutterPosition === 'top'
                ? {
                    right: 0,
                    height: `${Math.min(
                      24,
                      Math.max(4, (previewValues.gutterMm / 50) * 24)
                    )}px`,
                    borderBottom: '1px dotted #ff7875',
                    backgroundColor: 'rgba(255, 77, 79, 0.12)'
                  }
                : {
                    bottom: 0,
                    width: `${Math.min(
                      24,
                      Math.max(4, (previewValues.gutterMm / 50) * 24)
                    )}px`,
                    borderRight: '1px dotted #ff7875',
                    backgroundColor: 'rgba(255, 77, 79, 0.12)'
                  })
            }}
            title="Gáy sách (Gutter)"
          />
        )}

        {/* Header distance line indicator */}
        {previewValues.headerMm > 0 && (
          <div
            style={{
              position: 'absolute',
              top: `${Math.min(
                26,
                Math.max(2, (previewValues.headerMm / 100) * 40)
              )}px`,
              left: '6px',
              right: '6px',
              borderTop: '1px dotted #52c41a'
            }}
            title="Vị trí Header"
          />
        )}

        {/* Footer distance line indicator */}
        {previewValues.footerMm > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: `${Math.min(
                26,
                Math.max(2, (previewValues.footerMm / 100) * 40)
              )}px`,
              left: '6px',
              right: '6px',
              borderBottom: '1px dotted #fa8c16'
            }}
            title="Vị trí Footer"
          />
        )}

        {/* Margin visual box with Multi-Columns preview */}
        <div
          style={{
            position: 'absolute',
            top: `${Math.min(
              30,
              Math.max(
                4,
                ((previewValues.topMm +
                  (previewValues.gutterPosition === 'top'
                    ? previewValues.gutterMm
                    : 0)) /
                  100) *
                  40
              )
            )}px`,
            bottom: `${Math.min(
              30,
              Math.max(4, (previewValues.bottomMm / 100) * 40)
            )}px`,
            left: `${Math.min(
              30,
              Math.max(
                4,
                ((previewValues.leftMm +
                  (previewValues.gutterPosition === 'left'
                    ? previewValues.gutterMm
                    : 0)) /
                  100) *
                  40
              )
            )}px`,
            right: `${Math.min(
              30,
              Math.max(4, (previewValues.rightMm / 100) * 40)
            )}px`,
            border: '1px dashed #2b7de9',
            backgroundColor: 'rgba(43, 125, 233, 0.05)',
            borderRadius: '1px',
            display: 'flex',
            gap: `${Math.max(
              2,
              Math.min(8, (previewValues.columnSpacingMm / 20) * 8)
            )}px`,
            padding: '2px'
          }}
        >
          {previewValues.columnCount > 1
            ? Array.from({ length: previewValues.columnCount }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: '100%',
                    backgroundColor: 'rgba(43, 125, 233, 0.08)',
                    borderRadius: '1px',
                    borderRight:
                      previewValues.columnSeparator &&
                      idx < previewValues.columnCount - 1
                        ? '1px solid #2b7de9'
                        : 'none'
                  }}
                />
              ))
            : null}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: '#555',
          marginTop: 8,
          textAlign: 'center',
          lineHeight: '16px'
        }}
      >
        {isLandscape ? 'Khổ ngang' : 'Khổ dọc'}
        <br />
        {previewValues.width} × {previewValues.height} px
        {previewValues.columnCount > 1 && (
          <>
            <br />
            <span style={{ color: '#2b7de9', fontWeight: 500 }}>
              {previewValues.columnCount} Cột ({calculatedColWidth}{' '}
              {currentUnitConfig.addon})
            </span>
          </>
        )}
        {previewValues.gutterMm > 0 && (
          <>
            <br />
            <span style={{ color: '#cf1322' }}>
              Gáy: {fromMm(previewValues.gutterMm, selectedUnit)}{' '}
              {currentUnitConfig.addon} (
              {previewValues.gutterPosition === 'left' ? 'Trái' : 'Trên'})
            </span>
          </>
        )}
        {(previewValues.headerMm > 0 || previewValues.footerMm > 0) && (
          <>
            <br />
            <span style={{ color: '#52c41a' }}>
              H: {fromMm(previewValues.headerMm, selectedUnit)}{' '}
              {currentUnitConfig.addon}
            </span>
            {' | '}
            <span style={{ color: '#fa8c16' }}>
              F: {fromMm(previewValues.footerMm, selectedUnit)}{' '}
              {currentUnitConfig.addon}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
