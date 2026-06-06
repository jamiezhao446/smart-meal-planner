import type { ActivityLevel, BodyProfile } from '../types'

const STORAGE_KEY = 'smart-meal-planner-body-profile'

export const DEFAULT_BODY_PROFILE: BodyProfile = {
  gender: 'female',
  age: 28,
  heightCm: 165,
  currentWeightKg: 60,
  targetWeightKg: 55,
  activityLevel: 'light',
}

export function loadBodyProfile(): BodyProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_BODY_PROFILE
    const parsed = JSON.parse(raw) as Partial<BodyProfile>
    return {
      gender: parsed.gender === 'male' ? 'male' : 'female',
      age: clampNum(parsed.age, 10, 100, DEFAULT_BODY_PROFILE.age),
      heightCm: clampNum(parsed.heightCm, 100, 250, DEFAULT_BODY_PROFILE.heightCm),
      currentWeightKg: clampNum(
        parsed.currentWeightKg,
        30,
        250,
        DEFAULT_BODY_PROFILE.currentWeightKg,
      ),
      targetWeightKg: clampNum(
        parsed.targetWeightKg,
        30,
        250,
        DEFAULT_BODY_PROFILE.targetWeightKg,
      ),
      activityLevel: isActivityLevel(parsed.activityLevel)
        ? parsed.activityLevel
        : DEFAULT_BODY_PROFILE.activityLevel,
    }
  } catch {
    return DEFAULT_BODY_PROFILE
  }
}

export function saveBodyProfile(profile: BodyProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

function clampNum(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function isActivityLevel(value: unknown): value is ActivityLevel {
  return (
    value === 'sedentary' ||
    value === 'light' ||
    value === 'moderate' ||
    value === 'active' ||
    value === 'very-active'
  )
}
