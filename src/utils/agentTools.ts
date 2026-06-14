import { findNutritionEntry } from '../data/nutritionDictionary'
import type {
  BodyProfile,
  CalorieRecommendation,
  GoalSettings,
  MeasureUnit,
  PlanSummary,
  UserIngredient,
} from '../types'
import { recommendDailyCalories } from './calorieRecommendation'
import { inferCategoryFromName } from './ingredientCategory'
import { buildMealPlan } from './mealPlanner'
import { analyzeNutrition } from './nutritionAnalysis'
import { resolveAllIngredients } from './resolveIngredients'

export interface AgentContext {
  ingredients: UserIngredient[]
  goals: GoalSettings
  bodyProfile: BodyProfile
  plan: PlanSummary
  calorieRecommendation: CalorieRecommendation | null
}

export type AgentToolName =
  | 'get_calorie_status'
  | 'simulate_add_ingredient'
  | 'list_ingredients'
  | 'get_nutrition_analysis'
  | 'get_goal_and_recommendation'
  | 'get_calorie_recommendation'

export const AGENT_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_calorie_status',
      description:
        '获取当前食材总热量、目标热量、差额与是否超标。用户问「现在热量多少」「会不会超标」「差多少」时调用。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'simulate_add_ingredient',
      description:
        '模拟在现有食材基础上追加某种食材后的总热量，并判断是否会超过目标。用于「再加 500g 大米 7 天会超标吗」类假设问题。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '食材标准名称，如大米、鸡蛋、鸡胸肉' },
          quantity: { type: 'number', description: '追加数量' },
          unit: {
            type: 'string',
            enum: ['g', 'kg', '个', '片', 'ml', '碗', '勺', '根'],
            description: '单位，默认 g',
          },
          days: {
            type: 'integer',
            description: '按多少天规划；省略则用用户当前目标天数',
          },
        },
        required: ['name', 'quantity'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_ingredients',
      description: '列出用户当前已录入的全部食材及各自热量。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_nutrition_analysis',
      description: '分析当前食材的蛋白质、碳水、脂肪占比与营养建议。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_goal_and_recommendation',
      description: '返回用户当前目标设置（天数、每日热量、餐数）及与身体推荐值的对比。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_calorie_recommendation',
      description:
        '根据身体信息（身高体重年龄等）计算 BMR、TDEE 与推荐每日摄入热量。',
      parameters: { type: 'object', properties: {} },
    },
  },
]

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
    return `会超过设定热量。规划 ${days} 天食材总热量约 ${Math.round(total)} kcal，目标 ${Math.round(target)} kcal（日均 ${dailyTarget}），超出约 ${Math.round(gap)} kcal（日均约 ${dailyAvg} kcal）。`
  }
  if (gap < -50) {
    return `不会超标，仍低于目标。规划 ${days} 天约 ${Math.round(total)} kcal，目标 ${Math.round(target)} kcal，还差约 ${Math.round(Math.abs(gap))} kcal。`
  }
  return `与目标热量基本持平。${days} 天约 ${Math.round(total)} kcal，目标 ${Math.round(target)} kcal（日均 ${dailyTarget}）。`
}

export function toolGetCalorieStatus(ctx: AgentContext): string {
  const { plan, goals } = ctx
  const days = goals.days
  const target = plan.totalTargetCalories
  const total = plan.totalIngredientCalories
  const gap = plan.calorieGap

  return JSON.stringify({
    days,
    totalIngredientCalories: Math.round(total),
    totalTargetCalories: Math.round(target),
    dailyCalorieTarget: goals.dailyCalorieTarget,
    calorieGap: Math.round(gap),
    dailyAverageCalories: Math.round(plan.dailyAverageCalories),
    verdict: formatCalorieVerdict(total, target, days),
  })
}

