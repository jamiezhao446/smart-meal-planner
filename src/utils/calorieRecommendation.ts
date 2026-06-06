import type { ActivityLevel, BodyProfile, CalorieRecommendation, Gender } from '../types'

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
}

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

export function isBodyProfileComplete(profile: BodyProfile): boolean {
  return (
    profile.age >= 10 &&
    profile.age <= 100 &&
    profile.heightCm >= 100 &&
    profile.heightCm <= 250 &&
    profile.currentWeightKg >= 30 &&
    profile.currentWeightKg <= 250 &&
    profile.targetWeightKg >= 30 &&
    profile.targetWeightKg <= 250
  )
}

/** 根据身体信息与体重目标推算每日推荐热量 */
export function recommendDailyCalories(profile: BodyProfile): CalorieRecommendation | null {
  if (!isBodyProfileComplete(profile)) return null

  const bmr = calculateBmr(profile)
  const maintenanceCalories = Math.round(
    bmr * ACTIVITY_MULTIPLIER[profile.activityLevel],
  )

  const weightDiff = profile.currentWeightKg - profile.targetWeightKg
  let adjustment = 0
  let goalLabel = '维持体重'

  if (weightDiff >= 3) {
    adjustment = -500
    goalLabel = '减重（较大差距，温和缺口）'
  } else if (weightDiff >= 1) {
    adjustment = -400
    goalLabel = '减重'
  } else if (weightDiff >= 0.5) {
    adjustment = -250
    goalLabel = '轻度减重'
  } else if (weightDiff <= -3) {
    adjustment = 400
    goalLabel = '增重（较大差距，温和盈余）'
  } else if (weightDiff <= -1) {
    adjustment = 300
    goalLabel = '增重'
  } else if (weightDiff <= -0.5) {
    adjustment = 200
    goalLabel = '轻度增重'
  }

  const raw = maintenanceCalories + adjustment
  const recommendedCalories = clampDailyCalories(raw, profile.gender)

  const actualAdjustment = recommendedCalories - maintenanceCalories
  if (actualAdjustment !== adjustment && adjustment < 0) {
    goalLabel += '（已按安全下限调整）'
  }

  return {
    bmr,
    maintenanceCalories,
    recommendedCalories,
    goalLabel,
    calorieAdjustment: actualAdjustment,
    weeklyWeightChangeKg:
      actualAdjustment === 0
        ? 0
        : Math.round(((actualAdjustment * 7) / 7700) * 100) / 100,
  }
}
