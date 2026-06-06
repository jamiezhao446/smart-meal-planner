export type MeasureUnit = 'g' | 'kg' | '个' | '片' | 'ml' | '碗' | '勺' | '根'

export interface UnitConversion {
  unit: MeasureUnit
  /** 1 个该单位等于多少克（液体按密度近似 1g/ml） */
  gramsPerUnit: number
}

export type NutritionCategory = 'protein' | 'carb' | 'vegetable' | 'other'

/** 每餐营养配比偏好 */
export type MealNutritionProfile =
  | 'balanced'
  | 'no-carb'
  | 'high-protein'
  | 'low-fat'

export type Gender = 'male' | 'female'

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very-active'

export interface BodyProfile {
  gender: Gender
  age: number
  heightCm: number
  currentWeightKg: number
  targetWeightKg: number
  activityLevel: ActivityLevel
}

export interface CalorieRecommendation {
  bmr: number
  maintenanceCalories: number
  recommendedCalories: number
  goalLabel: string
  calorieAdjustment: number
  /** 预估每周体重变化（kg，负值为减重） */
  weeklyWeightChangeKg: number
}

export interface NutritionEntry {
  id: string
  name: string
  aliases: string[]
  /** 每 100g 热量（kcal） */
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  defaultUnit: MeasureUnit
  unitConversions: UnitConversion[]
}

export interface UserIngredient {
  id: string
  name: string
  quantity: number
  unit: MeasureUnit
}

export interface GoalSettings {
  days: number
  mealsPerDay: number
  dailyCalorieTarget: number
  /** 每餐营养配比 */
  mealProfile: MealNutritionProfile
}

export interface ResolvedIngredient extends UserIngredient {
  nutritionId: string
  displayName: string
  totalCalories: number
  totalGrams: number
}

export interface MealSlotAllocation {
  name: string
  quantity: number
  unit: MeasureUnit
  calories: number
  nutritionId?: string
}

/** 默认展示 | 备选折叠 */
export type RecipeDisplayTier = 'featured' | 'alternate'

export interface CookingSuggestion {
  recipeId: string
  dishName: string
  summary: string
  steps: string[]
  displayTier?: RecipeDisplayTier
}

/** 同组食材对应的多道菜谱（默认 1 道 + 折叠备选） */
export interface RecipeGroupDisplay {
  groupKey: string
  title: string
  featured: CookingSuggestion
  alternates: CookingSuggestion[]
}

export interface MealSlot {
  day: number
  meal: number
  /** 用于完成勾选，格式 day-meal */
  slotId: string
  label: string
  items: MealSlotAllocation[]
  slotCalories: number
  balanceNote?: string
  /** 按食材组合分组的食谱（默认 1 道 + 可展开备选） */
  recipeGroups?: RecipeGroupDisplay[]
}

export interface PlanSummary {
  totalIngredientCalories: number
  totalTargetCalories: number
  dailyAverageCalories: number
  dailyTargetCalories: number
  calorieGap: number
  slots: MealSlot[]
}
