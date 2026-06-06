import { useMemo } from 'react'
import type { UserIngredient } from '../types'
import { analyzeNutrition } from '../utils/nutritionAnalysis'

interface NutritionAnalysisPanelProps {
  ingredients: UserIngredient[]
  hasPlan: boolean
}

function MacroRing({
  label,
  percent,
  color,
  range,
}: {
  label: string
  percent: number
  color: string
  range: string
}) {
  const r = 28
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(percent, 100) / 100) * c

  return (
    <div className="flex flex-col items-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <p className="mt-1 text-xs font-bold text-slate-800">{percent}%</p>
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-[10px] text-slate-400">{range}</p>
    </div>
  )
}

function MacroBar({
  label,
  percent,
  color,
  ok,
}: {
  label: string
  percent: number
  color: string
  ok: boolean
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className={ok ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'}>
          {percent}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function NutritionAnalysisPanel({
  ingredients,
  hasPlan,
}: NutritionAnalysisPanelProps) {
  const analysis = useMemo(() => analyzeNutrition(ingredients), [ingredients])

  if (!hasPlan) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
        录入食材并生成配餐后，将自动显示全天营养分析。
      </section>
    )
  }

  const { totals, energyPercent, suggestions } = analysis
  const carbOk =
    energyPercent.carbs >= 55 && energyPercent.carbs <= 65
  const proteinOk =
    energyPercent.protein >= 10 && energyPercent.protein <= 20
  const fatOk = energyPercent.fat >= 20 && energyPercent.fat <= 30

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-800">营养分析</h2>
      <p className="mb-4 text-xs text-slate-500">
        全天总量 · 对照国标供能占比（碳水 55–65%、蛋白 10–20%、脂肪 20–30%）
      </p>

      <div className="mb-4 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
        <div>
          <p className="text-slate-500">蛋白质</p>
          <p className="text-lg font-bold text-sky-700">{totals.proteinG}g</p>
        </div>
        <div>
          <p className="text-slate-500">碳水</p>
          <p className="text-lg font-bold text-amber-700">{totals.carbsG}g</p>
        </div>
        <div>
          <p className="text-slate-500">脂肪</p>
          <p className="text-lg font-bold text-orange-600">{totals.fatG}g</p>
        </div>
        <div>
          <p className="text-slate-500">膳食纤维</p>
          <p className="text-lg font-bold text-emerald-700">{totals.fiberG}g</p>
        </div>
      </div>

      <div className="mb-4 flex justify-around rounded-xl border border-slate-100 py-3">
        <MacroRing
          label="碳水"
          percent={energyPercent.carbs}
          color="#d97706"
          range="55-65%"
        />
        <MacroRing
          label="蛋白"
          percent={energyPercent.protein}
          color="#0284c7"
          range="10-20%"
        />
        <MacroRing
          label="脂肪"
          percent={energyPercent.fat}
          color="#ea580c"
          range="20-30%"
        />
      </div>

      <div className="mb-4 space-y-2">
        <MacroBar
          label="碳水供能"
          percent={energyPercent.carbs}
          color="#f59e0b"
          ok={carbOk}
        />
        <MacroBar
          label="蛋白供能"
          percent={energyPercent.protein}
          color="#0ea5e9"
          ok={proteinOk}
        />
        <MacroBar
          label="脂肪供能"
          percent={energyPercent.fat}
          color="#f97316"
          ok={fatOk}
        />
      </div>

      <div className="rounded-xl bg-violet-50/80 p-3">
        <p className="mb-2 text-xs font-semibold text-violet-900">整改建议</p>
        <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
          {suggestions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
