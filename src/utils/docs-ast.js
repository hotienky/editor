/**
 * Google Docs API AST Exporter & Importer Utility
 * Transforms TipTap / ProseMirror JSON AST to/from Google Docs Document API schema.
 */

export function exportGoogleDocsAST(editor, tabs = []) {
  if (!editor) return null

  const jsonContent = editor.getJSON()
  
  return {
    title: 'Untitled Document',
    documentId: `doc-${Date.now()}`,
    revisionId: '1.0.0',
    tabs: tabs.map((tab, idx) => ({
      tabId: tab.id,
      childTabs: [],
      documentTab: {
        title: tab.title,
        body: {
          content: convertNodeToGoogleDocsElements(jsonContent),
        },
      },
    })),
    body: {
      content: convertNodeToGoogleDocsElements(jsonContent),
    },
  }
}

function convertNodeToGoogleDocsElements(node) {
  if (!node || !node.content) return []

  return node.content.map((child, idx) => {
    if (child.type === 'paragraph') {
      return {
        startIndex: idx * 10,
        endIndex: (idx + 1) * 10,
        paragraph: {
          elements: (child.content || []).map((textNode) => ({
            textRun: {
              content: textNode.text || '',
              textStyle: {
                bold: textNode.marks?.some((m) => m.type === 'bold') || false,
                italic: textNode.marks?.some((m) => m.type === 'italic') || false,
                underline: textNode.marks?.some((m) => m.type === 'underline') || false,
              },
            },
          })),
        },
      }
    }

    if (child.type === 'codeBlock') {
      return {
        codeBlock: {
          language: child.attrs?.language || 'plain',
          content: child.content?.[0]?.text || '',
        },
      }
    }

    if (child.type === 'table') {
      return {
        table: {
          rows: child.content?.length || 0,
          columns: child.content?.[0]?.content?.length || 0,
        },
      }
    }

    return {
      paragraph: {
        elements: [{ textRun: { content: '' } }],
      },
    }
  })
}
