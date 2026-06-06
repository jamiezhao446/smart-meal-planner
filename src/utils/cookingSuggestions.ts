import {
  RECIPE_LIBRARY,
  recipeMatchesProfile,
  type Recipe,
} from '../data/recipeLibrary'
import {
  getIngredientCategory,
  MAIN_PROTEIN_IDS,
  STAPLE_CARB_IDS,
} from '../data/nutritionCategories'
import {
  findNutritionEntry,
  NUTRITION_DICTIONARY,
} from '../data/nutritionDictionary'
import type {
  CookingSuggestion,
  MealNutritionProfile,
  MealSlot,
  MealSlotAllocation,
  RecipeGroupDisplay,
} from '../types'

const BREAKFAST_BLOCKED_IDS = new Set([
  'tomato-egg-rice-bowl',
  'chicken-rice-bowl',
  'egg-fried-rice',
  'beef-tomato-stew',
  'beef-broccoli',
  'beef-stir-fry',
  'chicken-broccoli-stir-fry',
])

const BREAKFAST_BLOCKED_NAME = /盖饭|炒饭|炖|小炒牛肉|炒牛肉|炒鸡胸/

function isBreakfastMeal(meal: number): boolean {
  return meal === 1
}

function recipeAllowedForSlot(recipe: Recipe, meal: number): boolean {
  if (!isBreakfastMeal(meal)) return true
  if (BREAKFAST_BLOCKED_IDS.has(recipe.id)) return false
  if (BREAKFAST_BLOCKED_NAME.test(recipe.name)) return false
  if (recipe.requiredIngredientIds.includes('rice')) return false
  if (recipe.dinnerMain) return false
  return true
}

function ingredientIdsInSlot(items: MealSlotAllocation[]): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    const entry = findNutritionEntry(item.name)
    if (entry) ids.add(entry.id)
  }
  return ids
}

function matchingRecipes(
  available: Set<string>,
  profile: MealNutritionProfile,
  meal: number,
): Recipe[] {
  return RECIPE_LIBRARY.filter(
    (recipe) =>
      !recipe.stapleOnly &&
      recipe.requiredIngredientIds.every((id) => available.has(id)) &&
      recipeMatchesProfile(recipe, profile) &&
      recipeAllowedForSlot(recipe, meal),
  ).sort((a, b) => {
    if (isBreakfastMeal(meal)) {
      const aB = a.breakfastFriendly ? 1 : 0
      const bB = b.breakfastFriendly ? 1 : 0
      if (aB !== bB) return bB - aB
    }
    return b.requiredIngredientIds.length - a.requiredIngredientIds.length
  })
}

function toSuggestion(recipe: Recipe): CookingSuggestion {
  return {
    recipeId: recipe.id,
    dishName: recipe.name,
    summary: recipe.summary,
    steps: recipe.steps,
    displayTier: 'featured',
  }
}

export function recipeGroupKey(ingredientIds: string[]): string {
  return [...ingredientIds].sort().join('+')
}

function groupTitle(ids: string[]): string {
  return ids
    .map((id) => NUTRITION_DICTIONARY.find((e) => e.id === id)?.name ?? id)
    .join(' + ')
}

function deterministicPick<T>(items: T[], seed: string): T {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return items[Math.abs(hash) % items.length]
}

function mealHasMultipleCategories(available: Set<string>): boolean {
  let protein = false
  let veg = false
  let carb = false
  for (const id of available) {
    if (MAIN_PROTEIN_IDS.has(id)) protein = true
    if (getIngredientCategory(id) === 'vegetable') veg = true
    if (STAPLE_CARB_IDS.has(id)) carb = true
  }
  return [protein, veg, carb].filter(Boolean).length >= 2
}

interface RawRecipeGroup {
  groupKey: string
  title: string
  recipes: Recipe[]
}

