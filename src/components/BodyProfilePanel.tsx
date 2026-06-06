import { useMemo } from 'react'
import type { BodyProfile, Gender } from '../types'
import {
  ACTIVITY_OPTIONS,
  isBodyProfileComplete,
  recommendDailyCalories,
} from '../utils/calorieRecommendation'

interface BodyProfilePanelProps {
  profile: BodyProfile
  onChange: (profile: BodyProfile) => void
  appliedCalories?: number
  onApplyRecommended: (calories: number) => void
}

export function BodyProfilePanel({
  profile,
  onChange,
  appliedCalories,
  onApplyRecommended,
}: BodyProfilePanelProps) {
  const set = <K extends keyof BodyProfile>(key: K, value: BodyProfile[K]) => {
    onChange({ ...profile, [key]: value })
  }

  const recommendation = useMemo(
    () => recommendDailyCalories(profile),
    [profile],
  )

  const isApplied =
    recommendation != null && appliedCalories === recommendation.recommendedCalories

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'

  return (
    <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/40 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">身体信息与热量推荐</h2>
        <p className="mt-1 text-xs text-slate-500">
          填写基础数据后，将按 Mifflin-St Jeor 公式与活动量估算每日推荐摄入。
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
              onClick={() => onApplyRecommended(recommendation.recommendedCalories)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isApplied
                  ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {isApplied ? '已采用推荐热量' : '采用推荐热量'}
            </button>
          </div>

          <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
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
      ) : (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          请填写完整且合理的身体数据以生成推荐热量。
        </p>
      )}

      {!isBodyProfileComplete(profile) && (
        <p className="mt-2 text-xs text-slate-400">
          参考范围：年龄 10–100，身高 100–250 cm，体重 30–250 kg。
        </p>
      )}
    </section>
  )
}
