import type { PlanSummary } from '../types'

interface CalorieDashboardProps {
  plan: PlanSummary
  mealsPerDay: number
}

function formatKcal(value: number) {
  return `${value.toLocaleString('zh-CN')}`
}

export function CalorieDashboard({ plan, mealsPerDay }: CalorieDashboardProps) {
  const {
    totalIngredientCalories,
    totalTargetCalories,
    dailyAverageCalories,
    dailyTargetCalories,
    calorieGap,
    slots,
  } = plan

  const perMealAverage =
    slots.length > 0
      ? slots.reduce((s, slot) => s + slot.slotCalories, 0) / slots.length
      : 0

  const percentOfTarget =
    totalTargetCalories > 0
      ? Math.min(150, (totalIngredientCalories / totalTargetCalories) * 100)
      : 0

  const gapLabel =
    calorieGap > 0 ? '超出目标' : calorieGap < 0 ? '低于目标' : '刚好达标'
  const gapColor =
    calorieGap > 0
      ? 'text-amber-700 bg-amber-50'
      : calorieGap < 0
        ? 'text-blue-700 bg-blue-50'
        : 'text-emerald-700 bg-emerald-50'

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">热量看板</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white shadow-md">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            规划期总合计
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-300">
            {formatKcal(totalIngredientCalories)}
            <span className="ml-1 text-sm font-normal text-slate-400">kcal</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            目标 {formatKcal(totalTargetCalories)} kcal · 完成 {percentOfTarget.toFixed(0)}%
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${Math.min(100, percentOfTarget)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            单餐热量（均）
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-900">
            {formatKcal(Math.round(perMealAverage * 10) / 10)}
            <span className="ml-1 text-sm font-normal text-emerald-600">kcal/餐</span>
          </p>
          <p className="mt-1 text-xs text-emerald-700/80">
            日均食材 {formatKcal(Math.round(dailyAverageCalories * 10) / 10)} kcal ·
            目标 {formatKcal(dailyTargetCalories)}/天 · {mealsPerDay} 餐
          </p>
        </div>
      </div>

      <div className={`rounded-xl px-4 py-3 text-sm ${gapColor}`}>
        <span className="font-medium">{gapLabel}</span>
        <span className="ml-2 font-bold tabular-nums">
          {calorieGap > 0 ? '+' : ''}
          {formatKcal(calorieGap)} kcal
        </span>
        <span className="text-xs opacity-80">（相对规划期总目标）</span>
      </div>
    </section>
  )
}
