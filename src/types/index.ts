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

export type WeightGoalType = 'lose' | 'gain' | 'maintain'

export interface BodyProfile {
  gender: Gender
  age: number
  heightCm: number
  currentWeightKg: number
  targetWeightKg: number
  /** 计划达成目标体重的天数 */
  planDurationDays: number
  activityLevel: ActivityLevel
}

export interface CalorieRecommendation {
  bmr: number
  maintenanceCalories: number
  recommendedCalories: number
  goalType: WeightGoalType
  goalLabel: string
  calorieAdjustment: number
  /** 计划周期内需变化的总体重 (kg)，正值为减重 */
  totalWeightChangeKg: number
  /** 按周期均摊的每日体重变化 (kg/天)，正值为减重 */
  plannedDailyWeightChangeKg: number
  /** 按推荐热量预估的实际每日体重变化 (kg/天) */
  effectiveDailyWeightChangeKg: number
  weeklyWeightChangeKg: number
  planDurationDays: number
  /** 若计划过快，建议延长到的最少天数 */
  suggestedMinDays?: number
  planWarning?: string
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

/** 食材录入面板分类 */
export type IngredientInputCategory = 'staple' | 'protein' | 'veg' | 'oil'

export interface UserIngredient {
  id: string
  name: string
  quantity: number
  unit: MeasureUnit
  category: IngredientInputCategory
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
