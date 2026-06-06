import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  findNutritionEntry,
  getAvailableUnits,
} from '../data/nutritionDictionary'
import type { IngredientInputCategory, MeasureUnit, UserIngredient } from '../types'
import {
  catalogItemFromName,
  filterCatalogItems,
  formatBaseCalorieLabel,
  getDictionaryCatalog,
  type IngredientCatalogItem,
} from '../utils/ingredientCatalog'
import {
  createEmptyIngredient,
  INPUT_CATEGORY_META,
  INPUT_CATEGORY_ORDER,
} from '../utils/ingredientCategory'
import {
  addCustomIngredient,
  createIngredientFromCatalog,
  loadCustomIngredients,
  loadIngredientHistory,
  loadSavedIngredients,
  migrateItemsToSaved,
  pushIngredientHistory,
  type IngredientHistoryEntry,
  type SavedIngredient,
  upsertSavedFromItems,
} from '../utils/ingredientStorage'

const ALL_UNITS: MeasureUnit[] = ['g', 'kg', '个', '片', 'ml', '碗', '勺', '根']

type LibraryTab = 'common' | 'custom'
type PanelMode = 'category' | 'saved' | 'history'

const SIDEBAR_CAT_ACTIVE: Record<IngredientInputCategory, string> = {
  staple: 'bg-amber-100 text-amber-900 ring-amber-200',
  protein: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  veg: 'bg-teal-100 text-teal-900 ring-teal-200',
  oil: 'bg-orange-100 text-orange-900 ring-orange-200',
}

const CARD_EMOJI_BG: Record<IngredientInputCategory, string> = {
  staple: 'bg-amber-50',
  protein: 'bg-emerald-50',
  veg: 'bg-teal-50',
  oil: 'bg-orange-50',
}

interface IngredientInputProps {
  items: UserIngredient[]
  onChange: (items: UserIngredient[]) => void
}

