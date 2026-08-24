import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Checkbox, Form, Input, message, Modal } from 'antd';
import React from 'react';
import { useRibbon } from '../RibbonContext';

export const SearchReplaceModal: React.FC = () => {
  const {
    editor,
    searchModalOpen,
    setSearchModalOpen,
    searchForm,
    searchResultText,
    setSearchResultText
  } = useRibbon()

  const handleSearch = (val: string) => {
    if (!val || !editor) return
    editor.command.executeSearch(val)
    const res = editor.command.getSearchNavigateInfo()
    const count = res?.count || 0
    const index = res?.index || 0
    setSearchResultText(`${count ? index + 1 : 0}/${count}`)
  }

  const handleNavPre = () => {
    editor?.command.executeSearchNavigatePre()
    const res = editor?.command.getSearchNavigateInfo()
    if (res) setSearchResultText(`${res.index + 1}/${res.count}`)
  }

  const handleNavNext = () => {
    editor?.command.executeSearchNavigateNext()
    const res = editor?.command.getSearchNavigateInfo()
    if (res) setSearchResultText(`${res.index + 1}/${res.count}`)
  }

  const handleReplaceAll = () => {
    const keyword = searchForm.getFieldValue('keyword')
    const replaceValue = searchForm.getFieldValue('replace')
    if (keyword && replaceValue !== undefined && editor) {
      editor.command.executeReplace(replaceValue)
      message.success('Đã thay thế')
    }
  }

  return (
    <Modal
      title="Tìm kiếm và Thay thế (WPS Search & Replace)"
      open={searchModalOpen}
      onCancel={() => {
        setSearchModalOpen(false)
        setSearchResultText('')
        editor?.command.executeSearch(null)
      }}
      footer={null}
      width={420}
      destroyOnHidden
    >
      <Form
        form={searchForm}
        layout="vertical"
        initialValues={{ isReg: true, isCase: true, isSelection: false }}
        style={{ marginTop: 16 }}
      >
        <Form.Item name="keyword" label="Từ khóa tìm kiếm">
          <Input.Search
            placeholder="Nhập từ khóa cần tìm..."
            enterButton="Tìm"
            onSearch={handleSearch}
          />
        </Form.Item>

        {searchResultText && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12
            }}
          >
            <span>Kết quả: {searchResultText}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="ant-btn ant-btn-sm ant-btn-default"
                onClick={handleNavPre}
              >
                <LeftOutlined />
              </button>
              <button
                type="button"
                className="ant-btn ant-btn-sm ant-btn-default"
                onClick={handleNavNext}
              >
                <RightOutlined />
              </button>
            </div>
          </div>
        )}

        <Form.Item name="replace" label="Thay thế bằng">
          <Input placeholder="Từ khóa thay thế..." />
        </Form.Item>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: 16
          }}
        >
          <Form.Item name="isReg" valuePropName="checked" noStyle>
            <Checkbox>Regex</Checkbox>
          </Form.Item>
          <Form.Item name="isCase" valuePropName="checked" noStyle>
            <Checkbox>Phân biệt hoa/thường</Checkbox>
          </Form.Item>
          <Form.Item name="isSelection" valuePropName="checked" noStyle>
            <Checkbox>Trong vùng chọn</Checkbox>
          </Form.Item>
        </div>

        <button
          type="button"
          className="ant-btn ant-btn-primary"
          style={{ width: '100%' }}
          onClick={handleReplaceAll}
        >
          Thay thế tất cả
        </button>
      </Form>
    </Modal>
  )
}
