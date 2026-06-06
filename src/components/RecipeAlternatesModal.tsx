import type { CookingSuggestion } from '../types'

interface RecipeAlternatesModalProps {
  open: boolean
  groupTitle: string
  alternates: CookingSuggestion[]
  onClose: () => void
}

function RecipeBody({
  dishName,
  summary,
  steps,
}: {
  dishName: string
  summary: string
  steps: string[]
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <p className="text-sm font-semibold text-slate-800">{dishName}</p>
      <p className="mt-1 text-xs text-slate-600">{summary}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-500">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  )
}

export function RecipeAlternatesModal({
  open,
  groupTitle,
  alternates,
  onClose,
}: RecipeAlternatesModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 id="modal-title" className="text-sm font-semibold text-slate-800">
            更多食谱 · {groupTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            关闭
          </button>
        </div>
        <div className="space-y-2">
          {alternates.map((alt) => (
            <RecipeBody
              key={alt.recipeId}
              dishName={alt.dishName}
              summary={alt.summary}
              steps={alt.steps}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