function buildFallbackGroups(
  available: Set<string>,
  profile: MealNutritionProfile,
  meal: number,
): RawRecipeGroup[] {
  const groups: RawRecipeGroup[] = []

  for (const id of available) {
    const singles = RECIPE_LIBRARY.filter(
      (r) =>
        r.requiredIngredientIds.length === 1 &&
        r.requiredIngredientIds[0] === id &&
        !r.stapleOnly &&
        recipeMatchesProfile(r, profile) &&
        recipeAllowedForSlot(r, meal),
    )
    if (singles.length > 0) {
      groups.push({
        groupKey: id,
        title: groupTitle([id]),
        recipes: singles,
      })
    }
  }

  const combos = matchingRecipes(available, profile, meal).filter(
    (r) => r.requiredIngredientIds.length >= 2,
  )
  const seen = new Set(groups.map((g) => g.groupKey))
  for (const recipe of combos) {
    const key = recipeGroupKey(recipe.requiredIngredientIds)
    if (seen.has(key)) continue
    seen.add(key)
    groups.push({
      groupKey: key,
      title: groupTitle(recipe.requiredIngredientIds),
      recipes: [recipe],
    })
  }

  return groups
}

function buildRecipeGroups(
  items: MealSlotAllocation[],
  profile: MealNutritionProfile,
  meal: number,
): RawRecipeGroup[] {
  const available = ingredientIdsInSlot(items)
  if (available.size === 0) return []

  const matched = matchingRecipes(available, profile, meal)
  const multiCategory = mealHasMultipleCategories(available)

  const combos = matched.filter((r) => r.requiredIngredientIds.length >= 2)
  const coveredByCombo = new Set<string>()
  combos.forEach((r) =>
    r.requiredIngredientIds.forEach((id) => coveredByCombo.add(id)),
  )

  const singles = matched.filter((r) => {
    if (r.requiredIngredientIds.length !== 1) return false
    if (coveredByCombo.has(r.requiredIngredientIds[0])) return false
    if (multiCategory && STAPLE_CARB_IDS.has(r.requiredIngredientIds[0])) return false
    return true
  })

  const groupMap = new Map<string, Recipe[]>()

  for (const recipe of [...combos, ...singles]) {
    const key =
      recipe.requiredIngredientIds.length >= 2
        ? recipeGroupKey(recipe.requiredIngredientIds)
        : recipe.requiredIngredientIds[0]
    const list = groupMap.get(key) ?? []
    list.push(recipe)
    groupMap.set(key, list)
  }

  let groups = [...groupMap.entries()].map(([groupKey, recipes]) => {
    const ids =
      recipes[0].requiredIngredientIds.length >= 2
        ? recipes[0].requiredIngredientIds
        : [recipes[0].requiredIngredientIds[0]]
    return {
      groupKey,
      title: groupTitle(ids),
      recipes,
    }
  })

  if (groups.length === 0) {
    groups = buildFallbackGroups(available, profile, meal)
  }

  return groups
}

interface GroupUsage {
  day: number
  recipeId: string
}

export function assignCookingSuggestions(
  slots: MealSlot[],
  profile: MealNutritionProfile,
): MealSlot[] {
  const groupUsageHistory = new Map<string, GroupUsage[]>()

  return slots.map((slot) => {
    const rawGroups = buildRecipeGroups(slot.items, profile, slot.meal)
    const recipeGroups: RecipeGroupDisplay[] = rawGroups.map((g) => {
      const history = groupUsageHistory.get(g.groupKey) ?? []
      const blocked = new Set(
        history
          .filter((u) => slot.day - u.day < 2)
          .map((u) => u.recipeId),
      )

      let pool = g.recipes.filter((r) => !blocked.has(r.id))
      if (pool.length === 0) pool = [...g.recipes]

      const preferred = pool.filter((r) =>
        isBreakfastMeal(slot.meal) ? r.breakfastFriendly : r.preferFeatured,
      )
      const pickPool =
        preferred.length > 0 ? preferred : pool.filter((r) => r.preferFeatured)
      const finalPool = pickPool.length > 0 ? pickPool : pool

      const featuredRecipe = deterministicPick(
        finalPool,
        `${slot.slotId}:${g.groupKey}`,
      )
      const alternates = g.recipes
        .filter((r) => r.id !== featuredRecipe.id)
        .map((r) => ({
          ...toSuggestion(r),
          displayTier: 'alternate' as const,
        }))

      const featured = {
        ...toSuggestion(featuredRecipe),
        displayTier: 'featured' as const,
      }

      history.push({ day: slot.day, recipeId: featured.recipeId })
      groupUsageHistory.set(g.groupKey, history)

      return {
        groupKey: g.groupKey,
        title: g.title,
        featured,
        alternates,
      }
    })

    return { ...slot, recipeGroups }
  })
}
