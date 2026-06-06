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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

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

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true, service: 'hash-chat-ws' }))
})

const wss = new WebSocketServer({ server })

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    try {
      const payload = JSON.parse(raw.toString())
      if (payload?.type === 'subscribe' && payload.chatId) {
        if (!clients.has(payload.chatId)) {
          clients.set(payload.chatId, new Set())
        }
        clients.get(payload.chatId).add(socket)

        socket.on('close', () => {
          const room = clients.get(payload.chatId)
          if (room) {
            room.delete(socket)
            if (room.size === 0) {
              clients.delete(payload.chatId)
            }
          }
        })
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Hash chat WebSocket server listening on http://localhost:${PORT}`)
})
