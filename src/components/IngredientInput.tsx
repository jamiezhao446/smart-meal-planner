import { useMemo, useState } from 'react'
import {
  findNutritionEntry,
  getAvailableUnits,
} from '../data/nutritionDictionary'
import type { IngredientInputCategory, MeasureUnit, UserIngredient } from '../types'
import {
  createEmptyIngredient,
  getIngredientNamesForCategory,
  INPUT_CATEGORY_META,
  INPUT_CATEGORY_ORDER,
} from '../utils/ingredientCategory'

const ALL_UNITS: MeasureUnit[] = ['g', 'kg', '个', '片', 'ml', '碗', '勺', '根']

interface IngredientInputProps {
  items: UserIngredient[]
  onChange: (items: UserIngredient[]) => void
}

export function IngredientInput({ items, onChange }: IngredientInputProps) {
  const [collapsed, setCollapsed] = useState<Record<IngredientInputCategory, boolean>>({
    staple: false,
    protein: false,
    veg: false,
    oil: false,
  })

  const namesByCategory = useMemo(
    () =>
      Object.fromEntries(
        INPUT_CATEGORY_ORDER.map((cat) => [cat, getIngredientNamesForCategory(cat)]),
      ) as Record<IngredientInputCategory, string[]>,
    [],
  )

  const countByCategory = useMemo(() => {
    const counts: Record<IngredientInputCategory, number> = {
      staple: 0,
      protein: 0,
      veg: 0,
      oil: 0,
    }
    for (const item of items) {
      if (item.name.trim() && item.quantity > 0) {
        counts[item.category] += 1
      }
    }
    return counts
  }, [items])

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

  const addRow = (category: IngredientInputCategory) => {
    onChange([...items, createEmptyIngredient(category)])
  }

  const removeRow = (id: string) => {
    onChange(items.filter((r) => r.id !== id))
  }

  const togglePanel = (category: IngredientInputCategory) => {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">食材输入</h2>
        <p className="mt-1 text-xs text-slate-500">
          按分类录入食材，支持字典匹配；新增时请先选择分类再填写。
        </p>
      </div>

      <div className="space-y-3">
        {INPUT_CATEGORY_ORDER.map((category) => {
          const meta = INPUT_CATEGORY_META[category]
          const categoryItems = items.filter((item) => item.category === category)
          const isCollapsed = collapsed[category]
          const count = countByCategory[category]

          return (
            <div
              key={category}
              className={`overflow-hidden rounded-xl border ${meta.panelClass}`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => togglePanel(category)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-expanded={!isCollapsed}
                >
                  <span
                    className={`shrink-0 text-xs transition ${isCollapsed ? '' : 'rotate-90'}`}
                    aria-hidden
                  >
                    ▶
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {meta.label}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badgeClass}`}
                  >
                    {count} 项
                  </span>
                  <span className="hidden truncate text-xs text-slate-400 sm:inline">
                    {meta.hint}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => addRow(category)}
                  className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-700"
                >
                  + 添加本类食材
                </button>
              </div>

              {!isCollapsed && (
                <div className="space-y-2 border-t border-white/80 px-3 py-3">
                  {categoryItems.length === 0 ? (
                    <p className="rounded-lg bg-white/70 px-3 py-4 text-center text-xs text-slate-400">
                      暂无{meta.label}，点击右上角添加
                    </p>
                  ) : (
                    categoryItems.map((row, index) => {
                      const entry = findNutritionEntry(row.name)
                      const units = entry ? getAvailableUnits(entry) : ALL_UNITS
                      const listId = `ingredient-suggestions-${category}`

                      return (
                        <div
                          key={row.id}
                          className="grid gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[1fr_80px_72px_36px]"
                        >
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              名称{' '}
                              {index === 0 && (
                                <span className="text-slate-400">（支持字典匹配）</span>
                              )}
                            </label>
                            <input
                              list={listId}
                              value={row.name}
                              onChange={(e) =>
                                updateRow(row.id, { name: e.target.value })
                              }
                              placeholder={`如：${meta.hint.split('、')[0]}`}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            />
                            <datalist id={listId}>
                              {namesByCategory[category].map((name) => (
                                <option key={name} value={name} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              数量
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={row.quantity || ''}
                              onChange={(e) =>
                                updateRow(row.id, {
                                  quantity: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              单位
                            </label>
                            <select
                              value={row.unit}
                              onChange={(e) =>
                                updateRow(row.id, {
                                  unit: e.target.value as MeasureUnit,
                                })
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
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
