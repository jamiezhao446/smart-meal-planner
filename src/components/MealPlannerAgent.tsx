import { useCallback, useMemo, useRef, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好，我是膳食规划助手。可以帮你测算「加食材会不会超标」、当前热量差额、食材清单等问题。试试下方快捷提问，或输入「帮助」。',
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

  const sendQuestion = useCallback(
    (text: string) => {
      const q = text.trim()
      if (!q) return

      const userMsg: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: q,
      }
      const answer = askMealPlannerAgent(q, context)
      const assistantMsg: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        })
      })
    },
    [context],
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
              <p className="text-[10px] opacity-80">基于当前页面数据实时计算</p>
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
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-1">
              {AGENT_STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendQuestion(q)}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {q.length > 18 ? `${q.slice(0, 18)}…` : q}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                sendQuestion(input)
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：再加 500g 大米 7 天会超标吗？"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="submit"
                disabled={!input.trim()}
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
