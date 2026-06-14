import type { AgentContext } from './agentTools'
import { sanitizeAgentReply } from './agentReplyFormat'

export interface AgentChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function isValidAgentUrl(url: string): boolean {
  if (url.startsWith('/')) return url.startsWith('/api/')
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function resolveApiUrl(): string | undefined {
  const fromEnv = import.meta.env.VITE_AGENT_API_URL as string | undefined
  if (fromEnv?.trim()) {
    const trimmed = fromEnv.trim()
    if (isValidAgentUrl(trimmed)) return trimmed
  }

  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    return `${window.location.origin}/api/agent`
  }

  return undefined
}

export function isLlmAgentEnabled(): boolean {
  return Boolean(resolveApiUrl())
}

export async function askLlmAgent(
  messages: AgentChatMessage[],
  context: AgentContext,
): Promise<string> {
  const url = resolveApiUrl()
  if (!url) {
    throw new Error('未配置 VITE_AGENT_API_URL')
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  })

  const raw = await res.text()
  let data: { reply?: string; error?: string }
  try {
    data = JSON.parse(raw) as { reply?: string; error?: string }
  } catch {
    throw new Error(
      res.ok
        ? 'API 返回格式异常'
        : `API 错误 (${res.status}): ${raw.slice(0, 200)}`,
    )
  }

  if (!res.ok) {
    throw new Error(data.error ?? `请求失败 (${res.status})`)
  }

  if (!data.reply?.trim()) {
    throw new Error('助手未返回内容')
  }

  return sanitizeAgentReply(data.reply)
}
