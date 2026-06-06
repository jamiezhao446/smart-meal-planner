import { findNutritionEntry } from '../data/nutritionDictionary'
import type { ResolvedIngredient, UserIngredient } from '../types'
import { resolveAllIngredients } from './resolveIngredients'

/** 膳食纤维估算 g/100g（字典无纤维字段时用类目估算） */
const FIBER_PER_100G: Record<string, number> = {
  broccoli: 2.6,
  spinach: 2.2,
  tomato: 1.2,
  apple: 2.4,
  banana: 2.6,
  rice: 0.6,
  bread: 2.3,
  potato: 2.2,
  beef: 0,
  'chicken-breast': 0,
  egg: 0,
  shrimp: 0,
  tofu: 1.8,
  salmon: 0,
  milk: 0,
}

const MACRO_RANGE = {
  carb: { min: 55, max: 65 },
  protein: { min: 10, max: 20 },
  fat: { min: 20, max: 30 },
}

export interface MacroTotals {
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  calories: number
}

export interface MacroPercent {
  protein: number
  carbs: number
  fat: number
}

export interface NutritionAnalysisResult {
  totals: MacroTotals
  energyPercent: MacroPercent
  suggestions: string[]
}

function gramsAndMacros(ing: ResolvedIngredient): MacroTotals {
  const entry = findNutritionEntry(ing.name)
  if (!entry) {
    return { proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, calories: 0 }
  }
  const conv = entry.unitConversions.find((c) => c.unit === ing.unit)
  if (!conv) {
    return { proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, calories: 0 }
  }
  const grams = ing.quantity * conv.gramsPerUnit
  const factor = grams / 100
  return {
    proteinG: entry.proteinPer100g * factor,
    carbsG: entry.carbsPer100g * factor,
    fatG: entry.fatPer100g * factor,
    fiberG: (FIBER_PER_100G[entry.id] ?? 0.5) * factor,
    calories: entry.caloriesPer100g * factor,
  }
}

export function analyzeNutrition(items: UserIngredient[]): NutritionAnalysisResult {
  const resolved = resolveAllIngredients(items)
  const totals: MacroTotals = {
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    calories: 0,
  }

  for (const ing of resolved) {
    const m = gramsAndMacros(ing)
    totals.proteinG += m.proteinG
    totals.carbsG += m.carbsG
    totals.fatG += m.fatG
    totals.fiberG += m.fiberG
    totals.calories += m.calories
  }

  totals.proteinG = Math.round(totals.proteinG)
  totals.carbsG = Math.round(totals.carbsG)
  totals.fatG = Math.round(totals.fatG)
  totals.fiberG = Math.round(totals.fiberG * 10) / 10
  totals.calories = Math.round(totals.calories)

  const pCal = totals.proteinG * 4
  const cCal = totals.carbsG * 4
  const fCal = totals.fatG * 9
  const macroCal = pCal + cCal + fCal || 1

  const energyPercent: MacroPercent = {
    protein: Math.round((pCal / macroCal) * 1000) / 10,
    carbs: Math.round((cCal / macroCal) * 1000) / 10,
    fat: Math.round((fCal / macroCal) * 1000) / 10,
  }

  const suggestions = buildSuggestions(totals, energyPercent, resolved)

  return { totals, energyPercent, suggestions }
}

function buildSuggestions(
  totals: MacroTotals,
  pct: MacroPercent,
  resolved: ResolvedIngredient[],
): string[] {
  const lines: string[] = []

  if (pct.protein < MACRO_RANGE.protein.min) {
    const need = Math.round(
      ((MACRO_RANGE.protein.min / 100) * totals.calories) / 4 - totals.proteinG,
    )
    const beefG = Math.max(100, Math.min(300, need * 4))
    const chickenG = Math.max(150, Math.min(400, need * 3))
    lines.push(
      `①蛋白质较低（供能${pct.protein}%），建议增加牛肉约${beefG}g或鸡胸肉约${chickenG}g；`,
    )
  } else if (pct.protein > MACRO_RANGE.protein.max) {
    lines.push(
      `①蛋白质偏高（供能${pct.protein}%），可适当减少鸡蛋或肉类约50～100g；`,
    )
  }

  if (pct.fat > MACRO_RANGE.fat.max) {
    const trim = Math.round(totals.fatG * 0.15)
    lines.push(
      `②脂肪含量偏高（供能${pct.fat}%），建议减少高脂食材约${trim}g油脂当量（如少油烹调、减少花生/坚果约50g）；`,
    )
  } else if (pct.fat < MACRO_RANGE.fat.min) {
    lines.push(
      `②脂肪偏低（供能${pct.fat}%），可适量增加鸡蛋、牛奶或坚果约20～30g；`,
    )
  }

  if (pct.carbs > MACRO_RANGE.carb.max) {
    const rice = resolved.find((r) => r.nutritionId === 'rice')
    const cut = rice
      ? Math.min(150, Math.round(rice.quantity * 0.2))
      : 100
    lines.push(
      `③碳水超标（供能${pct.carbs}%），建议削减大米约${cut}g或面包1～2片；`,
    )
  } else if (pct.carbs < MACRO_RANGE.carb.min) {
    lines.push(
      `③碳水偏低（供能${pct.carbs}%），建议增加大米约80～120g或全麦面包1～2片；`,
    )
  }

  if (totals.fiberG < 25) {
    lines.push(
      `④膳食纤维不足（约${totals.fiberG}g），建议增加西兰花100～150g或菠菜100g；`,
    )
  }

  if (lines.length === 0) {
    lines.push('①三大营养素供能比例处于国标推荐区间，可保持当前食材搭配。')
  }

  return lines
}
