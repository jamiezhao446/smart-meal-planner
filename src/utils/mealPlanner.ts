import { getIngredientCategory } from '../data/nutritionCategories'
import { findNutritionEntry } from '../data/nutritionDictionary'
import type {
  GoalSettings,
  MealSlot,
  MealSlotAllocation,
  PlanSummary,
  UserIngredient,
} from '../types'
import { assignCookingSuggestions } from './cookingSuggestions'
import {
  buildBalancedMealMaps,
  caloriesForQuantity,
  computeInventoryStock,
  getMealBalanceNote,
} from './mealDistribution'
import { resolveAllIngredients } from './resolveIngredients'

export { resolveAllIngredients, resolveIngredient } from './resolveIngredients'

export function buildMealPlan(
  items: UserIngredient[],
  goals: GoalSettings,
): PlanSummary {
  const resolved = resolveAllIngredients(items)
  const days = Math.max(1, Math.floor(goals.days))
  const mealsPerDay = Math.max(1, Math.floor(goals.mealsPerDay))
  const profile = goals.mealProfile

  const totalIngredientCalories = resolved.reduce((sum, r) => sum + r.totalCalories, 0)
  const totalTargetCalories = goals.dailyCalorieTarget * days
  const dailyAverageCalories = totalIngredientCalories / days
  const calorieGap = totalIngredientCalories - totalTargetCalories

  const eligible = resolved.filter((ing) => {
    if (goals.mealProfile === 'no-carb' && getIngredientCategory(ing.nutritionId) === 'carb') {
      return false
    }
    return true
  })
  const inventoryStock = computeInventoryStock(eligible)

  const mealMap = buildBalancedMealMaps(
    resolved,
    days,
    mealsPerDay,
    profile,
    goals.dailyCalorieTarget,
  )
  const ingById = new Map(resolved.map((i) => [i.nutritionId, i]))

  const slotMap = new Map<string, MealSlotAllocation[]>()

  for (const [key, qty] of mealMap) {
    if (qty <= 0) continue
    const [slotKey, nutritionId] = key.split('::')
    const ing = ingById.get(nutritionId)
    if (!ing) continue

    const list = slotMap.get(slotKey) ?? []
      list.push({
        name: ing.displayName,
        quantity: qty,
        unit: ing.unit,
        calories: caloriesForQuantity(ing, qty),
        nutritionId: ing.nutritionId,
      })
    slotMap.set(slotKey, list)
  }

  const slots: MealSlot[] = []

  for (let d = 1; d <= days; d++) {
    for (let m = 1; m <= mealsPerDay; m++) {
      const slotId = `${d}-${m}`
      const mealItems = slotMap.get(slotId) ?? []
      const itemIds = mealItems
        .map((item) => findNutritionEntry(item.name)?.id)
        .filter((id): id is string => !!id)

      slots.push({
        day: d,
        meal: m,
        slotId,
        label: `第 ${d} 天 · 第 ${m} 餐`,
        items: mealItems,
        slotCalories: Math.round(
          mealItems.reduce((s, i) => s + i.calories, 0) * 10,
        ) / 10,
        balanceNote: getMealBalanceNote(itemIds, profile, m, inventoryStock),
      })
    }
  }

  const slotsWithCooking = assignCookingSuggestions(slots, profile)

  return {
    totalIngredientCalories: Math.round(totalIngredientCalories * 10) / 10,
    totalTargetCalories,
    dailyAverageCalories: Math.round(dailyAverageCalories * 10) / 10,
    dailyTargetCalories: goals.dailyCalorieTarget,
    calorieGap: Math.round(calorieGap * 10) / 10,
    slots: slotsWithCooking,
  }
}