export function toolSimulateAddIngredient(
  ctx: AgentContext,
  args: { name: string; quantity: number; unit?: MeasureUnit; days?: number },
): string {
  const entry = findNutritionEntry(args.name)
  if (!entry) {
    return JSON.stringify({
      error: `未在食材字典中找到「${args.name}」，请使用标准名称如大米、鸡蛋、鸡胸肉。`,
    })
  }

  const unit = args.unit ?? entry.defaultUnit ?? 'g'
  const days = args.days ?? ctx.goals.days
  const simGoals: GoalSettings = { ...ctx.goals, days }
  const simItems = applyIngredientDelta(
    ctx.ingredients,
    entry.name,
    args.quantity,
    unit,
  )
  const simPlan = buildMealPlan(simItems, simGoals)
  const targetTotal = simGoals.dailyCalorieTarget * days

  const addedResolved = resolveAllIngredients([
    {
      id: 'tmp',
      name: entry.name,
      quantity: args.quantity,
      unit,
      category: inferCategoryFromName(entry.name),
    },
  ])
  const addedKcal =
    addedResolved[0]?.totalCalories ??
    Math.round((args.quantity / 100) * entry.caloriesPer100g)

  return JSON.stringify({
    ingredient: entry.name,
    addedQuantity: args.quantity,
    addedUnit: unit,
    addedCalories: Math.round(addedKcal),
    days,
    currentTotalCalories: Math.round(ctx.plan.totalIngredientCalories),
    simulatedTotalCalories: Math.round(simPlan.totalIngredientCalories),
    targetTotalCalories: Math.round(targetTotal),
    verdict: formatCalorieVerdict(
      simPlan.totalIngredientCalories,
      targetTotal,
      days,
    ),
    note:
      days !== ctx.goals.days
        ? `按问题中的 ${days} 天计算；当前目标设置是 ${ctx.goals.days} 天。`
        : undefined,
  })
}

export function toolListIngredients(ctx: AgentContext): string {
  const resolved = resolveAllIngredients(ctx.ingredients)
  if (resolved.length === 0) {
    return JSON.stringify({
      count: 0,
      message: '当前还没有有效录入的食材。',
    })
  }

  return JSON.stringify({
    count: resolved.length,
    totalCalories: Math.round(ctx.plan.totalIngredientCalories),
    days: ctx.goals.days,
    items: resolved.map((r) => ({
      name: r.displayName,
      quantity: r.quantity,
      unit: r.unit,
      calories: Math.round(r.totalCalories),
    })),
  })
}

export function toolGetNutritionAnalysis(ctx: AgentContext): string {
  const analysis = analyzeNutrition(ctx.ingredients)
  return JSON.stringify({
    totals: analysis.totals,
    energyPercent: analysis.energyPercent,
    suggestions: analysis.suggestions,
  })
}

export function toolGetGoalAndRecommendation(ctx: AgentContext): string {
  const { goals, calorieRecommendation } = ctx
  return JSON.stringify({
    goals: {
      days: goals.days,
      mealsPerDay: goals.mealsPerDay,
      dailyCalorieTarget: goals.dailyCalorieTarget,
      mealProfile: goals.mealProfile,
    },
    calorieRecommendation: calorieRecommendation
      ? {
          recommendedCalories: calorieRecommendation.recommendedCalories,
          maintenanceCalories: calorieRecommendation.maintenanceCalories,
          deltaFromTarget:
            goals.dailyCalorieTarget -
            calorieRecommendation.recommendedCalories,
        }
      : null,
  })
}

export function toolGetCalorieRecommendation(ctx: AgentContext): string {
  const rec = recommendDailyCalories(ctx.bodyProfile)
  if (!rec) {
    return JSON.stringify({
      error: '身体信息不完整，请先在减重计划页填写身高、体重、年龄等。',
    })
  }
  return JSON.stringify(rec)
}

export function runAgentTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentContext,
): string {
  switch (name as AgentToolName) {
    case 'get_calorie_status':
      return toolGetCalorieStatus(ctx)
    case 'simulate_add_ingredient':
      return toolSimulateAddIngredient(ctx, {
        name: String(args.name ?? ''),
        quantity: Number(args.quantity),
        unit: args.unit as MeasureUnit | undefined,
        days: args.days != null ? Number(args.days) : undefined,
      })
    case 'list_ingredients':
      return toolListIngredients(ctx)
    case 'get_nutrition_analysis':
      return toolGetNutritionAnalysis(ctx)
    case 'get_goal_and_recommendation':
      return toolGetGoalAndRecommendation(ctx)
    case 'get_calorie_recommendation':
      return toolGetCalorieRecommendation(ctx)
    default:
      return JSON.stringify({ error: `未知工具: ${name}` })
  }
}
