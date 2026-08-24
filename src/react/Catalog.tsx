import {
  CloseOutlined,
  SearchOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import { Button, Empty, Input, Tag, Tree } from 'antd'
import React, { FC, useEffect, useMemo, useState } from 'react'
import type Editor from '../editor'
import type { ICatalogItem } from '../editor/interface/Catalog'

export interface CatalogProps {
  editor?: Editor | null
  data?: ICatalogItem[]
  visible?: boolean
  onClose?: () => void
  onSelect?: (id: string, item: ICatalogItem) => void
  className?: string
  style?: React.CSSProperties
  showHeader?: boolean
  searchable?: boolean
}

interface AntdTreeItemData {
  key: string
  title: string
  pageNo?: number
  level?: string
  raw: ICatalogItem
  children?: AntdTreeItemData[]
}

function mapCatalogToTree(items: ICatalogItem[]): AntdTreeItemData[] {
  return items.map(item => ({
    key: item.id,
    title: item.name,
    pageNo: item.pageNo,
    level: item.level,
    raw: item,
    children: item.subCatalog ? mapCatalogToTree(item.subCatalog) : []
  }))
}

function filterCatalogTree(
  nodes: AntdTreeItemData[],
  text: string
): AntdTreeItemData[] {
  if (!text) return nodes
  const lowerText = text.toLowerCase()
  const result: AntdTreeItemData[] = []
  for (const node of nodes) {
    const match = node.title.toLowerCase().includes(lowerText)
    const filteredChildren = node.children
      ? filterCatalogTree(node.children, text)
      : []
    if (match || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren
      })
    }
  }
  return result
}

function getAllKeys(nodes: AntdTreeItemData[]): string[] {
  const keys: string[] = []
  nodes.forEach(node => {
    keys.push(node.key)
    if (node.children && node.children.length > 0) {
      keys.push(...getAllKeys(node.children))
    }
  })
  return keys
}

export const Catalog: FC<CatalogProps> = ({
  editor,
  data: propData,
  visible = true,
  onClose,
  onSelect,
  className = '',
  style,
  showHeader = true,
  searchable = true
}) => {
  const [catalogData, setCatalogData] = useState<ICatalogItem[]>(propData || [])
  const [filterText, setFilterText] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [autoExpandParent, setAutoExpandParent] = useState(true)

  const updateCatalogFromEditor = async () => {
    if (!editor) return
    const items = await editor.command.getCatalog()
    setCatalogData(items || [])
  }

  useEffect(() => {
    if (propData) {
      setCatalogData(propData)
    } else if (editor) {
      updateCatalogFromEditor()
    }
  }, [propData, editor])

  const treeData = useMemo(() => mapCatalogToTree(catalogData), [catalogData])
  const filteredTreeData = useMemo(
    () => filterCatalogTree(treeData, filterText),
    [treeData, filterText]
  )

  useEffect(() => {
    const keys = getAllKeys(filteredTreeData)
    setExpandedKeys(keys)
    setAutoExpandParent(true)
  }, [filteredTreeData])

  const selectedKeys = useMemo(() => (activeId ? [activeId] : []), [activeId])

  const handleSelect = (
    keys: React.Key[],
    info: { node: AntdTreeItemData }
  ) => {
    const id = (keys[0] || info.node?.key) as string
    if (!id) return
    setActiveId(id)
    if (editor) {
      editor.command.executeLocationCatalog(id)
    }
    if (onSelect && info.node?.raw) {
      onSelect(id, info.node.raw)
    }
  }

  const handleExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys)
    setAutoExpandParent(false)
  }

  if (!visible) return null

  const hasData = treeData.length > 0

  return (
    <div
      className={`catalog ${className}`}
      editor-component="catalog"
      style={{
        display: visible ? 'flex' : 'none',
        flexDirection: 'column',
        ...style
      }}
    >
      {showHeader && (
        <div className="catalog__header">
          <div className="catalog__header__title">
            <UnorderedListOutlined style={{ marginRight: 6, fontSize: 16 }} />
            <span>Mục lục</span>
            {hasData && (
              <Tag
                variant="outlined"
                color="processing"
                style={{ marginLeft: 8, fontSize: 11 }}
              >
                {catalogData.length}
              </Tag>
            )}
          </div>
          {onClose && (
            <Button
              type="text"
              size="small"
              className="catalog__header__close"
              icon={<CloseOutlined />}
              onClick={onClose}
            />
          )}
        </div>
      )}

      {searchable && hasData && (
        <div className="catalog__search" style={{ padding: '8px 0' }}>
          <Input
            size="small"
            placeholder="Tìm kiếm mục lục..."
            prefix={<SearchOutlined />}
            allowClear
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>
      )}

      <div className="catalog__main">
        {hasData ? (
          <Tree
            treeData={filteredTreeData}
            showLine
            selectedKeys={selectedKeys}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            onExpand={handleExpand}
            onSelect={handleSelect}
            titleRender={(node: AntdTreeItemData) => (
              <div
                className="catalog-tree-node"
                title={node.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  overflow: 'hidden'
                }}
              >
                <span
                  className="catalog-tree-node__text"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {node.title}
                </span>
                {node.pageNo !== undefined && (
                  <span
                    className="catalog-tree-node__page"
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      color: '#9097a3',
                      flexShrink: 0
                    }}
                  >
                    Tr. {node.pageNo + 1}
                  </span>
                )}
              </div>
            )}
          />
        ) : (
          <div
            className="catalog__empty"
            style={{
              paddingTop: 40,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ fontSize: 13, color: '#9097a3' }}>
                  Chưa có mục lục
                </span>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Catalog
