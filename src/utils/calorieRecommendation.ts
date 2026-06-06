import type {
  ActivityLevel,
  BodyProfile,
  CalorieRecommendation,
  Gender,
  WeightGoalType,
} from '../types'

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
}

const KCAL_PER_KG = 7700
const MAX_DEFICIT = 750
const MAX_SURPLUS = 400
const MAINTAIN_THRESHOLD_KG = 0.5

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel
  label: string
  hint: string
}[] = [
  { value: 'sedentary', label: '久坐', hint: '办公室工作，几乎不运动' },
  { value: 'light', label: '轻度活动', hint: '每周运动 1–3 次' },
  { value: 'moderate', label: '中度活动', hint: '每周运动 3–5 次' },
  { value: 'active', label: '高度活动', hint: '每周运动 6–7 次' },
  { value: 'very-active', label: '极高强度', hint: '体力劳动或每天高强度训练' },
]

/** Mifflin-St Jeor 基础代谢率 (BMR) */
export function calculateBmr(profile: BodyProfile): number {
  const { gender, age, heightCm, currentWeightKg } = profile
  const base =
    10 * currentWeightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161)
  return Math.round(base)
}

function clampDailyCalories(calories: number, gender: Gender): number {
  const min = gender === 'female' ? 1200 : 1500
  return Math.round(Math.min(3500, Math.max(min, calories)))
}

export function getWeightGoalType(profile: BodyProfile): WeightGoalType {
  const diff = profile.currentWeightKg - profile.targetWeightKg
  if (diff >= MAINTAIN_THRESHOLD_KG) return 'lose'
  if (diff <= -MAINTAIN_THRESHOLD_KG) return 'gain'
  return 'maintain'
}

export function isBodyProfileComplete(profile: BodyProfile): boolean {
  return (
    profile.age >= 10 &&
    profile.age <= 100 &&
    profile.heightCm >= 100 &&
    profile.heightCm <= 250 &&
    profile.currentWeightKg >= 30 &&
    profile.currentWeightKg <= 250 &&
    profile.targetWeightKg >= 30 &&
    profile.targetWeightKg <= 250 &&
    profile.planDurationDays >= 7 &&
    profile.planDurationDays <= 365
  )
}

/** 根据身体信息、目标体重与计划周期推算每日推荐热量 */
export function recommendDailyCalories(profile: BodyProfile): CalorieRecommendation | null {
  if (!isBodyProfileComplete(profile)) return null

  const bmr = calculateBmr(profile)
  const maintenanceCalories = Math.round(
    bmr * ACTIVITY_MULTIPLIER[profile.activityLevel],
  )

  const goalType = getWeightGoalType(profile)
  const totalWeightChangeKg = profile.currentWeightKg - profile.targetWeightKg
  const plannedDailyWeightChangeKg =
    Math.round((totalWeightChangeKg / profile.planDurationDays) * 1000) / 1000

  let adjustment = 0
  let goalLabel = '维持体重'
  let planWarning: string | undefined
  let suggestedMinDays: number | undefined

  if (goalType === 'lose') {
    const idealDeficit = plannedDailyWeightChangeKg * KCAL_PER_KG
    const cappedDeficit = Math.min(MAX_DEFICIT, idealDeficit)
    adjustment = -Math.round(cappedDeficit)

    if (plannedDailyWeightChangeKg > MAX_DEFICIT / KCAL_PER_KG + 0.02) {
      suggestedMinDays = Math.ceil(
        (totalWeightChangeKg * KCAL_PER_KG) / MAX_DEFICIT,
      )
      planWarning = `按 ${profile.planDurationDays} 天计划需每日减约 ${plannedDailyWeightChangeKg.toFixed(2)} kg，偏激进；热量已按安全上限调整，建议将周期延长至至少 ${suggestedMinDays} 天。`
      goalLabel = '减重（计划较快，已安全限速）'
    } else if (plannedDailyWeightChangeKg >= 0.08) {
      goalLabel = '减重（按计划周期）'
    } else {
      goalLabel = '温和减重'
    }
  } else if (goalType === 'gain') {
    const idealSurplus = Math.abs(plannedDailyWeightChangeKg) * KCAL_PER_KG
    const cappedSurplus = Math.min(MAX_SURPLUS, idealSurplus)
    adjustment = Math.round(cappedSurplus)

    if (Math.abs(plannedDailyWeightChangeKg) > MAX_SURPLUS / KCAL_PER_KG + 0.02) {
      suggestedMinDays = Math.ceil(
        (Math.abs(totalWeightChangeKg) * KCAL_PER_KG) / MAX_SURPLUS,
      )
      planWarning = `增重节奏偏快，热量已按安全上限调整，建议将周期延长至至少 ${suggestedMinDays} 天。`
      goalLabel = '增重（计划较快，已安全限速）'
    } else {
      goalLabel = '增重（按计划周期）'
    }
  }

  const raw = maintenanceCalories + adjustment
  const recommendedCalories = clampDailyCalories(raw, profile.gender)
  const actualAdjustment = recommendedCalories - maintenanceCalories

  if (goalType === 'lose' && actualAdjustment !== adjustment) {
    goalLabel += '（已触达最低摄入保护）'
  }

  const effectiveDailyWeightChangeKg =
    actualAdjustment === 0
      ? 0
      : Math.round(((-actualAdjustment / KCAL_PER_KG) * 1000)) / 1000

  const weeklyWeightChangeKg =
    actualAdjustment === 0
      ? 0
      : Math.round(((actualAdjustment * 7) / KCAL_PER_KG) * 100) / 100

  return {
    bmr,
    maintenanceCalories,
    recommendedCalories,
    goalType,
    goalLabel,
    calorieAdjustment: actualAdjustment,
    totalWeightChangeKg: Math.round(totalWeightChangeKg * 10) / 10,
    plannedDailyWeightChangeKg,
    effectiveDailyWeightChangeKg,
    weeklyWeightChangeKg,
    planDurationDays: profile.planDurationDays,
    suggestedMinDays,
    planWarning,
  }
}
