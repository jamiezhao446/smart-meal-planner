import type { IngredientInputCategory, NutritionCategory } from '../types'

/** 主食碳水类目（同一餐最多 1 种） */
export const STAPLE_CARB_IDS = new Set([
  'rice',
  'bread',
  'potato',
  'noodles',
  'mantou',
  'sweet-potato',
  'corn',
  'oats',
])

/** 早餐不宜作为主食的碳水（与米饭规则一致） */
export const NO_BREAKFAST_STAPLE_IDS = new Set(['rice', 'noodles'])

/** 午/晚餐拆分的主食 */
export const LUNCH_DINNER_STAPLE_SPLIT_IDS = new Set(['rice', 'noodles'])

/** 早餐常见主食 */
export const BREAKFAST_STAPLE_IDS = new Set(['bread', 'mantou', 'oats'])

/** 早餐奶制品（集中在一餐） */
export const BREAKFAST_DAIRY_IDS = new Set(['milk', 'yogurt'])

/** 午/晚餐拆分的荤豆蛋白 */
export const LUNCH_DINNER_MEAT_IDS = new Set([
  'chicken-breast',
  'beef',
  'tofu',
  'shrimp',
  'salmon',
  'pork',
  'lean-pork',
  'pork-belly',
  'lamb',
  'duck',
  'fish-fillet',
  'edamame',
])

/** 菜谱匹配用主蛋白 */
export const MAIN_PROTEIN_IDS = new Set([
  'egg',
  ...LUNCH_DINNER_MEAT_IDS,
])

/** 食材营养类别 */
export const INGREDIENT_CATEGORY: Record<string, NutritionCategory> = {
  egg: 'protein',
  beef: 'protein',
  'chicken-breast': 'protein',
  salmon: 'protein',
  shrimp: 'protein',
  tofu: 'protein',
  milk: 'protein',
  yogurt: 'protein',
  pork: 'protein',
  'lean-pork': 'protein',
  'pork-belly': 'protein',
  lamb: 'protein',
  duck: 'protein',
  'fish-fillet': 'protein',
  edamame: 'protein',
  rice: 'carb',
  bread: 'carb',
  potato: 'carb',
  noodles: 'carb',
  mantou: 'carb',
  'sweet-potato': 'carb',
  corn: 'carb',
  oats: 'carb',
  tomato: 'vegetable',
  broccoli: 'vegetable',
  spinach: 'vegetable',
  cucumber: 'vegetable',
  carrot: 'vegetable',
  cabbage: 'vegetable',
  lettuce: 'vegetable',
  celery: 'vegetable',
  'bell-pepper': 'vegetable',
  mushroom: 'vegetable',
  onion: 'vegetable',
  eggplant: 'vegetable',
  'green-bean': 'vegetable',
  'bok-choy': 'vegetable',
  cauliflower: 'vegetable',
  kelp: 'vegetable',
  apple: 'vegetable',
  banana: 'vegetable',
  orange: 'vegetable',
  pear: 'vegetable',
  grape: 'vegetable',
  kiwi: 'vegetable',
  watermelon: 'vegetable',
  peanut: 'other',
  'cooking-oil': 'other',
}

export function getIngredientCategory(nutritionId: string): NutritionCategory {
  return INGREDIENT_CATEGORY[nutritionId] ?? 'other'
}

/** 优先读取用户录入的 category 字段 */
export function getResolvedNutritionCategory(ing: {
  category: IngredientInputCategory
  nutritionId: string
}): NutritionCategory {
  switch (ing.category) {
    case 'staple':
      return 'carb'
    case 'protein':
      return 'protein'
    case 'veg':
      return 'vegetable'
    case 'oil':
      return 'other'
  }
}

export function isResolvedStaple(ing: {
  category: IngredientInputCategory
  nutritionId: string
}): boolean {
  return ing.category === 'staple'
}

export function isStapleCarb(nutritionId: string): boolean {
  return STAPLE_CARB_IDS.has(nutritionId)
}

export function isBreakfastDairy(nutritionId: string): boolean {
  return BREAKFAST_DAIRY_IDS.has(nutritionId)
}

export function isLunchDinnerMeat(nutritionId: string): boolean {
  return LUNCH_DINNER_MEAT_IDS.has(nutritionId)
}

export function isLunchDinnerStapleSplit(nutritionId: string): boolean {
  return LUNCH_DINNER_STAPLE_SPLIT_IDS.has(nutritionId)
}

export function isBreakfastStaple(nutritionId: string): boolean {
  return BREAKFAST_STAPLE_IDS.has(nutritionId)
}

export const CATEGORY_LABEL: Record<NutritionCategory, string> = {
  carb: '主食',
  protein: '蛋白',
  vegetable: '蔬菜',
  other: '其它',
}

export const CATEGORY_TAG_CLASS: Record<NutritionCategory, string> = {
  carb: 'bg-amber-100 text-amber-900 ring-amber-200',
  protein: 'bg-sky-100 text-sky-900 ring-sky-200',
  vegetable: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  other: 'bg-slate-100 text-slate-700 ring-slate-200',
}
