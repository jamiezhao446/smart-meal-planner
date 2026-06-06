import { findNutritionEntry, NUTRITION_DICTIONARY } from '../data/nutritionDictionary'
import type { IngredientInputCategory, MeasureUnit, NutritionEntry } from '../types'
import { inferCategoryFromNutritionId } from './ingredientCategory'

export interface IngredientCatalogItem {
  id: string
  name: string
  category: IngredientInputCategory
  defaultUnit: MeasureUnit
  baseCalories: number
  emoji: string
  isCustom?: boolean
}

const EMOJI_MAP: Record<string, string> = {
  egg: '🥚',
  tomato: '🍅',
  beef: '🥩',
  'chicken-breast': '🍗',
  rice: '🍚',
  bread: '🍞',
  broccoli: '🥦',
  potato: '🥔',
  milk: '🥛',
  spinach: '🥬',
  salmon: '🐟',
  tofu: '🧈',
  apple: '🍎',
  banana: '🍌',
  shrimp: '🦐',
  noodles: '🍜',
  mantou: '🥯',
  'sweet-potato': '🍠',
  corn: '🌽',
  oats: '🌾',
  pork: '🥓',
  'lean-pork': '🥩',
  'pork-belly': '🥓',
  lamb: '🍖',
  duck: '🦆',
  'fish-fillet': '🐟',
  yogurt: '🥛',
  edamame: '🫛',
  cucumber: '🥒',
  carrot: '🥕',
  cabbage: '🥬',
  lettuce: '🥗',
  celery: '🌿',
  'bell-pepper': '🫑',
  mushroom: '🍄',
  onion: '🧅',
  eggplant: '🍆',
  'green-bean': '🫘',
  'bok-choy': '🥬',
  cauliflower: '🥦',
  kelp: '🌊',
  orange: '🍊',
  pear: '🍐',
  grape: '🍇',
  kiwi: '🥝',
  watermelon: '🍉',
  peanut: '🥜',
  'cooking-oil': '🫒',
}

const CATEGORY_EMOJI: Record<IngredientInputCategory, string> = {
  staple: '🍚',
  protein: '🥚',
  veg: '🥬',
  oil: '🥜',
}

export function baseCaloriesForEntry(entry: NutritionEntry): number {
  const conv = entry.unitConversions.find((c) => c.unit === entry.defaultUnit)
  if (!conv) {
    return Math.round(entry.caloriesPer100g * 10) / 10
  }
  const grams = conv.gramsPerUnit
  return Math.round(((grams / 100) * entry.caloriesPer100g) * 10) / 10
}

export function entryToCatalogItem(
  entry: NutritionEntry,
  isCustom = false,
): IngredientCatalogItem {
  return {
    id: entry.id,
    name: entry.name,
    category: inferCategoryFromNutritionId(entry.id),
    defaultUnit: entry.defaultUnit,
    baseCalories: baseCaloriesForEntry(entry),
    emoji: EMOJI_MAP[entry.id] ?? CATEGORY_EMOJI[inferCategoryFromNutritionId(entry.id)],
    isCustom,
  }
}

export function getDictionaryCatalog(): IngredientCatalogItem[] {
  return NUTRITION_DICTIONARY.map((entry) => entryToCatalogItem(entry))
}

export function catalogItemFromName(
  name: string,
  category: IngredientInputCategory,
  isCustom = false,
): IngredientCatalogItem | null {
  const entry = findNutritionEntry(name)
  if (entry) return entryToCatalogItem(entry, isCustom)
  if (!name.trim()) return null
  return {
    id: `custom-${name}`,
    name: name.trim(),
    category,
    defaultUnit: 'g',
    baseCalories: 0,
    emoji: CATEGORY_EMOJI[category],
    isCustom: true,
  }
}

export function filterCatalogItems(
  items: IngredientCatalogItem[],
  options: {
    category?: IngredientInputCategory
    query?: string
  },
): IngredientCatalogItem[] {
  const q = options.query?.trim().toLowerCase() ?? ''
  return items.filter((item) => {
    if (options.category && item.category !== options.category) return false
    if (!q) return true
    const entry = findNutritionEntry(item.name)
    const aliases = entry?.aliases ?? []
    return (
      item.name.toLowerCase().includes(q) ||
      aliases.some((a) => a.toLowerCase().includes(q))
    )
  })
}

export function formatBaseCalorieLabel(item: IngredientCatalogItem): string {
  if (item.isCustom && item.baseCalories <= 0) {
    return '自定义食材'
  }
  return `${item.baseCalories} kcal/${item.defaultUnit}`
}
