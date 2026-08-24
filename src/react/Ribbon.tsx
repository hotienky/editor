import { Image } from 'antd';
import React from 'react';
import {
    CodeBlockModal,
    ColumnModal,
    HomeTab,
    HyperlinkModal,
    InsertTab,
    LatexModal,
    MarginModal,
    PageLayoutTab,
    PageSettingModal,
    ReferencesTab,
    ReviewTab,
    RibbonProvider,
    SearchReplaceModal,
    SectionDevTab,
    TopBar,
    useRibbon,
    useRibbonState,
    ViewTab,
    WatermarkModal,
    type RibbonProps
} from './ribbon';

const RibbonBodyContainer: React.FC<{
  className?: string
  style?: React.CSSProperties
}> = ({ className = '', style = {} }) => {
  const ribbon = useRibbon()

  return (
    <div
      className={`wps-ribbon-container ${className}`}
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e1e4e8',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={ribbon.fileInputRef}
        style={{ display: 'none' }}
        accept=".docx,.doc,.json"
        onChange={ribbon.handleFileImport}
      />
      <input
        type="file"
        ref={ribbon.imageInputRef}
        style={{ display: 'none' }}
        accept=".png,.jpg,.jpeg,.svg,.gif"
        onChange={ribbon.handleImageImport}
      />

      {/* Top Bar: Menu, Quick Access, Tabs, Settings */}
      <TopBar />

      {/* Ribbon Body Toolbar: Active Tab Content */}
      {!ribbon.isCollapsed && (
        <div
          className="wps-ribbon-body"
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '66px',
            padding: '2px 8px',
            backgroundColor: '#ffffff',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          {ribbon.activeTab === 'home' && <HomeTab />}
          {ribbon.activeTab === 'insert' && <InsertTab />}
          {ribbon.activeTab === 'layout' && <PageLayoutTab />}
          {ribbon.activeTab === 'references' && <ReferencesTab />}
          {ribbon.activeTab === 'review' && <ReviewTab />}
          {ribbon.activeTab === 'view' && <ViewTab />}
          {(ribbon.activeTab === 'section' ||
            ribbon.activeTab === 'developer') && <SectionDevTab />}
        </div>
      )}

      {/* Ribbon Modals */}
      <HyperlinkModal />
      <CodeBlockModal />
      <LatexModal />
      <WatermarkModal />
      <MarginModal />
      <PageSettingModal />
      <ColumnModal />
      <SearchReplaceModal />

      {/* Ant Design Image Preview (triggered by double-click on canvas image) */}
      <Image
        style={{ display: 'none' }}
        src={ribbon.previewImageSrc}
        alt="Preview"
        preview={{
          visible: ribbon.previewImageOpen,
          onVisibleChange: visible => ribbon.setPreviewImageOpen(visible)
        }}
      />
    </div>
  )
}

export const Ribbon: React.FC<RibbonProps> = props => {
  const ribbonState = useRibbonState(props)

  return (
    <RibbonProvider value={ribbonState}>
      <RibbonBodyContainer className={props.className} style={props.style} />
    </RibbonProvider>
  )
}

export default Ribbon
