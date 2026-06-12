import { createServer } from 'node:http'
import { handleAgentChat } from './agentHandler'
import type { AgentContext } from '../src/utils/agentTools'

const PORT = Number(process.env.AGENT_PORT ?? 3001)

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST' || req.url !== '/api/agent') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  try {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const body = JSON.parse(Buffer.concat(chunks).toString()) as {
      messages: { role: 'user' | 'assistant'; content: string }[]
      context: AgentContext
    }

    const reply = await handleAgentChat(body.messages, body.context)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ reply }))
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误'
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: message }))
  }
})

server.listen(PORT, () => {
  console.log(`Agent API: http://127.0.0.1:${PORT}/api/agent`)
})
