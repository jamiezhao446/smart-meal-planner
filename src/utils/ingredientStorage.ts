import type { IngredientInputCategory, UserIngredient } from '../types'
import { inferCategoryFromName } from './ingredientCategory'

const SAVED_KEY = 'smart-meal-planner-saved-ingredients'
const HISTORY_KEY = 'smart-meal-planner-ingredient-history'
const CUSTOM_KEY = 'smart-meal-planner-custom-ingredients'

export interface SavedIngredient {
  name: string
  category: IngredientInputCategory
  defaultUnit: UserIngredient['unit']
  lastQuantity: number
}

export interface IngredientHistoryEntry {
  id: string
  savedAt: string
  label: string
  items: UserIngredient[]
}

export interface CustomIngredientDef {
  name: string
  category: IngredientInputCategory
}

export function loadSavedIngredients(): SavedIngredient[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedIngredient[]
  } catch {
    return []
  }
}

export function saveSavedIngredients(list: SavedIngredient[]): void {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list))
}

export function upsertSavedFromItems(items: UserIngredient[]): SavedIngredient[] {
  const map = new Map<string, SavedIngredient>()
  for (const existing of loadSavedIngredients()) {
    map.set(`${existing.category}::${existing.name}`, existing)
  }
  for (const item of items) {
    if (!item.name.trim() || item.quantity <= 0) continue
    const key = `${item.category}::${item.name}`
    map.set(key, {
      name: item.name,
      category: item.category,
      defaultUnit: item.unit,
      lastQuantity: item.quantity,
    })
  }
  const next = [...map.values()]
  saveSavedIngredients(next)
  return next
}

export function loadCustomIngredients(): CustomIngredientDef[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CustomIngredientDef[]
  } catch {
    return []
  }
}

export function saveCustomIngredients(list: CustomIngredientDef[]): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
}

export function addCustomIngredient(def: CustomIngredientDef): CustomIngredientDef[] {
  const list = loadCustomIngredients().filter((c) => c.name !== def.name)
  list.push(def)
  saveCustomIngredients(list)
  return list
}

export function loadIngredientHistory(): IngredientHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as IngredientHistoryEntry[]
  } catch {
    return []
  }
}

export function pushIngredientHistory(items: UserIngredient[]): IngredientHistoryEntry[] {
  const valid = items.filter((i) => i.name.trim() && i.quantity > 0)
  if (valid.length === 0) return loadIngredientHistory()

  const history = loadIngredientHistory()
  const fingerprint = valid
    .map((i) => `${i.category}:${i.name}:${i.quantity}${i.unit}`)
    .sort()
    .join('|')

  if (history[0]) {
    const lastFp = history[0].items
      .map((i) => `${i.category}:${i.name}:${i.quantity}${i.unit}`)
      .sort()
      .join('|')
    if (lastFp === fingerprint) return history
  }

  const entry: IngredientHistoryEntry = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    label: `${valid.length} 种食材 · ${new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    items: valid.map((i) => ({ ...i, id: crypto.randomUUID() })),
  }

  const next = [entry, ...history].slice(0, 12)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  return next
}

export function migrateItemsToSaved(items: UserIngredient[]): void {
  if (loadSavedIngredients().length > 0) return
  upsertSavedFromItems(items)
}

export function createIngredientFromCatalog(
  name: string,
  category: IngredientInputCategory,
  quantity?: number,
  unit?: UserIngredient['unit'],
): UserIngredient {
  return {
    id: crypto.randomUUID(),
    name,
    quantity: quantity ?? 1,
    unit: unit ?? 'g',
    category: category ?? inferCategoryFromName(name),
  }
}
