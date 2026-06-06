import { useMemo } from 'react'
import {
  findNutritionEntry,
  getAvailableUnits,
  getIngredientNames,
} from '../data/nutritionDictionary'
import type { MeasureUnit, UserIngredient } from '../types'

const ALL_UNITS: MeasureUnit[] = ['g', 'kg', '个', '片', 'ml', '碗', '勺', '根']

interface IngredientInputProps {
  items: UserIngredient[]
  onChange: (items: UserIngredient[]) => void
}

function createEmptyRow(): UserIngredient {
  return {
    id: crypto.randomUUID(),
    name: '',
    quantity: 1,
    unit: 'g',
  }
}

export function IngredientInput({ items, onChange }: IngredientInputProps) {
  const suggestions = useMemo(() => getIngredientNames(), [])

  const updateRow = (id: string, patch: Partial<UserIngredient>) => {
    onChange(
      items.map((row) => {
        if (row.id !== id) return row
        const next = { ...row, ...patch }
        if (patch.name !== undefined) {
          const entry = findNutritionEntry(patch.name)
          if (entry) {
            next.unit = entry.defaultUnit
          }
        }
        return next
      }),
    )
  }

  const addRow = () => onChange([...items, createEmptyRow()])

  const removeRow = (id: string) => {
    if (items.length <= 1) {
      onChange([createEmptyRow()])
      return
    }
    onChange(items.filter((r) => r.id !== id))
  }

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">食材输入</h2>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          + 添加食材
        </button>
      </div>

      <div className="space-y-3">
        {items.map((row, index) => {
          const entry = findNutritionEntry(row.name)
          const units = entry ? getAvailableUnits(entry) : ALL_UNITS

          return (
            <div
              key={row.id}
              className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-[1fr_80px_72px_36px]"
            >
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  名称 {index === 0 && <span className="text-slate-400">（支持字典匹配）</span>}
                </label>
                <input
                  list="ingredient-suggestions"
                  value={row.name}
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                  placeholder="如：鸡蛋、牛肉"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">数量</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={row.quantity || ''}
                  onChange={(e) =>
                    updateRow(row.id, { quantity: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">单位</label>
                <select
                  value={row.unit}
                  onChange={(e) =>
                    updateRow(row.id, { unit: e.target.value as MeasureUnit })
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-center pb-1">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  title="删除"
                  aria-label="删除食材"
                >
                  ×
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <datalist id="ingredient-suggestions">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </section>
  )
}
