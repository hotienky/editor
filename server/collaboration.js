/**
 * Kindy Editor - Yjs Real-time Collaboration WebSocket Gateway Server
 * Enables real-time co-authoring, colored cursors, and presence sync.
 */

import http from 'http'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'

const PORT = process.env.PORT || 1234
const docs = new Map()

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Kindy Editor Collaboration Gateway is running.\n')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (conn, req) => {
  const docName = req.url.slice(1) || 'default-document'

  if (!docs.has(docName)) {
    docs.set(docName, new Y.Doc())
  }

  const ydoc = docs.get(docName)

  conn.on('message', (message) => {
    // Broadcast Yjs updates to all connected clients except sender
    wss.clients.forEach((client) => {
      if (client !== conn && client.readyState === 1) {
        client.send(message)
      }
    })
  })

  conn.on('close', () => {
    // Connection closed
  })
})

server.listen(PORT, () => {
  console.log(`[Kindy Collaboration Gateway] Listening on ws://localhost:${PORT}`)
})
