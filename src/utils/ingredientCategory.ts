import { INGREDIENT_CATEGORY, STAPLE_CARB_IDS } from '../data/nutritionCategories'
import {
  findNutritionEntry,
  NUTRITION_DICTIONARY,
} from '../data/nutritionDictionary'
import type { IngredientInputCategory, UserIngredient } from '../types'

export const INPUT_CATEGORY_ORDER: IngredientInputCategory[] = [
  'staple',
  'protein',
  'veg',
  'oil',
]

export const INPUT_CATEGORY_META: Record<
  IngredientInputCategory,
  { label: string; hint: string; panelClass: string; badgeClass: string }
> = {
  staple: {
    label: '主食碳水',
    hint: '米饭、面条、面包等',
    panelClass: 'border-amber-100 bg-amber-50/20',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  protein: {
    label: '肉蛋奶蛋白',
    hint: '肉、蛋、奶、豆等优质蛋白',
    panelClass: 'border-emerald-100 bg-emerald-50/20',
    badgeClass: 'bg-emerald-100 text-emerald-800',
  },
  veg: {
    label: '蔬菜水果',
    hint: '蔬菜与水果',
    panelClass: 'border-teal-100 bg-teal-50/20',
    badgeClass: 'bg-teal-100 text-teal-800',
  },
  oil: {
    label: '坚果油脂',
    hint: '坚果、食用油等',
    panelClass: 'border-orange-100 bg-orange-50/20',
    badgeClass: 'bg-orange-100 text-orange-800',
  },
}

const OIL_NUTRITION_IDS = new Set(['peanut', 'cooking-oil', 'walnut', 'almond'])

export function inferCategoryFromNutritionId(nutritionId: string): IngredientInputCategory {
  if (STAPLE_CARB_IDS.has(nutritionId)) return 'staple'
  if (OIL_NUTRITION_IDS.has(nutritionId)) return 'oil'
  const cat = INGREDIENT_CATEGORY[nutritionId]
  if (cat === 'protein') return 'protein'
  if (cat === 'vegetable') return 'veg'
  if (cat === 'carb') return 'staple'
  return 'oil'
}

export function inferCategoryFromName(name: string): IngredientInputCategory {
  const entry = findNutritionEntry(name)
  if (!entry) return 'veg'
  return inferCategoryFromNutritionId(entry.id)
}

export function ensureIngredientCategories(
  items: UserIngredient[],
): UserIngredient[] {
  return items.map((item) => ({
    ...item,
    category: item.category ?? inferCategoryFromName(item.name),
  }))
}

export function getIngredientNamesForCategory(
  category: IngredientInputCategory,
): string[] {
  return NUTRITION_DICTIONARY.filter(
    (entry) => inferCategoryFromNutritionId(entry.id) === category,
  ).map((entry) => entry.name)
}

export function createEmptyIngredient(
  category: IngredientInputCategory,
): UserIngredient {
  const defaultUnits: Record<IngredientInputCategory, UserIngredient['unit']> = {
    staple: 'g',
    protein: 'g',
    veg: 'g',
    oil: 'g',
  }
  return {
    id: crypto.randomUUID(),
    name: '',
    quantity: 1,
    unit: defaultUnits[category],
    category,
  }
}
