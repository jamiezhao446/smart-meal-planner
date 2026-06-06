import { useState } from 'react'
import type { MealSlot, PlanSummary } from '../types'
import { IngredientTagGroups } from './IngredientTagGroups'
import { RecipeGroupCard } from './RecipeGroupCard'

interface MealPlanBoardProps {
  plan: PlanSummary
  days: number
  completedMeals: Set<string>
  onToggleComplete: (slotId: string) => void
}

function groupByDay(slots: MealSlot[]): Map<number, MealSlot[]> {
  const map = new Map<number, MealSlot[]>()
  for (const slot of slots) {
    const list = map.get(slot.day) ?? []
    list.push(slot)
    map.set(slot.day, list)
  }
  return map
}

export function MealPlanBoard({
  plan,
  days,
  completedMeals,
  onToggleComplete,
}: MealPlanBoardProps) {
  const byDay = groupByDay(plan.slots)

  if (plan.slots.length === 0 || plan.totalIngredientCalories === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
        <p>请在左侧添加有效食材后，查看按天、按餐的分配结果。</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">每日餐单规划</h2>
      <p className="text-xs text-slate-500">
        食材拆分至多餐 · 早28% 午37% 晚35% · 主食互斥
      </p>
      {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
        const daySlots = byDay.get(day) ?? []
        const dayCalories = daySlots.reduce((s, slot) => s + slot.slotCalories, 0)

        return (
          <article
            key={day}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <header className="flex items-center justify-between border-b border-slate-100 bg-emerald-50/60 px-4 py-3">
              <h3 className="font-semibold text-emerald-900">Day {day}</h3>
              <span className="text-sm font-bold tabular-nums text-emerald-700">
                {Math.round(dayCalories * 10) / 10} kcal
              </span>
            </header>
            <div className="space-y-0">
              {daySlots.map((slot) => (
                <MealSlotCard
                  key={slot.slotId}
                  slot={slot}
                  done={completedMeals.has(slot.slotId)}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </article>
        )
      })}
    </section>
  )
}

function MealSlotCard({
  slot,
  done,
  onToggleComplete,
}: {
  slot: MealSlot
  done: boolean
  onToggleComplete: (id: string) => void
}) {
  const [recipesOpen, setRecipesOpen] = useState(false)
  const mealLabel = slot.meal === 1 ? '早餐' : slot.meal === 2 ? '午餐' : slot.meal === 3 ? '晚餐' : `第 ${slot.meal} 餐`
  const hasRecipes = (slot.recipeGroups?.length ?? 0) > 0

  return (
    <div
      className={`border-t border-slate-100 transition ${done ? 'bg-emerald-50/30' : 'bg-white'}`}
    >
      <div className="bg-gradient-to-r from-slate-100/90 to-slate-50/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={done}
              onChange={() => onToggleComplete(slot.slotId)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span
              className={`text-base font-semibold ${done ? 'text-emerald-700 line-through' : 'text-slate-800'}`}
            >
              第 {slot.meal} 餐 · {mealLabel}
            </span>
            {done && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                已完成
              </span>
            )}
          </label>
          <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-sm font-bold tabular-nums text-emerald-800 shadow-sm ring-1 ring-emerald-100">
            {slot.slotCalories} kcal
          </span>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        {slot.balanceNote && (
          <p className="mb-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
            {slot.balanceNote}
          </p>
        )}

        {slot.items.length === 0 ? (
          <p className="text-xs text-slate-400">本餐暂无分配。</p>
        ) : (
          <IngredientTagGroups items={slot.items} />
        )}

        {hasRecipes && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setRecipesOpen((v) => !v)}
              className="w-full rounded-lg border border-amber-200 bg-amber-50/60 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100/80"
            >
              {recipesOpen ? '收起推荐菜谱' : '查看推荐菜谱'}
            </button>

            {recipesOpen && (
              <div className="mt-3 space-y-3">
                {slot.recipeGroups!.map((group) => (
                  <RecipeGroupCard key={group.groupKey} group={group} />
                ))}
              </div>
            )}
          </div>
        )}

        {!hasRecipes && slot.items.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">暂无匹配菜谱。</p>
        )}
      </div>
    </div>
  )
}
