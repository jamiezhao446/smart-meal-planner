export type AppTab = 'plan' | 'ingredients' | 'meals'

const TABS: { id: AppTab; label: string }[] = [
  { id: 'plan', label: '身体信息与减重计划' },
  { id: 'ingredients', label: '食材录入' },
  { id: 'meals', label: '智能配餐' },
]

interface AppTabNavProps {
  active: AppTab
  onChange: (tab: AppTab) => void
}

export function AppTabNav({ active, onChange }: AppTabNavProps) {
  return (
    <nav
      className="border-b border-slate-200/80 bg-white/95 backdrop-blur"
      aria-label="功能模块"
    >
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {TABS.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
