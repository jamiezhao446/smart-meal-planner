import type { AgentContext } from './agentTools'

export interface AgentChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const API_URL = import.meta.env.VITE_AGENT_API_URL as string | undefined

export function isLlmAgentEnabled(): boolean {
  return Boolean(API_URL?.trim())
}

export async function askLlmAgent(
  messages: AgentChatMessage[],
  context: AgentContext,
): Promise<string> {
  const url = API_URL?.trim()
  if (!url) {
    throw new Error('未配置 VITE_AGENT_API_URL')
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  })

  const data = (await res.json()) as { reply?: string; error?: string }

  if (!res.ok) {
    throw new Error(data.error ?? `请求失败 (${res.status})`)
  }

  if (!data.reply?.trim()) {
    throw new Error('助手未返回内容')
  }

  return data.reply
}
