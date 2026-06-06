import type { GoalSettings } from '../types'

interface GoalSettingsPanelProps {
  goals: GoalSettings
  onChange: (goals: GoalSettings) => void
  recommendedCalories?: number
}

export function GoalSettingsPanel({
  goals,
  onChange,
  recommendedCalories,
}: GoalSettingsPanelProps) {
  const set = <K extends keyof GoalSettings>(key: K, value: GoalSettings[K]) => {
    onChange({ ...goals, [key]: value })
  }

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">目标设置</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">规划天数</span>
          <input
            type="number"
            min={1}
            max={30}
            value={goals.days}
            onChange={(e) => set('days', Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">每日餐数</span>
          <input
            type="number"
            min={1}
            max={6}
            value={goals.mealsPerDay}
            onChange={(e) =>
              set('mealsPerDay', Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            每日目标热量 (kcal)
          </span>
          <input
            type="number"
            min={500}
            step={50}
            value={goals.dailyCalorieTarget}
            onChange={(e) =>
              set('dailyCalorieTarget', Math.max(0, parseInt(e.target.value, 10) || 0))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          {recommendedCalories != null &&
            goals.dailyCalorieTarget !== recommendedCalories && (
              <button
                type="button"
                onClick={() => set('dailyCalorieTarget', recommendedCalories)}
                className="mt-1 text-xs text-sky-600 hover:text-sky-800"
              >
                使用推荐值 {recommendedCalories} kcal
              </button>
            )}
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        共 {goals.days * goals.mealsPerDay} 个餐次；每天总摄入固定，每餐按营养配比均衡分配。
      </p>
    </section>
  )
}
