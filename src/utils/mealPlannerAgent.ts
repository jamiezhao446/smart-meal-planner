import {
  findNutritionEntry,
  NUTRITION_DICTIONARY,
} from '../data/nutritionDictionary'
import type {
  BodyProfile,
  CalorieRecommendation,
  GoalSettings,
  MeasureUnit,
  PlanSummary,
  UserIngredient,
} from '../types'
import { inferCategoryFromName } from './ingredientCategory'
import { analyzeNutrition } from './nutritionAnalysis'
import { recommendDailyCalories } from './calorieRecommendation'
import { buildMealPlan } from './mealPlanner'
import { resolveAllIngredients } from './resolveIngredients'

export interface AgentContext {
  ingredients: UserIngredient[]
  goals: GoalSettings
  bodyProfile: BodyProfile
  plan: PlanSummary
  calorieRecommendation: CalorieRecommendation | null
}

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

function resolveNameFromText(fragment: string): string | null {
  const entry = findNutritionEntry(fragment)
  if (entry) return entry.name
  for (const e of findNutritionEntry(fragment) ? [] : []) {
    void e
  }
  return fragment.length >= 1 ? fragment : null
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
    const parsed = buildParsedAdd(
      parseFloat(withDays[1]),
      withDays[2] as MeasureUnit | undefined,
      withDays[3],
      parseInt(withDays[4], 10),
    )
    if (parsed) return parsed
  }

  const simple = compact.match(
    new RegExp(`(?:再?增加|加|追加|添)(\\d+(?:\\.\\d+)?)(${unitPattern})?(.+)`),
  )
  if (simple) {
    const parsed = buildParsedAdd(
      parseFloat(simple[1]),
      simple[2] as MeasureUnit | undefined,
      simple[3],
    )
    if (parsed) return parsed
  }

  const qtyFirst = compact.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)(${unitPattern})(.+)`),
  )
  if (qtyFirst) {
    const parsed = buildParsedAdd(
      parseFloat(qtyFirst[1]),
      qtyFirst[2] as MeasureUnit,
      qtyFirst[3],
    )
    if (parsed) return parsed
  }

  return null
}

function buildParsedAdd(
  quantity: number,
  unit: MeasureUnit | undefined,
  nameRaw: string,
  days?: number,
): ParsedAdd | null {
  if (!Number.isFinite(quantity)) return null
  const cleaned = nameRaw.replace(
    /[，,。?？!！会超过吗作为食材的如果再]/g,
    '',
  )
  const name =
    findIngredientNameInText(cleaned) ??
    findIngredientNameInText(nameRaw) ??
    resolveNameFromText(cleaned)
  if (!name) return null

  const entry = findNutritionEntry(name)
  let resolvedUnit: MeasureUnit = unit ?? entry?.defaultUnit ?? 'g'

  return { quantity, unit: resolvedUnit, name, days }
}

function applyIngredientDelta(
  items: UserIngredient[],
  name: string,
  addQty: number,
  unit: MeasureUnit,
): UserIngredient[] {
  const entry = findNutritionEntry(name)
  if (!entry) return items

  const category = inferCategoryFromName(name)
  const existing = items.find((i) => {
    const e = findNutritionEntry(i.name)
    return e?.id === entry.id
  })

  if (existing) {
    return items.map((i) =>
      i.id === existing.id
        ? {
            ...i,
            quantity: i.quantity + addQty,
            unit: existing.unit === unit ? existing.unit : unit,
          }
        : i,
    )
  }

  return [
    ...items,
    {
      id: `sim-${entry.id}`,
      name: entry.name,
      quantity: addQty,
      unit,
      category,
    },
  ]
}

function formatCalorieVerdict(
  total: number,
  target: number,
  days: number,
): string {
  const gap = total - target
  const dailyAvg = Math.round((total / days) * 10) / 10
  const dailyTarget = Math.round((target / days) * 10) / 10

  if (gap > 50) {
    return `会超过设定热量。\n\n- 规划 ${days} 天食材总热量约 ${Math.round(total)} kcal\n- 你的目标总热量 ${Math.round(target)} kcal（日均 ${dailyTarget} kcal）\n- 超出约 ${Math.round(gap)} kcal（日均约 ${dailyAvg} kcal）`
  }
  if (gap < -50) {
    return `不会超标，且仍低于目标。\n\n- 规划 ${days} 天食材总热量约 ${Math.round(total)} kcal\n- 目标总热量 ${Math.round(target)} kcal\n- 还差约 ${Math.round(Math.abs(gap))} kcal 才填满目标`
  }
  return `与目标热量基本持平。\n\n- 规划 ${days} 天总热量约 ${Math.round(total)} kcal\n- 目标 ${Math.round(target)} kcal（日均 ${dailyTarget} kcal）`
}

function answerAddWhatIf(ctx: AgentContext, parsed: ParsedAdd): string {
  const entry = findNutritionEntry(parsed.name)
  if (!entry) {
    return `未在食材字典中找到「${parsed.name}」。请使用字典内名称（如大米、鸡蛋、鸡胸肉），或在食材录入中手动添加自定义食材后再试。`
  }

  const days = parsed.days ?? ctx.goals.days
  const simGoals: GoalSettings = { ...ctx.goals, days }
  const simItems = applyIngredientDelta(
    ctx.ingredients,
    parsed.name,
    parsed.quantity,
    parsed.unit,
  )
  const simPlan = buildMealPlan(simItems, simGoals)
  const targetTotal = simGoals.dailyCalorieTarget * days

  const addedResolved = resolveAllIngredients([
    {
      id: 'tmp',
      name: entry.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      category: inferCategoryFromName(entry.name),
    },
  ])
  const addedKcal =
    addedResolved[0]?.totalCalories ??
    Math.round((parsed.quantity / 100) * entry.caloriesPer100g)

  const currentTotal = ctx.plan.totalIngredientCalories
  const simTotal = simPlan.totalIngredientCalories

  let text = `模拟：在现有食材基础上再增加 ${parsed.quantity}${parsed.unit} ${entry.name}，按 ${days} 天规划。\n\n`
  text += `- 新增部分约 ${Math.round(addedKcal)} kcal\n`
  text += `- 当前总热量 ${Math.round(currentTotal)} kcal → 调整后约 ${Math.round(simTotal)} kcal\n\n`
  text += formatCalorieVerdict(simTotal, targetTotal, days)

  if (days !== ctx.goals.days) {
    text += `\n\n（注：你当前目标设置是 ${ctx.goals.days} 天，本回答按问题中的 ${days} 天计算。）`
  }

  return text
}

function answerCalorieStatus(ctx: AgentContext): string {
  const { plan, goals } = ctx
  const days = goals.days
  const target = plan.totalTargetCalories
  const total = plan.totalIngredientCalories
  const gap = plan.calorieGap

  let text = `当前热量概况（${days} 天）：\n\n`
  text += `- 食材总热量：${Math.round(total)} kcal\n`
  text += `- 目标总热量：${Math.round(target)} kcal（日均 ${goals.dailyCalorieTarget} kcal）\n`
  text += `- 差额：${gap > 0 ? '+' : ''}${Math.round(gap)} kcal\n`
  text += `- 日均食材热量：${Math.round(plan.dailyAverageCalories)} kcal\n\n`
  text += formatCalorieVerdict(total, target, days)
  return text
}

function answerTarget(ctx: AgentContext): string {
  const { goals, calorieRecommendation } = ctx
  let text = `目标设置：\n\n`
  text += `- 规划天数：${goals.days} 天\n`
  text += `- 每日餐数：${goals.mealsPerDay} 餐\n`
  text += `- 每日目标热量：${goals.dailyCalorieTarget} kcal\n`
  text += `- 营养偏好：${goals.mealProfile}\n`

  if (calorieRecommendation) {
    text += `\n身体信息推荐（参考）：\n`
    text += `- 推荐一日热量：${calorieRecommendation.recommendedCalories} kcal\n`
    text += `- 维持热量 TDEE：${calorieRecommendation.maintenanceCalories} kcal\n`
    if (goals.dailyCalorieTarget !== calorieRecommendation.recommendedCalories) {
      text += `- 与推荐值相差 ${goals.dailyCalorieTarget - calorieRecommendation.recommendedCalories} kcal/天`
    }
  }
  return text
}

function answerIngredientList(ctx: AgentContext): string {
  const resolved = resolveAllIngredients(ctx.ingredients)
  if (resolved.length === 0) {
    return '当前还没有有效录入的食材。请先到「食材录入」Tab 添加食材。'
  }

  let text = `当前已录入食材（${resolved.length} 种）：\n\n`
  for (const r of resolved) {
    text += `- ${r.displayName} ${r.quantity}${r.unit}（约 ${Math.round(r.totalCalories)} kcal）\n`
  }
  text += `\n合计约 ${Math.round(ctx.plan.totalIngredientCalories)} kcal / ${ctx.goals.days} 天。`
  return text
}

function answerNutrition(ctx: AgentContext): string {
  const analysis = analyzeNutrition(ctx.ingredients)
  const { totals, energyPercent } = analysis
  let text = `营养结构概览（基于当前食材）：\n\n`
  text += `- 总热量：${totals.calories} kcal\n`
  text += `- 蛋白质：${totals.proteinG} g（供能占比 ${energyPercent.protein}%）\n`
  text += `- 碳水：${totals.carbsG} g（${energyPercent.carbs}%）\n`
  text += `- 脂肪：${totals.fatG} g（${energyPercent.fat}%）\n`
  if (analysis.suggestions.length > 0) {
    text += `\n建议：\n${analysis.suggestions.map((s) => `- ${s}`).join('\n')}`
  }
  return text
}

function answerRecommendation(ctx: AgentContext): string {
  const rec = recommendDailyCalories(ctx.bodyProfile)
  if (!rec) {
    return '请先在「身体信息与减重计划」中填写完整的身体数据，我才能给出推荐热量。'
  }
  return `根据你的身体信息与计划周期：\n\n- 推荐一日热量：${rec.recommendedCalories} kcal\n- BMR：${rec.bmr} kcal\n- 维持热量：${rec.maintenanceCalories} kcal\n- 目标：${rec.goalLabel}\n- 计划每日体重变化：${rec.plannedDailyWeightChangeKg > 0 ? '减' : rec.plannedDailyWeightChangeKg < 0 ? '增' : '维持'} ${Math.abs(rec.plannedDailyWeightChangeKg)} kg/天\n\n可在减重计划页点击「采用推荐方案」一键应用。`
}

function answerHelp(): string {
  return `我是膳食规划助手，会根据你当前页面的身体信息、目标设置和食材清单做计算。\n\n你可以这样问：\n\n1. 假设加食材：「再加 500g 大米规划 7 天会超过热量吗？」\n2. 当前状态：「现在总热量多少？」「会超标吗？」\n3. 目标与推荐：「我的每日目标热量是多少？」\n4. 食材清单：「我现在有哪些食材？」\n5. 营养分析：「当前营养结构怎么样？」\n\n提示：食材名称尽量用字典里的标准名（大米、鸡蛋、鸡胸肉等）。`
}

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
  if (
    addParsed &&
    /加|增加|追加|添|再/.test(q)
  ) {
    return answerAddWhatIf(ctx, addParsed)
  }
  if (addParsed && /超过|超标|热量|会/.test(q)) {
    return answerAddWhatIf(ctx, addParsed)
  }

  if (/推荐.*热量|热量.*推荐|bmr|基础代谢|tdee|维持热量/.test(q)) {
    return answerRecommendation(ctx)
  }

  if (/有哪些食材|食材.*哪些|当前食材|吃了什么|库存/.test(q)) {
    return answerIngredientList(ctx)
  }

  if (/营养|蛋白|碳水|脂肪|宏量|结构/.test(q) && !/超过/.test(q)) {
    return answerNutrition(ctx)
  }

  if (/目标.*热量|每日目标|设定.*热量|规划.*天/.test(q) && !/加|增加/.test(q)) {
    return answerTarget(ctx)
  }

  if (
    /总热量|热量多少|超标|超过|够不够|差额|日均/.test(q) ||
    /现在.*热量|当前.*热量/.test(q)
  ) {
    return answerCalorieStatus(ctx)
  }

  const looseAdd = parseAddWhatIf(question)
  if (looseAdd) {
    return answerAddWhatIf(ctx, looseAdd)
  }

  return `我还不太确定你的意思。你可以试试：\n\n- 「再加 500g 大米作为 7 天食材会超过热量吗？」\n- 「现在总热量多少？」\n- 「我现在有哪些食材？」\n\n输入「帮助」查看更多信息。`
}

export const AGENT_STARTER_QUESTIONS = [
  '再加 500g 大米规划 7 天会超过热量吗？',
  '现在食材总热量和目标差多少？',
  '我当前录入的食材有哪些？',
]
