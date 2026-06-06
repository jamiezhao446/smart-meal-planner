import type { MealNutritionProfile } from '../types'

const PROFILE_OPTIONS: {
  value: MealNutritionProfile
  label: string
  description: string
}[] = [
  {
    value: 'balanced',
    label: '均衡膳食',
    description: '每餐尽量包含蛋白质、蔬菜与碳水主食。',
  },
  {
    value: 'no-carb',
    label: '不吃碳水',
    description: '不分配米饭/面包等碳水，推荐低碳水菜谱。',
  },
  {
    value: 'high-protein',
    label: '高蛋白',
    description: '优先分配肉蛋豆，菜谱侧重蛋白质。',
  },
  {
    value: 'low-fat',
    label: '少油低脂',
    description: '减少油炸炖肥，推荐蒸、煮、清炒做法。',
  },
]

interface NutritionPreferencePanelProps {
  profile: MealNutritionProfile
  onChange: (profile: MealNutritionProfile) => void
}

export function NutritionPreferencePanel({
  profile,
  onChange,
}: NutritionPreferencePanelProps) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-800">每餐营养配比</h2>
      <p className="mb-4 text-xs text-slate-500">个性化选择后，分餐与菜谱将自动调整。</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PROFILE_OPTIONS.map((opt) => {
          const active = profile === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                active
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                  : 'border-slate-200 bg-slate-50/50 hover:border-emerald-200'
              }`}
            >
              <span className="block text-sm font-medium text-slate-800">{opt.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{opt.description}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
