import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleAgentChat } from '../server/agentHandler'
import type { AgentContext } from '../src/utils/agentTools'

const DEFAULT_ORIGINS = [
  'https://jamiezhao446.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function getAllowedOrigins(): string[] {
  const extra = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? []
  return [...DEFAULT_ORIGINS, ...extra]
}

function setCors(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin
  const allowed = getAllowedOrigins()
  if (origin && allowed.some((o) => origin === o || origin.startsWith(o))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as {
      messages?: { role: 'user' | 'assistant'; content: string }[]
      context?: AgentContext
    }

    if (!body?.messages?.length || !body.context) {
      return res.status(400).json({ error: '缺少 messages 或 context' })
    }

    const reply = await handleAgentChat(body.messages, body.context)
    return res.status(200).json({ reply })
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误'
    console.error('[agent]', message)
    return res.status(500).json({ error: message })
  }
}
