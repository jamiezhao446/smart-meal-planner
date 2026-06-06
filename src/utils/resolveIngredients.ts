import { findNutritionEntry } from '../data/nutritionDictionary'
import type { ResolvedIngredient, UserIngredient } from '../types'

export function resolveIngredient(item: UserIngredient): ResolvedIngredient | null {
  const entry = findNutritionEntry(item.name)
  if (!entry || item.quantity <= 0) return null

  const conv = entry.unitConversions.find((c) => c.unit === item.unit)
  if (!conv) return null

  const totalGrams = item.quantity * conv.gramsPerUnit
  const totalCalories = (totalGrams / 100) * entry.caloriesPer100g

  return {
    ...item,
    nutritionId: entry.id,
    displayName: entry.name,
    totalCalories,
    totalGrams,
  }
}

export function resolveAllIngredients(items: UserIngredient[]): ResolvedIngredient[] {
  return items
    .map(resolveIngredient)
    .filter((r): r is ResolvedIngredient => r !== null)
}
