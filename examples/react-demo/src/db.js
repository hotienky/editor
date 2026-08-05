/**
 * IndexedDB Database Manager for Storing Documents & Comments
 */
const DB_NAME = 'KindyEditorDB'
const DB_VERSION = 1
const STORE_NAME = 'documents'

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllDocuments() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const docs = request.result || []
      // Sort by updatedAt descending
      docs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      resolve(docs)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function saveDocument(doc) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const data = {
      ...doc,
      updatedAt: Date.now(),
    }
    const request = store.put(data)

    request.onsuccess = () => resolve(data)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteDocument(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

export function seedInitialData() {
  return [
    {
      id: 'doc-welcome',
      title: 'Hướng dẫn sử dụng Kindy Editor trên React',
      content: `<h1>Chào mừng bạn đến với Kindy Editor trên React.js! 🎉</h1>
<p>Đây là ứng dụng demo tích hợp thư viện <strong>kindy-editor</strong> với cơ sở dữ liệu <strong>IndexedDB</strong>.</p>
<h3>✨ Tính năng đã sẵn sàng:</h3>
<ul>
  <li><strong>Phân trang dạng Word</strong> với lề chuẩn A4.</li>
  <li><strong>Bình luận kiểu Word</strong> (Bôi đen đoạn văn bản bất kỳ và bấm nút <em>Bình luận</em>).</li>
  <li><strong>Tự động lưu vào Cơ sở dữ liệu (IndexedDB)</strong> khi bấm <em>Lưu tài liệu</em> hoặc Ctrl+S.</li>
</ul>
<p>Bôi đen đoạn chữ này để gắn bình luận thử ngay!</p>`,
      updatedAt: Date.now(),
    },
    {
      id: 'doc-report',
      title: 'Báo cáo kế hoạch Quý 3',
      content: `<h1>Báo cáo Kế hoạch Quý 3</h1>
<hr />
<h2>1. Mục tiêu trọng tâm</h2>
<p>Đưa trình biên tập Kindy Editor lên hệ thống chính thức và hỗ trợ các nền tảng React/Vue/Angular.</p>
<h2>2. Kế hoạch triển khai</h2>
<ol>
  <li>Xây dựng API Backend và Database lưu trữ.</li>
  <li>Tích hợp hệ thống phân quyền bình luận.</li>
</ol>`,
      updatedAt: Date.now() - 3600000,
    },
  ]
}
