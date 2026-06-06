import { useState } from 'react'
import type { RecipeGroupDisplay } from '../types'
import { RecipeAlternatesModal } from './RecipeAlternatesModal'

interface RecipeGroupCardProps {
  group: RecipeGroupDisplay
}

export function RecipeGroupCard({ group }: RecipeGroupCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const altCount = group.alternates.length

  return (
    <>
      <div className="rounded-xl border border-amber-100/90 bg-amber-50/40 shadow-sm">
        <div className="border-b border-amber-100/60 px-3 py-1.5">
          <span className="text-[11px] font-medium text-amber-800/80">
            {group.title}
          </span>
        </div>
        <div className="border-b border-amber-100/50 px-3 py-2.5">
          <p className="text-sm font-semibold text-amber-900">
            {group.featured.dishName}
          </p>
          <p className="mt-1 text-xs text-amber-800/90">{group.featured.summary}</p>
          <ol className="mt-2 list-decimal space-y-1 border-t border-amber-100/80 pt-2 pl-4 text-xs text-slate-600">
            {group.featured.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        {altCount > 0 && (
          <div className="flex justify-end px-3 py-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-800 shadow-sm transition hover:bg-amber-50"
            >
              查看更多食谱（{altCount}）
            </button>
          </div>
        )}
      </div>

      <RecipeAlternatesModal
        open={modalOpen}
        groupTitle={group.title}
        alternates={group.alternates}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
