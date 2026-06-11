import http from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT || 3001)

const clients = new Map()

function broadcastToChat(chatId, payload, excludeSocket = null) {
  const room = clients.get(chatId) || new Set()
  for (const client of room) {
    if (client.readyState !== 1) continue
    if (excludeSocket && client === excludeSocket) continue
    client.send(JSON.stringify(payload))
  }
}

function removeClientFromChat(ws, chatId) {
  const room = clients.get(chatId)
  if (!room) return
  room.delete(ws)
  if (room.size === 0) {
    clients.delete(chatId)
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'hash-chat-ws' }))
    return
  }

  if (req.method === 'POST' && req.url === '/api/chat-events') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        if (!payload || !payload.chatId || !payload.type) {
          throw new Error('Missing chatId or type')
        }
        broadcastToChat(payload.chatId, payload)
        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      } catch (error) {
        console.error('Broadcast error:', error)
      }
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Invalid payload' }))
    })
    return
  }

  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url || '/', 'http://localhost')

  if (pathname === '/ws' || pathname === '/') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
    return
  }

  socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
  socket.destroy()
})

wss.on('connection', (ws, req) => {
  ws.chatRooms = new Set()
  ws.userId = null
  console.log('🔌 New WebSocket connection from:', req.socket.remoteAddress)

  const cleanupConnection = () => {
    for (const chatId of ws.chatRooms) {
      removeClientFromChat(ws, chatId)
      if (ws.userId) {
        broadcastToChat(chatId, {
          type: 'presence:update',
          chatId,
          userId: ws.userId,
          status: 'offline',
        }, ws)
      }
    }
    ws.chatRooms.clear()
  }

  ws.on('message', (raw) => {
    try {
      const payload = JSON.parse(raw.toString())
      if (!payload || !payload.type) return

      if (payload.type === 'subscribe' && payload.chatId) {
        if (!clients.has(payload.chatId)) {
          clients.set(payload.chatId, new Set())
        }
        clients.get(payload.chatId).add(ws)
        ws.chatRooms.add(payload.chatId)
        if (payload.userId) {
          ws.userId = payload.userId
        }

        ws.send(JSON.stringify({ type: 'subscribed', chatId: payload.chatId }))

        if (ws.userId) {
          broadcastToChat(payload.chatId, {
            type: 'presence:update',
            chatId: payload.chatId,
            userId: ws.userId,
            status: 'online',
          }, ws)
        }
        return
      }

      if (payload.type === 'unsubscribe' && payload.chatId) {
        removeClientFromChat(ws, payload.chatId)
        ws.chatRooms.delete(payload.chatId)
        return
      }

      if (payload.chatId) {
        broadcastToChat(payload.chatId, payload, ws)
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
    }
  })

  ws.on('close', cleanupConnection)
  ws.on('error', cleanupConnection)

  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Hash Chat' }))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     Hash Chat WebSocket Server - Running Successfully              ║
╚══════════════════════════════════════════════════════════════════╝

📡 HTTP Server:      http://0.0.0.0:${PORT}
🔌 WebSocket URL:    ws://0.0.0.0:${PORT}/ws
📊 Health Check:     http://0.0.0.0:${PORT}/health

✅ Ready to accept WebSocket connections
  `)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
