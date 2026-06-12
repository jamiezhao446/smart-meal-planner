import {
  findNutritionEntry,
  NUTRITION_DICTIONARY,
} from '../data/nutritionDictionary'
import type { MeasureUnit } from '../types'
import {
  type AgentContext,
  runAgentTool,
  toolGetCalorieStatus,
  toolListIngredients,
  toolSimulateAddIngredient,
} from './agentTools'

export type { AgentContext } from './agentTools'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ParsedAdd {
  quantity: number
  unit: MeasureUnit
  name: string
  days?: number
}

const UNITS: MeasureUnit[] = ['g', 'kg', '个', '片', 'ml', '碗', '勺', '根']

function normalizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, '')
}

function findIngredientNameInText(text: string): string | null {
  const normalized = text.replace(/\s/g, '')
  let best: { name: string; len: number } | null = null
  for (const entry of NUTRITION_DICTIONARY) {
    const candidates = [entry.name, ...entry.aliases]
    for (const c of candidates) {
      if (normalized.includes(c) && (!best || c.length > best.len)) {
        best = { name: entry.name, len: c.length }
      }
    }
  }
  return best?.name ?? null
}

function parseAddWhatIf(question: string): ParsedAdd | null {
  const compact = question.trim().replace(/\s/g, '')
  const unitPattern = UNITS.join('|')

  const withDays = compact.match(
    new RegExp(
      `(?:再?增加|加|追加|添)?(\\d+(?:\\.\\d+)?)(${unitPattern})?(.+?)(?:作为|用|规划|分)?(\\d+)天`,
    ),
  )
  if (withDays) {
    const name = findIngredientNameInText(withDays[3])
    if (name) {
      const entry = findNutritionEntry(name)
      return {
        quantity: parseFloat(withDays[1]),
        unit: (withDays[2] as MeasureUnit | undefined) ?? entry?.defaultUnit ?? 'g',
        name,
        days: parseInt(withDays[4], 10),
      }
    }
  }

  const simple = compact.match(
    new RegExp(`(?:再?增加|加|追加|添)(\\d+(?:\\.\\d+)?)(${unitPattern})?(.+)`),
  )
  if (simple) {
    const name = findIngredientNameInText(simple[3])
    if (name) {
      const entry = findNutritionEntry(name)
      return {
        quantity: parseFloat(simple[1]),
        unit: (simple[2] as MeasureUnit | undefined) ?? entry?.defaultUnit ?? 'g',
        name,
      }
    }
  }

  return null
}

function formatToolJson(toolResult: string): string {
  try {
    const data = JSON.parse(toolResult) as Record<string, unknown>
    if (data.error) return String(data.error)
    if (data.verdict) return String(data.verdict)
    return JSON.stringify(data, null, 2)
  } catch {
    return toolResult
  }
}

function answerAddWhatIf(ctx: AgentContext, parsed: ParsedAdd): string {
  const result = toolSimulateAddIngredient(ctx, parsed)
  const data = JSON.parse(result) as {
    error?: string
    ingredient?: string
    addedQuantity?: number
    addedUnit?: string
    addedCalories?: number
    days?: number
    currentTotalCalories?: number
    simulatedTotalCalories?: number
    verdict?: string
    note?: string
  }
  if (data.error) return data.error

  let text = `模拟：再增加 ${data.addedQuantity}${data.addedUnit} ${data.ingredient}，按 ${data.days} 天规划。\n\n`
  text += `- 新增约 ${data.addedCalories} kcal\n`
  text += `- ${data.currentTotalCalories} kcal → ${data.simulatedTotalCalories} kcal\n\n`
  text += data.verdict ?? ''
  if (data.note) text += `\n\n（${data.note}）`
  return text
}

