import { DocumentModel, CommandEngine, InsertTextCommand } from '../packages/document-core/index.js'
import { LayoutEngine } from '../packages/layout-engine/index.js'
import { KindyEngine } from '../packages/kindy-doc/core/index.ts'
import { KindyDocumentNode, KindySectionNode, KindyParagraphNode, KindyTextNode } from '../packages/kindy-doc/document/index.ts'
import { InsertTextCommand as KindyInsertCommand } from '../packages/kindy-doc/transaction/index.ts'

console.log('====================================================')
console.log('🚀 DEMO 1: UMO Editor 2.0 Document Model & Layout Engine')
console.log('====================================================')

const doc = new DocumentModel({ title: 'Tài liệu Demo 2.0' })
const engine = new CommandEngine(doc)

console.log('\n[1] Khởi tạo Document AST ban đầu:')
console.log(JSON.stringify(doc.toJSON(), null, 2))

console.log('\n[2] Thực thi Command: Chèn thêm văn bản vào Paragraph 0...')
const cmd = new InsertTextCommand(0, 0, 0, ' - Đã thêm nội dung mới bằng CommandEngine!')
engine.execute(cmd)
console.log(JSON.stringify(doc.toJSON(), null, 2))

console.log('\n[3] Chạy Layout Engine để tính toán Phân trang A4 (Pagination):')
const layout = new LayoutEngine()
const pagesResult = layout.computeLayout(doc)
console.log(JSON.stringify(pagesResult, null, 2))

console.log('\n====================================================')
console.log('🚀 DEMO 2: KindyDoc Engine (@kindy/core, @kindy/document)')
console.log('====================================================')

const kindyDoc = new KindyDocumentNode({ title: 'KindyDoc Standard' })
const section = new KindySectionNode()
const paragraph = new KindyParagraphNode()
const text = new KindyTextNode('KindyDoc Operating System - Everything is a Node!')

paragraph.addChild(text)
section.addChild(paragraph)
kindyDoc.addChild(section)

const kindyEngine = new KindyEngine(kindyDoc)
console.log('\n[1] KindyDoc Canonical AST Tree:')
console.log(JSON.stringify(kindyEngine.toJSON(), null, 2))

console.log('\n[2] Thực thi KindyDoc Transaction Command:')
const kindyCmd = new KindyInsertCommand(text.id, ' [Transaction Applied]')
kindyEngine.execute(kindyCmd)
console.log('Đã ghi nhận Transaction thành công vào History Log!')

console.log('\n✅ DEMO HOÀN TẤT VỚI KẾT QUẢ HOÀN HẢO!')
