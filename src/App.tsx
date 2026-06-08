import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppTabNav, type AppTab } from './components/AppTabNav'
import { BodyProfilePanel } from './components/BodyProfilePanel'
import { CalorieDashboard } from './components/CalorieDashboard'
import { GoalSettingsPanel } from './components/GoalSettingsPanel'
import { IngredientInput } from './components/IngredientInput'
import { MealPlannerAgent } from './components/MealPlannerAgent'
import { MealPlanBoard } from './components/MealPlanBoard'
import { NutritionAnalysisPanel } from './components/NutritionAnalysisPanel'
import { NutritionPreferencePanel } from './components/NutritionPreferencePanel'
import type { BodyProfile, GoalSettings, UserIngredient } from './types'
import {
  loadBodyProfile,
  saveBodyProfile,
} from './utils/bodyProfileStorage'
import { recommendDailyCalories } from './utils/calorieRecommendation'
import { loadCompletedMeals, toggleCompleted } from './utils/mealCompletion'
import { ensureIngredientCategories } from './utils/ingredientCategory'
import { buildMealPlan } from './utils/mealPlanner'

const DEFAULT_GOALS: GoalSettings = {
  days: 3,
  mealsPerDay: 3,
  dailyCalorieTarget: 2000,
  mealProfile: 'balanced',
}

const DEFAULT_INGREDIENTS: UserIngredient[] = ensureIngredientCategories([
  { id: '1', name: '鸡蛋', quantity: 6, unit: '个', category: 'protein' },
  { id: '2', name: '番茄', quantity: 3, unit: '个', category: 'veg' },
  { id: '3', name: '鸡胸肉', quantity: 400, unit: 'g', category: 'protein' },
  { id: '4', name: '大米', quantity: 500, unit: 'g', category: 'staple' },
  { id: '5', name: '西兰花', quantity: 300, unit: 'g', category: 'veg' },
])

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('plan')
  const [ingredients, setIngredients] = useState<UserIngredient[]>(() =>
    ensureIngredientCategories(DEFAULT_INGREDIENTS),
  )
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(() => loadBodyProfile())
  const [goals, setGoals] = useState<GoalSettings>(DEFAULT_GOALS)
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(() =>
    loadCompletedMeals(),
  )

  const calorieRecommendation = useMemo(
    () => recommendDailyCalories(bodyProfile),
    [bodyProfile],
  )

  useEffect(() => {
    saveBodyProfile(bodyProfile)
  }, [bodyProfile])

  const plan = useMemo(
    () => buildMealPlan(ingredients, goals),
    [ingredients, goals],
  )

  const hasPlan = plan.totalIngredientCalories > 0 && plan.slots.length > 0

  const validSlotIds = useMemo(
    () => new Set(plan.slots.map((s) => s.slotId)),
    [plan.slots],
  )

  useEffect(() => {
    setCompletedMeals((prev) => {
      const next = new Set([...prev].filter((id) => validSlotIds.has(id)))
      if (next.size !== prev.size) return next
      return prev
    })
  }, [validSlotIds])

  const handleToggleComplete = useCallback((slotId: string) => {
    setCompletedMeals((prev) => toggleCompleted(prev, slotId))
  }, [])

  const handleProfileChange = (mealProfile: GoalSettings['mealProfile']) => {
    setGoals((g) => ({ ...g, mealProfile }))
  }

  const handleApplyPlan = useCallback(
    (payload: {
      calories: number
      planDays: number
      mealProfile: GoalSettings['mealProfile']
    }) => {
      setGoals((g) => ({
        ...g,
        dailyCalorieTarget: payload.calories,
        days: payload.planDays,
        mealProfile: payload.mealProfile,
      }))
    },
    [],
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/30">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            智能食材膳食规划器
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            全天统筹分餐 · 营养分析 · 早餐专属规则
          </p>
        </div>
      </header>

      <AppTabNav active={activeTab} onChange={setActiveTab} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'plan' && (
          <div className="mx-auto max-w-2xl space-y-5">
            <BodyProfilePanel
              profile={bodyProfile}
              onChange={setBodyProfile}
              appliedCalories={goals.dailyCalorieTarget}
              appliedPlanDays={goals.days}
              onApplyPlan={handleApplyPlan}
            />
            <GoalSettingsPanel
              goals={goals}
              onChange={setGoals}
              recommendedCalories={calorieRecommendation?.recommendedCalories}
            />
          </div>
        )}

        {activeTab === 'ingredients' && (
          <div className="mx-auto max-w-6xl">
            <IngredientInput items={ingredients} onChange={setIngredients} />
          </div>
        )}

        {activeTab === 'meals' && (
          <div className="space-y-5">
            <div className="mx-auto max-w-2xl">
              <NutritionPreferencePanel
                profile={goals.mealProfile}
                onChange={handleProfileChange}
              />
            </div>
            <CalorieDashboard plan={plan} mealsPerDay={goals.mealsPerDay} />
            <NutritionAnalysisPanel ingredients={ingredients} hasPlan={hasPlan} />
            <MealPlanBoard
              plan={plan}
              days={goals.days}
              completedMeals={completedMeals}
              onToggleComplete={handleToggleComplete}
            />
          </div>
        )}
      </main>

      <MealPlannerAgent
        context={{
          ingredients,
          goals,
          bodyProfile,
          plan,
          calorieRecommendation,
        }}
      />
    </div>
  )
}

export default App