function answerCalorieStatus(ctx: AgentContext): string {
  const data = JSON.parse(toolGetCalorieStatus(ctx)) as {
    days: number
    totalIngredientCalories: number
    totalTargetCalories: number
    dailyCalorieTarget: number
    calorieGap: number
    dailyAverageCalories: number
    verdict: string
  }
  let text = `当前热量概况（${data.days} 天）：\n\n`
  text += `- 食材总热量：${data.totalIngredientCalories} kcal\n`
  text += `- 目标总热量：${data.totalTargetCalories} kcal（日均 ${data.dailyCalorieTarget} kcal）\n`
  text += `- 差额：${data.calorieGap > 0 ? '+' : ''}${data.calorieGap} kcal\n`
  text += `- 日均食材热量：${data.dailyAverageCalories} kcal\n\n`
  text += data.verdict
  return text
}

function answerIngredientList(ctx: AgentContext): string {
  const data = JSON.parse(toolListIngredients(ctx)) as {
    count: number
    message?: string
    items?: { name: string; quantity: number; unit: string; calories: number }[]
    totalCalories?: number
    days?: number
  }
  if (data.count === 0) return data.message ?? '暂无食材。'

  let text = `当前已录入食材（${data.count} 种）：\n\n`
  for (const item of data.items ?? []) {
    text += `- ${item.name} ${item.quantity}${item.unit}（约 ${item.calories} kcal）\n`
  }
  text += `\n合计约 ${data.totalCalories} kcal / ${data.days} 天。`
  return text
}

function answerHelp(): string {
  return `我是膳食规划助手。可问热量、加食材模拟、营养结构、搭配建议等。\n\n配置 LLM 后端后支持更自由的问法，例如：\n- 「如果我把鸡蛋换成鸡胸肉，热量会怎么变？」\n- 「现在蛋白够不够？还差多少？」\n\n离线/未配置 API 时仍可用规则模式回答常见问题。`
}

/** 本地规则引擎兜底（无 LLM 或 API 失败时使用） */
export function askMealPlannerAgent(
  question: string,
  ctx: AgentContext,
): string {
  const q = normalizeQuestion(question)
  if (!q) return '请输入你的问题。'

  if (/帮助|怎么用|能问什么|你可以/.test(q)) {
    return answerHelp()
  }

  const addParsed = parseAddWhatIf(question)
  if (addParsed && (/加|增加|追加|添|再/.test(q) || /超过|超标|热量|会/.test(q))) {
    return answerAddWhatIf(ctx, addParsed)
  }

  if (/推荐.*热量|热量.*推荐|bmr|基础代谢|tdee|维持热量/.test(q)) {
    return formatToolJson(runAgentTool('get_calorie_recommendation', {}, ctx))
  }

  if (/有哪些食材|食材.*哪些|当前食材|吃了什么|库存/.test(q)) {
    return answerIngredientList(ctx)
  }

  if (/营养|蛋白|碳水|脂肪|宏量|结构/.test(q) && !/超过/.test(q)) {
    return formatToolJson(runAgentTool('get_nutrition_analysis', {}, ctx))
  }

  if (/目标.*热量|每日目标|设定.*热量|规划.*天/.test(q) && !/加|增加/.test(q)) {
    return formatToolJson(runAgentTool('get_goal_and_recommendation', {}, ctx))
  }

  if (
    /总热量|热量多少|超标|超过|够不够|差额|日均/.test(q) ||
    /现在.*热量|当前.*热量/.test(q)
  ) {
    return answerCalorieStatus(ctx)
  }

  if (addParsed) return answerAddWhatIf(ctx, addParsed)

  return `我还不太确定你的意思。试试：\n\n- 「再加 500g 大米 7 天会超标吗？」\n- 「现在蛋白占比多少？」\n\n输入「帮助」查看更多。`
}

export const AGENT_STARTER_QUESTIONS = [
  '再加 500g 大米规划 7 天会超过热量吗？',
  '现在蛋白够不够？怎么补？',
  '帮我看看当前食材搭配有什么建议？',
]
