import React, { useEffect, useState, useRef } from 'react'
import { KindyEditorReact } from './KindyEditorReact'
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  seedInitialData,
} from './db'

export default function App() {
  const [documents, setDocuments] = useState([])
  const [activeDoc, setActiveDoc] = useState(null)
  const [saveStatus, setSaveStatus] = useState('')
  const editorRef = useRef(null)

  // Load documents from IndexedDB on startup
  useEffect(() => {
    async function init() {
      let docs = await getAllDocuments()
      if (docs.length === 0) {
        const initial = seedInitialData()
        for (const d of initial) {
          await saveDocument(d)
        }
        docs = await getAllDocuments()
      }
      setDocuments(docs)
      if (docs.length > 0) {
        setActiveDoc(docs[0])
      }
    }
    init()
  }, [])

  // Create new document
  const handleNewDoc = async () => {
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: 'Tài liệu không tên',
      content: '<h1>Tài liệu mới</h1><p>Bắt đầu nhập nội dung tại đây...</p>',
      updatedAt: Date.now(),
    }
    await saveDocument(newDoc)
    const docs = await getAllDocuments()
    setDocuments(docs)
    setActiveDoc(newDoc)
  }

  // Delete document
  const handleDeleteDoc = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này khỏi Database?')) {
      return
    }
    await deleteDocument(id)
    const docs = await getAllDocuments()
    setDocuments(docs)
    if (activeDoc?.id === id) {
      setActiveDoc(docs[0] || null)
    }
  }

  // Save document to Database
  const handleSave = async (htmlContent) => {
    if (!activeDoc) return
    setSaveStatus('Đang lưu vào DB...')
    const updated = {
      ...activeDoc,
      content: htmlContent || activeDoc.content,
      updatedAt: Date.now(),
    }
    await saveDocument(updated)
    const docs = await getAllDocuments()
    setDocuments(docs)
    setActiveDoc(updated)
    setSaveStatus('✓ Đã lưu Database thành công!')
    setTimeout(() => setSaveStatus(''), 3000)
  }

  // Editor options
  const editorOptions = activeDoc
    ? {
        locale: 'vi-VN',
        document: {
          title: activeDoc.title,
          content: activeDoc.content,
        },
        async onSave(content) {
          await handleSave(content)
          return { success: true }
        },
      }
    : null

  return (
    <div className="app-container">
      {/* Sidebar: Document List from Database */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            📚 Database (IndexedDB)
          </div>
          <button className="new-doc-btn" onClick={handleNewDoc}>
            + Tạo tài liệu mới
          </button>
        </div>

        <div className="doc-list">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`doc-item ${activeDoc?.id === doc.id ? 'active' : ''}`}
              onClick={() => setActiveDoc(doc)}
            >
              <div className="doc-info">
                <div className="doc-title">{doc.title}</div>
                <div className="doc-date">
                  {new Date(doc.updatedAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </div>
              </div>
              <button
                className="delete-doc-btn"
                title="Xóa tài liệu"
                onClick={(e) => handleDeleteDoc(doc.id, e)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area: Editor */}
      <main className="main-content">
        {activeDoc ? (
          <>
            <header className="top-bar">
              <input
                type="text"
                className="top-title-input"
                value={activeDoc.title}
                onChange={(e) =>
                  setActiveDoc({ ...activeDoc, title: e.target.value })
                }
                onBlur={() => handleSave()}
              />
              <div className="actions">
                {saveStatus && <span className="save-status">{saveStatus}</span>}
                <button
                  className="save-btn"
                  onClick={() => handleSave()}
                >
                  💾 Lưu vào Database
                </button>
              </div>
            </header>

            <div className="editor-wrapper">
              <KindyEditorReact
                key={activeDoc.id}
                ref={editorRef}
                {...editorOptions}
              />
            </div>
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Không có tài liệu nào. Hãy bấm <strong>+ Tạo tài liệu mới</strong>.
          </div>
        )}
      </main>
    </div>
  )
}