export function IngredientInput({ items, onChange }: IngredientInputProps) {
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('common')
  const [panelMode, setPanelMode] = useState<PanelMode>('category')
  const [activeCategory, setActiveCategory] =
    useState<IngredientInputCategory>('staple')
  const [searchQuery, setSearchQuery] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set())
  const [savedList, setSavedList] = useState<SavedIngredient[]>([])
  const [historyList, setHistoryList] = useState<IngredientHistoryEntry[]>([])
  const [customDefs, setCustomDefs] = useState(loadCustomIngredients())
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')

  const dictionaryCatalog = useMemo(() => getDictionaryCatalog(), [])

  useEffect(() => {
    migrateItemsToSaved(items)
    setSavedList(loadSavedIngredients())
    setHistoryList(loadIngredientHistory())
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSavedList(upsertSavedFromItems(items))
      setHistoryList(pushIngredientHistory(items))
    }, 600)
    return () => window.clearTimeout(t)
  }, [items])

  const countByCategory = useMemo(() => {
    const counts: Record<IngredientInputCategory, number> = {
      staple: 0,
      protein: 0,
      veg: 0,
      oil: 0,
    }
    for (const item of items) {
      if (item.name.trim() && item.quantity > 0) counts[item.category] += 1
    }
    return counts
  }, [items])

  const displayCards = useMemo((): IngredientCatalogItem[] => {
    if (panelMode === 'history') return []

    if (panelMode === 'saved') {
      const savedCards = savedList
        .map((s) => catalogItemFromName(s.name, s.category))
        .filter((c): c is IngredientCatalogItem => c !== null)
      return filterCatalogItems(savedCards, {
        category: activeCategory,
        query: searchQuery,
      })
    }

    if (libraryTab === 'custom') {
      const customCards = customDefs
        .map((c) => catalogItemFromName(c.name, c.category, true))
        .filter((c): c is IngredientCatalogItem => c !== null)
      return filterCatalogItems(customCards, {
        category: activeCategory,
        query: searchQuery,
      })
    }

    return filterCatalogItems(dictionaryCatalog, {
      category: activeCategory,
      query: searchQuery,
    })
  }, [
    panelMode,
    libraryTab,
    savedList,
    customDefs,
    dictionaryCatalog,
    activeCategory,
    searchQuery,
  ])

  const addFromCatalog = useCallback(
    (card: IngredientCatalogItem, qty = 1) => {
      const saved = savedList.find(
        (s) => s.name === card.name && s.category === card.category,
      )
      const existing = items.find(
        (i) => i.name === card.name && i.category === card.category,
      )
      if (existing) {
        onChange(
          items.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + (saved?.lastQuantity ?? qty) }
              : i,
          ),
        )
        return
      }
      onChange([
        ...items,
        createIngredientFromCatalog(
          card.name,
          card.category,
          saved?.lastQuantity ?? qty,
          card.defaultUnit,
        ),
      ])
    },
    [items, onChange, savedList],
  )

  const addBatchSelected = () => {
    for (const key of batchSelected) {
      const card = displayCards.find((c) => cardKey(c) === key)
      if (card) addFromCatalog(card)
    }
    setBatchSelected(new Set())
    setBatchMode(false)
  }

  const importLatestHistory = () => {
    const latest = historyList[0]
    if (!latest) return
    const merged = [...items]
    for (const h of latest.items) {
      const ex = merged.find(
        (i) => i.name === h.name && i.category === h.category,
      )
      if (ex) {
        ex.quantity += h.quantity
      } else {
        merged.push({ ...h, id: crypto.randomUUID() })
      }
    }
    onChange(merged)
  }

  const importHistoryEntry = (entry: IngredientHistoryEntry) => {
    onChange(entry.items.map((i) => ({ ...i, id: crypto.randomUUID() })))
  }

  const updateRow = (id: string, patch: Partial<UserIngredient>) => {
    onChange(
      items.map((row) => {
        if (row.id !== id) return row
        const next = { ...row, ...patch }
        if (patch.name !== undefined) {
          const entry = findNutritionEntry(patch.name)
          if (entry) next.unit = entry.defaultUnit
        }
        return next
      }),
    )
  }

  const removeRow = (id: string) => {
    onChange(items.filter((r) => r.id !== id))
  }

  const handleAddCustom = () => {
    const name = customName.trim()
    if (!name) return
    addCustomIngredient({ name, category: activeCategory })
    setCustomDefs(loadCustomIngredients())
    addFromCatalog(
      catalogItemFromName(name, activeCategory, true)!,
    )
    setCustomName('')
    setShowCustomForm(false)
  }

  const cardKey = (c: IngredientCatalogItem) => `${c.category}::${c.name}`

  return (
    <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-800">食材输入</h2>
        <p className="mt-1 text-xs text-slate-500">
          左侧选分类，右侧点 + 添加；在底部清单调整数量与单位。
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 左侧边栏 */}
        <aside className="flex w-full shrink-0 flex-col border-b border-slate-100 bg-slate-50/80 lg:w-56 lg:border-b-0 lg:border-r">
          <div className="flex border-b border-slate-100 p-2">
            {(
              [
                { id: 'common' as LibraryTab, label: '常用食材' },
                { id: 'custom' as LibraryTab, label: '我的自定义' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setLibraryTab(tab.id)
                  setPanelMode('category')
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                  libraryTab === tab.id && panelMode === 'category'
                    ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 border-b border-slate-100 p-2">
            {(
              [
                { id: 'saved' as PanelMode, label: '已存食材' },
                { id: 'history' as PanelMode, label: '历史记录' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setPanelMode(btn.id)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                  panelMode === btn.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {INPUT_CATEGORY_ORDER.map((cat) => {
              const meta = INPUT_CATEGORY_META[cat]
              const active =
                panelMode === 'category' && activeCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setPanelMode('category')
                    setActiveCategory(cat)
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? `font-semibold ring-1 ${SIDEBAR_CAT_ACTIVE[cat]}`
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <span>{meta.label}</span>
                  <span className="text-xs tabular-nums opacity-70">
                    {countByCategory[cat]}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* 右侧主区 */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 border-b border-slate-100 p-4">
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索食材名称（支持字典别名）"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setBatchMode((v) => !v)
                  setBatchSelected(new Set())
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  batchMode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {batchMode ? '取消批量' : '批量添加'}
              </button>
              {batchMode && batchSelected.size > 0 && (
                <button
                  type="button"
                  onClick={addBatchSelected}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  添加已选 {batchSelected.size} 项
                </button>
              )}
              <button
                type="button"
                onClick={importLatestHistory}
                disabled={historyList.length === 0}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-40"
              >
                导入历史食材
              </button>
              {libraryTab === 'custom' && (
                <button
                  type="button"
                  onClick={() => setShowCustomForm((v) => !v)}
                  className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-800 ring-1 ring-orange-100"
                >
                  + 自定义食材
                </button>
              )}
            </div>

            {showCustomForm && (
              <div className="flex gap-2 rounded-xl bg-orange-50/80 p-3 ring-1 ring-orange-100">
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={`自定义${INPUT_CATEGORY_META[activeCategory].label}名称`}
                  className="flex-1 rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white"
                >
                  保存并添加
                </button>
              </div>
            )}
          </div>

          {/* 卡片列表 / 历史 */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {panelMode === 'history' ? (
              <div className="space-y-2">
                {historyList.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">
                    暂无历史记录，录入食材后会自动保存
                  </p>
                ) : (
                  historyList.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {entry.label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {entry.items.map((i) => i.name).join('、')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => importHistoryEntry(entry)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        导入
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : displayCards.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">
                {searchQuery ? '未找到匹配食材' : '该分类暂无食材'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {displayCards.map((card) => {
                  const key = cardKey(card)
                  const selected = batchSelected.has(key)
                  return (
                    <div
                      key={key}
                      className={`group relative flex flex-col rounded-2xl border bg-white p-3 shadow-sm transition hover:shadow-md ${
                        selected
                          ? 'border-emerald-400 ring-2 ring-emerald-100'
                          : 'border-slate-100'
                      }`}
                    >
                      {batchMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setBatchSelected((prev) => {
                              const next = new Set(prev)
                              if (next.has(key)) next.delete(key)
                              else next.add(key)
                              return next
                            })
                          }}
                          className="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-xs"
                        >
                          {selected ? '✓' : ''}
                        </button>
                      )}
                      <div
                        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${CARD_EMOJI_BG[card.category]}`}
                      >
                        {card.emoji}
                      </div>
                      <p className="mt-2 text-center text-sm font-semibold text-slate-800">
                        {card.name}
                      </p>
                      <p className="mt-0.5 text-center text-xs text-slate-500">
                        {formatBaseCalorieLabel(card)}
                      </p>
                      {!batchMode && (
                        <button
                          type="button"
                          onClick={() => addFromCatalog(card)}
                          className="mt-3 flex h-9 w-full items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white opacity-90 transition group-hover:opacity-100 hover:bg-emerald-500 hover:shadow-md"
                          aria-label={`添加${card.name}`}
                        >
                          +
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 底部录入清单 */}
          <div className="border-t border-slate-200 bg-slate-50/90 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                已添加食材清单
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {INPUT_CATEGORY_ORDER.map((cat) => (
                  <span
                    key={cat}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${INPUT_CATEGORY_META[cat].badgeClass}`}
                  >
                    {INPUT_CATEGORY_META[cat].label} {countByCategory[cat]}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange([...items, createEmptyIngredient(activeCategory)])
                }
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
              >
                + 手动添加本类食材
              </button>
            </div>

            {items.length === 0 ? (
              <p className="rounded-xl bg-white py-6 text-center text-xs text-slate-400">
                从上方选择食材并点击 + 添加
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {items.map((row) => {
                  const entry = findNutritionEntry(row.name)
                  const units = entry ? getAvailableUnits(entry) : ALL_UNITS
                  const meta = INPUT_CATEGORY_META[row.category]
                  const card = catalogItemFromName(row.name, row.category)

                  return (
                    <div
                      key={row.id}
                      className="grid gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[auto_1fr_80px_72px_36px]"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                        title={meta.label}
                      >
                        {card?.emoji ?? '📦'}
                      </div>
                      <div>
                        <input
                          value={row.name}
                          onChange={(e) =>
                            updateRow(row.id, { name: e.target.value })
                          }
                          placeholder="食材名称"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                        <span
                          className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div>
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
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          aria-label="删除"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
