import { useCallback, useMemo, useRef, useState } from 'react'
import { askLlmAgent, isLlmAgentEnabled } from '../utils/agentApi'
import {
  AGENT_STARTER_QUESTIONS,
  askMealPlannerAgent,
  type AgentContext,
  type AgentMessage,
} from '../utils/mealPlannerAgent'

interface MealPlannerAgentProps {
  context: AgentContext
}

export function MealPlannerAgent({ context }: MealPlannerAgentProps) {
  const llmEnabled = isLlmAgentEnabled()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: llmEnabled
        ? '你好，我是智能膳食助手（LLM 模式）。可以用自然语言提问：假设加食材、营养分析、搭配建议、减脂思路等。'
        : '你好，我是膳食规划助手（本地模式）。可测算加食材是否超标、热量差额等；配置后端 API 后可解锁更自由的对话。',
    },
  ])
  const listRef = useRef<HTMLDivElement>(null)

  const ctxKey = useMemo(
    () =>
      JSON.stringify({
        ingredients: context.ingredients,
        goals: context.goals,
        planCal: context.plan.totalIngredientCalories,
      }),
    [context],
  )

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      })
    })
  }, [])

  const sendQuestion = useCallback(
    async (text: string) => {
      const q = text.trim()
      if (!q || loading) return

      const userMsg: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: q,
      }

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setLoading(true)
      scrollToBottom()

      const history = [...messages, userMsg]
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))

      let answer: string
      try {
        if (llmEnabled) {
          answer = await askLlmAgent(history, context)
        } else {
          answer = askMealPlannerAgent(q, context)
        }
      } catch (err) {
        const fallback = askMealPlannerAgent(q, context)
        const errMsg = err instanceof Error ? err.message : '请求失败'
        answer = llmEnabled
          ? `（LLM 暂时不可用：${errMsg}，以下为本地估算）\n\n${fallback}`
          : fallback
      }

      const assistantMsg: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
      }

      setMessages((prev) => [...prev, assistantMsg])
      setLoading(false)
      scrollToBottom()
    },
    [context, llmEnabled, loading, messages, scrollToBottom],
  )

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-lg transition hover:bg-emerald-500 hover:shadow-xl"
          aria-label="打开膳食助手"
          title="膳食规划助手"
        >
          💬
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(520px,80vh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white">
            <div>
              <h3 className="text-sm font-semibold">膳食规划助手</h3>
              <p className="text-[10px] opacity-80">
                {llmEnabled ? 'LLM + 精确计算工具' : '本地规则模式'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-lg leading-none opacity-90 hover:bg-white/20"
              aria-label="关闭"
            >
              ×
            </button>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto p-4"
            key={ctxKey}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
                  思考中…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-1">
              {AGENT_STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => sendQuestion(q)}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
                >
                  {q.length > 18 ? `${q.slice(0, 18)}…` : q}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void sendQuestion(input)
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder={
                  llmEnabled
                    ? '随便问：搭配、替换、加购、减脂…'
                    : '例如：再加 500g 大米 7 天会超标吗？'
                }
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                发送
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
