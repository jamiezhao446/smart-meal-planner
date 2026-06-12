import {
  AGENT_TOOL_DEFINITIONS,
  type AgentContext,
  runAgentTool,
} from '../src/utils/agentTools'

export interface AgentChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

interface OpenAIChatResponse {
  choices: {
    message: OpenAIMessage
    finish_reason: string
  }[]
}

const SYSTEM_PROMPT = `你是「智能膳食规划助手」，帮助用户理解当前膳食计划、热量与营养。

规则：
1. 涉及热量、是否超标、加食材模拟、营养数据时，必须调用提供的工具获取准确结果，禁止自行估算数字。
2. 可以多步调用工具（例如先列食材再模拟加购）。
3. 用简洁清晰的中文回答；数字保留整数 kcal 即可。
4. 若用户问法模糊，可先简要确认假设，再调用工具。
5. 可回答开放问题：搭配建议、减脂思路、食材替换思路，但涉及具体热量时必须基于工具数据。
6. 不要编造用户未录入的食材或身体数据。`

function buildContextSummary(ctx: AgentContext): string {
  const ingCount = ctx.ingredients.length
  return [
    '【当前页面快照】',
    `- 规划 ${ctx.goals.days} 天，每日目标 ${ctx.goals.dailyCalorieTarget} kcal，${ctx.goals.mealsPerDay} 餐/天`,
    `- 已录入 ${ingCount} 种食材，总热量约 ${Math.round(ctx.plan.totalIngredientCalories)} kcal`,
    `- 与目标差额约 ${Math.round(ctx.plan.calorieGap)} kcal（正=超出）`,
    ctx.calorieRecommendation
      ? `- 身体推荐每日热量 ${ctx.calorieRecommendation.recommendedCalories} kcal`
      : '- 身体信息未完整填写',
  ].join('\n')
}

async function callLlm(
  messages: OpenAIMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<OpenAIChatResponse> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools: AGENT_TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: 0.4,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LLM API 错误 ${res.status}: ${errText.slice(0, 300)}`)
  }

  return res.json() as Promise<OpenAIChatResponse>
}

export async function handleAgentChat(
  history: AgentChatMessage[],
  ctx: AgentContext,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('服务端未配置 OPENAI_API_KEY')
  }

  const baseUrl =
    process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: buildContextSummary(ctx) },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  for (let step = 0; step < 6; step++) {
    const data = await callLlm(messages, apiKey, baseUrl, model)
    const choice = data.choices[0]
    if (!choice) throw new Error('LLM 返回为空')

    const assistantMsg = choice.message
    messages.push(assistantMsg)

    if (
      choice.finish_reason === 'tool_calls' &&
      assistantMsg.tool_calls?.length
    ) {
      for (const tc of assistantMsg.tool_calls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(tc.function.arguments || '{}')
        } catch {
          args = {}
        }
        const result = runAgentTool(tc.function.name, args, ctx)
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        })
      }
      continue
    }

    const text = assistantMsg.content?.trim()
    if (text) return text
    throw new Error('LLM 未返回有效文本')
  }

  throw new Error('工具调用次数过多，请简化问题后重试')
}
