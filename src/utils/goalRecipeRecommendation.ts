import { RECIPE_LIBRARY, type Recipe } from '../data/recipeLibrary'
import type {
  BodyProfile,
  CalorieRecommendation,
  GoalRecipeRecommendation,
  WeightGoalType,
} from '../types'
import { getWeightGoalType } from './calorieRecommendation'

function scoreRecipe(recipe: Recipe, goalType: WeightGoalType, meal: string): number {
  if (recipe.stapleOnly) return -1

  let score = 0
  const ids = recipe.requiredIngredientIds

  if (goalType === 'lose') {
    if (recipe.lowCarb) score += 3
    if (recipe.breakfastFriendly && meal === 'breakfast') score += 2
    if (recipe.dinnerMain && meal !== 'breakfast') score += 1
    if (ids.includes('chicken-breast') || ids.includes('shrimp') || ids.includes('egg')) {
      score += 2
    }
    if (ids.includes('broccoli') || ids.includes('spinach') || ids.includes('tomato')) {
      score += 1
    }
    if (ids.includes('rice') && !recipe.lowCarb) score -= 2
    if (ids.includes('beef') && ids.includes('broccoli')) score += 1
    if (recipe.name.includes('蒸') || recipe.name.includes('水煮') || recipe.name.includes('沙拉')) {
      score += 2
    }
  } else if (goalType === 'gain') {
    if (ids.includes('rice') || ids.includes('bread')) score += 3
    if (recipe.dinnerMain) score += 1
    if (ids.includes('beef') || ids.includes('chicken-breast')) score += 2
    if (recipe.breakfastFriendly && meal === 'breakfast') score += 1
  } else {
    if (recipe.preferFeatured) score += 2
    if (recipe.requiredIngredientIds.length >= 2) score += 1
    if (recipe.breakfastFriendly && meal === 'breakfast') score += 1
    if (recipe.dinnerMain && meal !== 'breakfast') score += 1
  }

  return score
}

function pickForMeal(
  meal: GoalRecipeRecommendation['meal'],
  goalType: WeightGoalType,
  used: Set<string>,
  limit: number,
): GoalRecipeRecommendation[] {
  const candidates = RECIPE_LIBRARY.filter((r) => {
    if (used.has(r.id)) return false
    if (meal === 'breakfast' && r.dinnerMain && !r.breakfastFriendly) return false
    if (meal !== 'breakfast' && r.breakfastFriendly && !r.dinnerMain && r.requiredIngredientIds.length <= 1) {
      return false
    }
    return scoreRecipe(r, goalType, meal) > 0
  })
    .sort((a, b) => scoreRecipe(b, goalType, meal) - scoreRecipe(a, goalType, meal))
    .slice(0, limit)

  const reasons: Record<WeightGoalType, string> = {
    lose: '低脂高蛋白、饱腹感好，适合减重期',
    gain: '碳水与蛋白兼顾，有助于增重',
    maintain: '营养均衡，适合日常维持',
  }

  return candidates.map((r) => {
    used.add(r.id)
    return {
      meal,
      recipeId: r.id,
      name: r.name,
      summary: r.summary,
      reason: reasons[goalType],
    }
  })
}

/** 根据减重/增重目标推荐示范食谱（不依赖用户当前食材） */
export function recommendRecipesForGoal(
  profile: BodyProfile,
  recommendation: CalorieRecommendation | null,
): GoalRecipeRecommendation[] {
  const goalType = recommendation?.goalType ?? getWeightGoalType(profile)
  const used = new Set<string>()

  const breakfast = pickForMeal('breakfast', goalType, used, 2)
  const lunch = pickForMeal('lunch', goalType, used, 2)
  const dinner = pickForMeal('dinner', goalType, used, 2)

  return [...breakfast, ...lunch, ...dinner]
}

export function mealProfileForGoal(goalType: WeightGoalType): 'balanced' | 'low-fat' | 'high-protein' {
  switch (goalType) {
    case 'lose':
      return 'low-fat'
    case 'gain':
      return 'high-protein'
    default:
      return 'balanced'
  }
}
