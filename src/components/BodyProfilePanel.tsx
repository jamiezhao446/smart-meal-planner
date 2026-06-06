import { useMemo } from 'react'
import type { BodyProfile, Gender } from '../types'
import {
  ACTIVITY_OPTIONS,
  isBodyProfileComplete,
  recommendDailyCalories,
} from '../utils/calorieRecommendation'
import {
  mealProfileForGoal,
  recommendRecipesForGoal,
} from '../utils/goalRecipeRecommendation'

export interface ApplyPlanPayload {
  calories: number
  planDays: number
  mealProfile: ReturnType<typeof mealProfileForGoal>
}

interface BodyProfilePanelProps {
  profile: BodyProfile
  onChange: (profile: BodyProfile) => void
  appliedCalories?: number
  appliedPlanDays?: number
  onApplyPlan: (payload: ApplyPlanPayload) => void
}

const MEAL_LABEL: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

export function BodyProfilePanel({
  profile,
  onChange,
  appliedCalories,
  appliedPlanDays,
  onApplyPlan,
}: BodyProfilePanelProps) {
  const set = <K extends keyof BodyProfile>(key: K, value: BodyProfile[K]) => {
    onChange({ ...profile, [key]: value })
  }

  const recommendation = useMemo(
    () => recommendDailyCalories(profile),
    [profile],
  )

  const recipeRecommendations = useMemo(
    () => recommendRecipesForGoal(profile, recommendation),
    [profile, recommendation],
  )

  const isPlanApplied =
    recommendation != null &&
    appliedCalories === recommendation.recommendedCalories &&
    appliedPlanDays === recommendation.planDurationDays

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'

  const formatDailyWeight = (kg: number) => {
    if (kg === 0) return '0 kg/天'
    if (kg > 0) return `减 ${kg.toFixed(2)} kg/天`
    return `增 ${Math.abs(kg).toFixed(2)} kg/天`
  }

  return (
    <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/40 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">身体信息与减重计划</h2>
        <p className="mt-1 text-xs text-slate-500">
          根据身体数据、目标体重与计划周期，推算每日减重速度与推荐热量、食谱。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <span className="mb-2 block text-xs font-medium text-slate-500">性别</span>
          <div className="flex gap-2">
            {(
              [
                { value: 'female' as Gender, label: '女' },
                { value: 'male' as Gender, label: '男' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('gender', opt.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  profile.gender === opt.value
                    ? 'border-sky-400 bg-sky-100 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">年龄</span>
          <input
            type="number"
            min={10}
            max={100}
            value={profile.age}
            onChange={(e) => set('age', parseInt(e.target.value, 10) || 0)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">身高 (cm)</span>
          <input
            type="number"
            min={100}
            max={250}
            value={profile.heightCm}
            onChange={(e) => set('heightCm', parseInt(e.target.value, 10) || 0)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">当前体重 (kg)</span>
          <input
            type="number"
            min={30}
            max={250}
            step={0.1}
            value={profile.currentWeightKg}
            onChange={(e) =>
              set('currentWeightKg', parseFloat(e.target.value) || 0)
            }
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">目标体重 (kg)</span>
          <input
            type="number"
            min={30}
            max={250}
            step={0.1}
            value={profile.targetWeightKg}
            onChange={(e) =>
              set('targetWeightKg', parseFloat(e.target.value) || 0)
            }
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            计划周期 (天)
          </span>
          <input
            type="number"
            min={7}
            max={365}
            value={profile.planDurationDays}
            onChange={(e) =>
              set('planDurationDays', parseInt(e.target.value, 10) || 0)
            }
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-400">
            计划在该天数内从当前体重趋近目标体重（7–365 天）
          </span>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-500">运动频率</span>
          <select
            value={profile.activityLevel}
            onChange={(e) =>
              set('activityLevel', e.target.value as BodyProfile['activityLevel'])
            }
            className={inputClass}
          >
            {ACTIVITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.hint}
              </option>
            ))}
          </select>
        </label>
      </div>

      {recommendation ? (
        <>
          <div className="mt-5 rounded-xl border border-sky-200/80 bg-white/80 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
                  推荐一日热量
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                  {recommendation.recommendedCalories}
                  <span className="ml-1 text-base font-medium text-slate-500">kcal</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onApplyPlan({
                    calories: recommendation.recommendedCalories,
                    planDays: recommendation.planDurationDays,
                    mealProfile: mealProfileForGoal(recommendation.goalType),
                  })
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  isPlanApplied
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                    : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                {isPlanApplied ? '已采用推荐方案' : '采用推荐方案'}
              </button>
            </div>

            {recommendation.planWarning && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {recommendation.planWarning}
              </p>
            )}

            <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <dt>计划总变化</dt>
                <dd className="font-medium tabular-nums text-slate-800">
                  {recommendation.totalWeightChangeKg > 0
                    ? `减 ${recommendation.totalWeightChangeKg} kg`
                    : recommendation.totalWeightChangeKg < 0
                      ? `增 ${Math.abs(recommendation.totalWeightChangeKg)} kg`
                      : '维持'}
                </dd>
              </div>
              <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <dt>计划每日变化</dt>
                <dd className="font-medium tabular-nums text-slate-800">
                  {formatDailyWeight(recommendation.plannedDailyWeightChangeKg)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <dt>按热量预估每日</dt>
                <dd className="font-medium tabular-nums text-slate-800">
                  {formatDailyWeight(recommendation.effectiveDailyWeightChangeKg)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <dt>计划周期</dt>
                <dd className="font-medium tabular-nums text-slate-800">
                  {recommendation.planDurationDays} 天
                </dd>
              </div>
              <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <dt>基础代谢 BMR</dt>
                <dd className="font-medium tabular-nums text-slate-800">
                  {recommendation.bmr} kcal
                </dd>
              </div>
              <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <dt>维持热量 TDEE</dt>
                <dd className="font-medium tabular-nums text-slate-800">
                  {recommendation.maintenanceCalories} kcal
                </dd>
              </div>
              <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 sm:col-span-2">
                <dt>体重目标</dt>
                <dd className="font-medium text-slate-800">{recommendation.goalLabel}</dd>
              </div>
              {recommendation.calorieAdjustment !== 0 && (
                <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 sm:col-span-2">
                  <dt>相对维持热量的调整</dt>
                  <dd className="font-medium tabular-nums text-slate-800">
                    {recommendation.calorieAdjustment > 0 ? '+' : ''}
                    {recommendation.calorieAdjustment} kcal/天
                    {recommendation.weeklyWeightChangeKg !== 0 && (
                      <span className="ml-2 text-slate-500">
                        （约 {recommendation.weeklyWeightChangeKg > 0 ? '+' : ''}
                        {recommendation.weeklyWeightChangeKg} kg/周）
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {recipeRecommendations.length > 0 && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
              <h3 className="text-sm font-semibold text-slate-800">推荐食谱</h3>
              <p className="mt-1 text-xs text-slate-500">
                根据{recommendation.goalType === 'lose' ? '减重' : recommendation.goalType === 'gain' ? '增重' : '维持'}
                目标筛选，可在下方膳食计划中用对应食材制作。
              </p>
              <ul className="mt-3 space-y-2">
                {recipeRecommendations.map((item) => (
                  <li
                    key={`${item.meal}-${item.recipeId}`}
                    className="rounded-lg bg-white px-3 py-2 ring-1 ring-emerald-100"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        {MEAL_LABEL[item.meal]}
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        {item.name}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.summary}</p>
                    <p className="mt-0.5 text-xs text-emerald-700">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          请填写完整且合理的身体数据与计划周期（7–365 天）以生成推荐方案。
        </p>
      )}

      {!isBodyProfileComplete(profile) && (
        <p className="mt-2 text-xs text-slate-400">
          参考范围：年龄 10–100，身高 100–250 cm，体重 30–250 kg，周期 7–365 天。
        </p>
      )}
    </section>
  )
}
