import {
  CATEGORY_LABEL,
  CATEGORY_TAG_CLASS,
  getIngredientCategory,
} from '../data/nutritionCategories'
import type { MealSlotAllocation, NutritionCategory } from '../types'
import { formatQuantityDisplay } from '../utils/quantityFormat'

const GROUP_ORDER: NutritionCategory[] = ['carb', 'protein', 'vegetable', 'other']

interface IngredientTagGroupsProps {
  items: MealSlotAllocation[]
}

export function IngredientTagGroups({ items }: IngredientTagGroupsProps) {
  const byCat = new Map<NutritionCategory, MealSlotAllocation[]>()

  for (const item of items) {
    const cat = item.nutritionId
      ? getIngredientCategory(item.nutritionId)
      : 'other'
    const list = byCat.get(cat) ?? []
    list.push(item)
    byCat.set(cat, list)
  }

  return (
    <div className="mb-3 space-y-2">
      {GROUP_ORDER.map((cat) => {
        const list = byCat.get(cat)
        if (!list?.length) return null
        return (
          <div key={cat} className="flex flex-wrap items-center gap-1.5">
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${CATEGORY_TAG_CLASS[cat]}`}
            >
              {CATEGORY_LABEL[cat]}
            </span>
            {list.map((item) => (
              <span
                key={`${item.name}-${item.unit}`}
                className={`rounded-lg px-2.5 py-1 text-xs ring-1 ${CATEGORY_TAG_CLASS[cat]}`}
              >
                {item.name}{' '}
                <span className="font-semibold">
                  {formatQuantityDisplay(item.quantity, item.unit)}
                </span>
                <span className="ml-1 opacity-70">({item.calories} kcal)</span>
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}
