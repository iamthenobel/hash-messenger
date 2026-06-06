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
  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Health check endpoint (for Render)
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'hash-chat-ws', status: 'running' }))
    return
  }

  // WebSocket upgrade check - let the WebSocket server handle it
  if (req.headers.upgrade === 'websocket') {
    return
  }

  // API endpoint for broadcasting via HTTP (fallback)
  if (req.method === 'POST' && req.url === '/api/chat-events') {
    let body = ''
    req.on('data', chunk => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        if (payload.chatId && payload.message) {
          broadcastToChat(payload.chatId, {
            type: payload.type || 'chat:update',
            chatId: payload.chatId,
            message: payload.message,
            timestamp: new Date().toISOString()
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

  // Default response for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: 'Not found' }))
})

// Create WebSocket server with explicit path
const wss = new WebSocketServer({ 
  server,
  path: '/ws'  // WebSocket connections will be on this path
})

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress
  console.log(`🔌 New WebSocket connection from: ${clientIp}`)

  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to Hash Chat WebSocket server',
    timestamp: new Date().toISOString()
  }))

  ws.on('message', (raw) => {
    try {
      const payload = JSON.parse(raw.toString())
      console.log('📨 Received message:', payload)

      // Handle subscription to a chat room
      if (payload?.type === 'subscribe' && payload.chatId) {
        // Remove from previous rooms if needed (optional)
        // For now, just add to new room
        
        if (!clients.has(payload.chatId)) {
          clients.set(payload.chatId, new Set())
        }
        clients.get(payload.chatId).add(ws)
        
        // Store chatId on ws for cleanup reference
        ws.currentChatId = payload.chatId
        
        console.log(`✅ Client subscribed to chat: ${payload.chatId}`)
        console.log(`📊 Room ${payload.chatId} now has ${clients.get(payload.chatId).size} client(s)`)

        // Send confirmation
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          chatId: payload.chatId,
          message: `Subscribed to chat ${payload.chatId}`
        }))
      }

      // Handle ping/pong for connection health
      if (payload?.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
      }

    } catch (error) {
      console.error('WebSocket message error:', error)
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to parse message' 
      }))
    }
  })

  ws.on('close', () => {
    // Clean up the client from all chat rooms
    if (ws.currentChatId) {
      const room = clients.get(ws.currentChatId)
      if (room) {
        room.delete(ws)
        console.log(`👋 Client disconnected from chat: ${ws.currentChatId}`)
        console.log(`📊 Room ${ws.currentChatId} now has ${room.size} client(s)`)
        
        if (room.size === 0) {
          clients.delete(ws.currentChatId)
        }
      }
    } else {
      console.log(`👋 Client disconnected (no active chat)`)
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

// Handle upgrade requests manually (critical for Render)
server.on('upgrade', (request, socket, head) => {
  console.log('🔧 Upgrade request received for:', request.url)
  
  // Only handle WebSocket upgrade requests
  if (request.headers.upgrade === 'websocket') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  }
})

// Start the server - bind to all network interfaces (important for Render)
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

// Graceful shutdown on termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})