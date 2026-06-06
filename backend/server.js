import http from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT || 3001)

const clients = new Map()

function broadcastToChat(chatId, payload) {
  const room = clients.get(chatId) || new Set()
  for (const client of room) {
    if (client.readyState === 1) {
      client.send(JSON.stringify(payload))
    }
  }
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Health check endpoint
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'hash-chat-ws' }))
    return
  }

  // API endpoint for broadcasting
  if (req.method === 'POST' && req.url === '/api/chat-events') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        if (payload.chatId && payload.message) {
          broadcastToChat(payload.chatId, {
            type: payload.type || 'chat:update',
            chatId: payload.chatId,
            message: payload.message,
          })
          res.writeHead(202, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
          return
        }
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

// Create WebSocket server - let it handle upgrades automatically
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
})

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection from:', req.socket.remoteAddress)
  
  ws.on('message', (raw) => {
    try {
      const payload = JSON.parse(raw.toString())
      console.log('📨 Received:', payload)
      
      if (payload?.type === 'subscribe' && payload.chatId) {
        if (!clients.has(payload.chatId)) {
          clients.set(payload.chatId, new Set())
        }
        clients.get(payload.chatId).add(ws)
        
        ws.on('close', () => {
          const room = clients.get(payload.chatId)
          if (room) {
            room.delete(ws)
            if (room.size === 0) {
              clients.delete(payload.chatId)
            }
          }
        })
        
        ws.send(JSON.stringify({ type: 'subscribed', chatId: payload.chatId }))
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
    }
  })
  
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Hash Chat' }))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     Hash Chat WebSocket Server - Running Successfully    ║
╚══════════════════════════════════════════════════════════╝

📡 HTTP Server:      http://0.0.0.0:${PORT}
🔌 WebSocket URL:    ws://0.0.0.0:${PORT}/ws
📊 Health Check:     http://0.0.0.0:${PORT}/health

✅ Ready to accept WebSocket connections
  `)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})