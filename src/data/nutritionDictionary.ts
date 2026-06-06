import type { MeasureUnit, NutritionEntry } from '../types'
import { NUTRITION_DICTIONARY_EXTRA } from './nutritionDictionaryExtra'

const g = (gramsPerUnit: number): { unit: MeasureUnit; gramsPerUnit: number }[] => [
  { unit: 'g', gramsPerUnit: 1 },
  { unit: 'kg', gramsPerUnit: 1000 },
  { unit: '个', gramsPerUnit },
  { unit: '片', gramsPerUnit },
  { unit: 'ml', gramsPerUnit },
  { unit: '碗', gramsPerUnit },
  { unit: '勺', gramsPerUnit },
]

/** 常见食材营养字典（每 100g 基准，部分食材附带单位换算） */
export const NUTRITION_DICTIONARY: NutritionEntry[] = [
  {
    id: 'egg',
    name: '鸡蛋',
    aliases: ['蛋', '鸡蛋', '土鸡蛋'],
    caloriesPer100g: 144,
    proteinPer100g: 13.3,
    carbsPer100g: 2.8,
    fatPer100g: 8.8,
    defaultUnit: '个',
    unitConversions: g(50),
  },
  {
    id: 'tomato',
    name: '番茄',
    aliases: ['番茄', '西红柿', 'tomato'],
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
    defaultUnit: '个',
    unitConversions: g(150),
  },
  {
    id: 'beef',
    name: '牛肉',
    aliases: ['牛肉', '牛里脊', '牛排'],
    caloriesPer100g: 250,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 15,
    defaultUnit: 'g',
    unitConversions: g(1),
  },
  {
    id: 'chicken-breast',
    name: '鸡胸肉',
    aliases: ['鸡胸肉', '鸡胸', '鸡肉'],
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    defaultUnit: 'g',
    unitConversions: g(1),
  },
  {
    id: 'rice',
    name: '大米',
    aliases: ['大米', '米饭', '白米', '生米'],
    caloriesPer100g: 346,
    proteinPer100g: 7.4,
    carbsPer100g: 77.9,
    fatPer100g: 0.8,
    defaultUnit: 'g',
    unitConversions: [
      { unit: 'g', gramsPerUnit: 1 },
      { unit: 'kg', gramsPerUnit: 1000 },
      { unit: '碗', gramsPerUnit: 150 },
      { unit: '勺', gramsPerUnit: 15 },
    ],
  },
  {
    id: 'bread',
    name: '面包',
    aliases: ['面包', '吐司', '全麦面包'],
    caloriesPer100g: 265,
    proteinPer100g: 9,
    carbsPer100g: 49,
    fatPer100g: 3.2,
    defaultUnit: '片',
    unitConversions: g(30),
  },
  {
    id: 'broccoli',
    name: '西兰花',
    aliases: ['西兰花', '花椰菜', 'broccoli'],
    caloriesPer100g: 34,
    proteinPer100g: 2.8,
    carbsPer100g: 6.6,
    fatPer100g: 0.4,
    defaultUnit: 'g',
    unitConversions: g(1),
  },
  {
    id: 'potato',
    name: '土豆',
    aliases: ['土豆', '马铃薯', '洋芋'],
    caloriesPer100g: 77,
    proteinPer100g: 2,
    carbsPer100g: 17.5,
    fatPer100g: 0.1,
    defaultUnit: '个',
    unitConversions: g(200),
  },
  {
    id: 'milk',
    name: '牛奶',
    aliases: ['牛奶', '全脂奶', '鲜奶'],
    caloriesPer100g: 54,
    proteinPer100g: 3.3,
    carbsPer100g: 4.8,
    fatPer100g: 2,
    defaultUnit: 'ml',
    unitConversions: g(1),
  },
  {
    id: 'spinach',
    name: '菠菜',
    aliases: ['菠菜'],
    caloriesPer100g: 23,
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    defaultUnit: 'g',
    unitConversions: g(1),
  },
  {
    id: 'salmon',
    name: '三文鱼',
    aliases: ['三文鱼', '鲑鱼', 'salmon'],
    caloriesPer100g: 208,
    proteinPer100g: 20,
    carbsPer100g: 0,
    fatPer100g: 13,
    defaultUnit: 'g',
    unitConversions: g(1),
  },
  {
    id: 'tofu',
    name: '豆腐',
    aliases: ['豆腐', '北豆腐', '嫩豆腐'],
    caloriesPer100g: 76,
    proteinPer100g: 8.1,
    carbsPer100g: 1.9,
    fatPer100g: 4.8,
    defaultUnit: 'g',
    unitConversions: g(1),
  },
  {
    id: 'apple',
    name: '苹果',
    aliases: ['苹果', 'apple'],
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
    defaultUnit: '个',
    unitConversions: g(180),
  },
  {
    id: 'banana',
    name: '香蕉',
    aliases: ['香蕉', 'banana'],
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    defaultUnit: '个',
    unitConversions: g(120),
  },
  {
    id: 'shrimp',
    name: '虾仁',
    aliases: ['虾仁', '虾', '对虾'],
    caloriesPer100g: 99,
    proteinPer100g: 24,
    carbsPer100g: 0.2,
    fatPer100g: 0.3,
    defaultUnit: 'g',
    unitConversions: g(1),
  },
  ...NUTRITION_DICTIONARY_EXTRA,
]

export function findNutritionEntry(name: string): NutritionEntry | undefined {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined

  return NUTRITION_DICTIONARY.find(
    (entry) =>
      entry.name.toLowerCase() === normalized ||
      entry.aliases.some((alias) => alias.toLowerCase() === normalized),
  )
}

export function getAvailableUnits(entry: NutritionEntry): MeasureUnit[] {
  return entry.unitConversions.map((c) => c.unit)
}

export function getIngredientNames(): string[] {
  return NUTRITION_DICTIONARY.map((e) => e.name)
}
