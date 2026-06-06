import {
  getIngredientCategory,
  isBreakfastDairy,
  isBreakfastStaple,
  isLunchDinnerMeat,
  isLunchDinnerStapleSplit,
  isStapleCarb,
  NO_BREAKFAST_STAPLE_IDS,
} from '../data/nutritionCategories'
import { findNutritionEntry } from '../data/nutritionDictionary'
import type {
  MealNutritionProfile,
  MeasureUnit,
  NutritionCategory,
  ResolvedIngredient,
} from '../types'
import { HALF_STEP_UNITS, roundDisplayQuantity } from './quantityFormat'

export function mealCalorieRatios(mealsPerDay: number): number[] {
  if (mealsPerDay <= 0) return []
  if (mealsPerDay === 1) return [1]
  if (mealsPerDay === 2) return [0.4, 0.6]
  if (mealsPerDay === 3) return [0.28, 0.37, 0.35]
  const breakfast = 0.28
  const rest = (1 - breakfast) / (mealsPerDay - 1)
  return [breakfast, ...Array(mealsPerDay - 1).fill(rest)]
}

export interface DayCategoryStock {
  protein: boolean
  carb: boolean
  vegetable: boolean
}

interface DayPortion {
  ing: ResolvedIngredient
  dailyQty: number
}

export function caloriesForQuantity(
  ing: ResolvedIngredient,
  quantity: number,
): number {
  const entry = findNutritionEntry(ing.name)
  if (!entry || quantity <= 0) return 0
  const conv = entry.unitConversions.find((c) => c.unit === ing.unit)
  if (!conv) return 0
  const grams = quantity * conv.gramsPerUnit
  return Math.round(((grams / 100) * entry.caloriesPer100g) * 10) / 10
}

function slotKey(day: number, meal: number, nutritionId: string): string {
  return `${day}-${meal}::${nutritionId}`
}

function categoriesForProfile(profile: MealNutritionProfile): NutritionCategory[] {
  switch (profile) {
    case 'no-carb':
      return ['protein', 'vegetable']
    default:
      return ['protein', 'vegetable', 'carb']
  }
}

function shouldIncludeIngredient(
  ing: ResolvedIngredient,
  profile: MealNutritionProfile,
): boolean {
  const cat = getIngredientCategory(ing.nutritionId)
  if (profile === 'no-carb' && cat === 'carb') return false
  return categoriesForProfile(profile).includes(cat) || cat === 'other'
}

function mealHasStaple(
  day: number,
  meal: number,
  store: Map<string, number>,
  carbIngs: ResolvedIngredient[],
): boolean {
  return carbIngs.some(
    (ing) => (store.get(slotKey(day, meal, ing.nutritionId)) ?? 0) > 0,
  )
}

function canAssignStapleToMeal(
  day: number,
  meal: number,
  ing: ResolvedIngredient,
  store: Map<string, number>,
  carbIngs: ResolvedIngredient[],
): boolean {
  if (!isStapleCarb(ing.nutritionId)) return true
  if (meal === 1 && NO_BREAKFAST_STAPLE_IDS.has(ing.nutritionId)) return false
  if (mealHasStaple(day, meal, store, carbIngs)) {
    const existing = carbIngs.find(
      (c) => (store.get(slotKey(day, meal, c.nutritionId)) ?? 0) > 0,
    )
    return existing?.nutritionId === ing.nutritionId
  }
  return true
}

function addQty(
  store: Map<string, number>,
  day: number,
  meal: number,
  ing: ResolvedIngredient,
  qty: number,
): void {
  if (qty <= 0) return
  const k = slotKey(day, meal, ing.nutritionId)
  store.set(k, roundDisplayQuantity((store.get(k) ?? 0) + qty, ing.unit))
}

function mealCaloriesForDay(
  day: number,
  mealsPerDay: number,
  store: Map<string, number>,
  eligible: ResolvedIngredient[],
): number[] {
  const cals = new Array(mealsPerDay).fill(0)
  for (const ing of eligible) {
    for (let m = 1; m <= mealsPerDay; m++) {
      const q = store.get(slotKey(day, m, ing.nutritionId)) ?? 0
      cals[m - 1] += caloriesForQuantity(ing, q)
    }
  }
  return cals
}

export function splitTotalAcrossDays(
  total: number,
  days: number,
  unit: MeasureUnit,
): number[] {
  if (days <= 0 || total <= 0) return []

  if (HALF_STEP_UNITS.includes(unit)) {
    const totalHalf = Math.round(total * 2)
    const base = Math.floor(totalHalf / days)
    const extra = totalHalf % days
    return Array.from({ length: days }, (_, i) => (base + (i < extra ? 1 : 0)) / 2)
  }

  const roundedTotal = Math.round(total)
  const base = Math.floor(roundedTotal / days)
  const extra = roundedTotal - base * days
  return Array.from({ length: days }, (_, i) => base + (i < extra ? 1 : 0))
}

/** 个/片优先整数分配，避免 0.5 片面包 */
function splitPracticalChunks(
  ing: ResolvedIngredient,
  totalQty: number,
  mealCount: number,
): number[] {
  if (totalQty <= 0 || mealCount <= 0) return []

  if (HALF_STEP_UNITS.includes(ing.unit)) {
    const whole = Math.round(totalQty)
    if (whole >= mealCount) {
      const base = Math.floor(whole / mealCount)
      const extra = whole % mealCount
      return Array.from({ length: mealCount }, (_, i) => base + (i < extra ? 1 : 0))
    }
    if (whole >= 1) {
      const chunks = Array(mealCount).fill(0)
      for (let i = 0; i < whole; i++) {
        chunks[i % mealCount] += 1
      }
      return chunks.filter((c) => c > 0)
    }
    return whole > 0 ? [whole] : []
  }

  const totalG = Math.round(ing.unit === 'kg' ? totalQty * 1000 : totalQty)
  if (totalG <= 0) return []

  const minChunk =
    ing.nutritionId === 'tofu' || ing.nutritionId === 'chicken-breast'
      ? 80
      : ing.nutritionId === 'rice'
        ? 100
        : ing.nutritionId === 'milk'
          ? 120
          : 50

  const parts = Math.min(mealCount, Math.max(1, Math.floor(totalG / minChunk)))
  const base = Math.floor(totalG / parts)
  const extra = totalG % parts
  const grams = Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0))

  if (ing.unit === 'kg') {
    return grams.map((g) => roundDisplayQuantity(g / 1000, ing.unit))
  }
  return grams.map((g) => roundDisplayQuantity(g, ing.unit))
}

function getQty(store: Map<string, number>, day: number, meal: number, id: string) {
  return store.get(slotKey(day, meal, id)) ?? 0
}

/** 午/晚餐热量占比（相对午+晚合计），用于拆分米饭、肉类等 */
function lunchShareOfMainMeals(mealsPerDay: number): number {
  const ratios = mealCalorieRatios(mealsPerDay)
  if (mealsPerDay < 3) return 0.5
  const lunch = ratios[1] ?? 0.37
  const dinner = ratios[2] ?? 0.35
  return lunch / (lunch + dinner)
}

const LUNCH_MEAL = 2
const DINNER_MEAL = 3

function lunchDinnerMeals(mealsPerDay: number): number[] {
  return [LUNCH_MEAL, DINNER_MEAL].filter((m) => m <= mealsPerDay)
}

/** 将当日份量按实用最小块拆到午餐、晚餐两餐 */
function splitAcrossLunchDinner(
  ing: ResolvedIngredient,
  dailyQty: number,
): number[] {
  const meals = lunchDinnerMeals(3)
  if (dailyQty <= 0 || meals.length === 0) return []

  if (meals.length === 1) {
    return [roundDisplayQuantity(dailyQty, ing.unit)]
  }

  const ratio = lunchShareOfMainMeals(3)
  if (HALF_STEP_UNITS.includes(ing.unit)) {
    const whole = Math.round(dailyQty)
    if (whole <= 0) return []
    const lunchWhole = Math.max(0, Math.min(whole, Math.round(whole * ratio)))
    const dinnerWhole = whole - lunchWhole
    if (lunchWhole === 0) return [0, dinnerWhole]
    if (dinnerWhole === 0) return [lunchWhole, 0]
    return [lunchWhole, dinnerWhole]
  }

  const totalG = Math.round(ing.unit === 'kg' ? dailyQty * 1000 : dailyQty)
  if (totalG <= 0) return []

  const minChunk =
    ing.nutritionId === 'rice' || ing.nutritionId === 'noodles'
      ? 80
      : isLunchDinnerMeat(ing.nutritionId)
        ? ing.nutritionId === 'tofu'
          ? 80
          : 50
        : 40

  if (totalG < minChunk * 2) {
    const chunks = splitPracticalChunks(ing, dailyQty, 1)
    return [chunks[0] ?? dailyQty, 0]
  }

  let lunchG = Math.round(totalG * ratio)
  lunchG = Math.max(minChunk, Math.min(totalG - minChunk, lunchG))
  const dinnerG = totalG - lunchG

  const toDisplay = (g: number) =>
    ing.unit === 'kg'
      ? roundDisplayQuantity(g / 1000, ing.unit)
      : roundDisplayQuantity(g, ing.unit)

  return [toDisplay(lunchG), toDisplay(dinnerG)]
}

function assignSplitToLunchDinner(
  day: number,
  mealsPerDay: number,
  ing: ResolvedIngredient,
  dailyQty: number,
  store: Map<string, number>,
): void {
  const targets = lunchDinnerMeals(mealsPerDay)
  const chunks = splitAcrossLunchDinner(ing, dailyQty)
  chunks.forEach((chunk, i) => {
    const meal = targets[i]
    if (meal && chunk > 0) addQty(store, day, meal, ing, chunk)
  })
}

function countProteinTypesInMeal(
  day: number,
  meal: number,
  store: Map<string, number>,
  proteins: ResolvedIngredient[],
): number {
  return proteins.filter((p) => getQty(store, day, meal, p.nutritionId) > 0).length
}

/** 每种蔬菜当天份量只进一餐，多餐轮换不同蔬菜 */
function normalizeVegQty(ing: ResolvedIngredient, qty: number): number {
  if (HALF_STEP_UNITS.includes(ing.unit)) {
    const whole = Math.round(qty)
    return whole > 0 ? whole : (qty > 0 ? 1 : 0)
  }
  return roundDisplayQuantity(qty, ing.unit)
}

function assignVegetablesForDay(
  day: number,
  mealsPerDay: number,
  portions: DayPortion[],
  store: Map<string, number>,
): void {
  const vegPortions = portions.filter(
    (p) => getIngredientCategory(p.ing.nutritionId) === 'vegetable' && p.dailyQty > 0,
  )
  if (vegPortions.length === 0) return

  const offset = (day - 1) % Math.max(1, vegPortions.length)

  if (vegPortions.length >= mealsPerDay) {
    for (let m = 1; m <= mealsPerDay; m++) {
      const p = vegPortions[(m - 1 + offset) % vegPortions.length]
      const qty = normalizeVegQty(p.ing, p.dailyQty)
      addQty(store, day, m, p.ing, qty)
    }
    return
  }

  for (let i = 0; i < vegPortions.length; i++) {
    const p = vegPortions[i]
    const meal = ((i + offset) % mealsPerDay) + 1
    addQty(store, day, meal, p.ing, normalizeVegQty(p.ing, p.dailyQty))
  }

  if (vegPortions.length === 1) {
    const p = vegPortions[0]
    for (let m = 1; m <= mealsPerDay; m++) {
      store.set(slotKey(day, m, p.ing.nutritionId), 0)
    }
    if (mealsPerDay >= 3) {
      const [lunchChunk, dinnerChunk] = splitAcrossLunchDinner(p.ing, p.dailyQty)
      const breakfastShare = Math.max(
        0,
        normalizeVegQty(p.ing, p.dailyQty - lunchChunk - dinnerChunk),
      )
      if (breakfastShare > 0) addQty(store, day, 1, p.ing, breakfastShare)
      if (lunchChunk > 0) addQty(store, day, LUNCH_MEAL, p.ing, lunchChunk)
      if (dinnerChunk > 0) addQty(store, day, DINNER_MEAL, p.ing, dinnerChunk)
    } else {
      const chunks = splitPracticalChunks(p.ing, p.dailyQty, mealsPerDay)
      chunks.forEach((chunk, idx) => {
        const meal = idx + 1
        if (meal <= mealsPerDay) addQty(store, day, meal, p.ing, chunk)
      })
    }
    return
  }

  if (mealsPerDay >= 3 && vegPortions.length === 2) {
    for (let m = 1; m <= mealsPerDay; m++) {
      for (const p of vegPortions) {
        store.delete(slotKey(day, m, p.ing.nutritionId))
      }
    }
    const [v0, v1] = vegPortions
    addQty(store, day, 1, v0.ing, normalizeVegQty(v0.ing, v0.dailyQty))
    const [l0, d0] = splitAcrossLunchDinner(v1.ing, v1.dailyQty)
    if (l0 > 0) addQty(store, day, LUNCH_MEAL, v1.ing, l0)
    if (d0 > 0) addQty(store, day, DINNER_MEAL, v1.ing, d0)
  }
}

/** 鸡蛋：集中在早餐（可多颗），余量放晚餐，午餐不放 */
function assignEggsForDay(
  day: number,
  mealsPerDay: number,
  p: DayPortion,
  store: Map<string, number>,
): void {
  const whole = Math.max(0, Math.round(p.dailyQty))
  if (whole <= 0) return

  const breakfast = 1
  const dinner = mealsPerDay >= 3 ? 3 : mealsPerDay

  if (whole === 1) {
    addQty(store, day, breakfast, p.ing, 1)
    return
  }

  if (whole === 2) {
    addQty(store, day, breakfast, p.ing, 2)
    return
  }

  const atBreakfast = Math.min(2, whole - 1)
  const atDinner = whole - atBreakfast
  addQty(store, day, breakfast, p.ing, atBreakfast)
  if (atDinner > 0 && dinner !== breakfast) {
    addQty(store, day, dinner, p.ing, atDinner)
  }
}

/** 每种蛋白绑定固定餐次，避免鸡蛋/牛奶出现在每一餐 */
function assignProteinsForDay(
  day: number,
  mealsPerDay: number,
  portions: DayPortion[],
  store: Map<string, number>,
  _mealTargets: number[],
): void {
  const proteins = portions
    .filter(
      (p) => getIngredientCategory(p.ing.nutritionId) === 'protein' && p.dailyQty > 0,
    )
    .sort((a, b) => proteinAssignOrder(a.ing.nutritionId) - proteinAssignOrder(b.ing.nutritionId))

  for (const p of proteins) {
    const id = p.ing.nutritionId
    const qty = roundDisplayQuantity(p.dailyQty, p.ing.unit)
    if (qty <= 0) continue

    if (id === 'egg') {
      assignEggsForDay(day, mealsPerDay, p, store)
      continue
    }

    if (isBreakfastDairy(id)) {
      addQty(store, day, 1, p.ing, qty)
      continue
    }

    if (isLunchDinnerMeat(id)) {
      assignSplitToLunchDinner(day, mealsPerDay, p.ing, qty, store)
      continue
    }

    const fallback = [2, 3, 1].find(
      (m) =>
        m <= mealsPerDay &&
        countProteinTypesInMeal(day, m, store, proteins.map((x) => x.ing)) < 2,
    )
    if (fallback) addQty(store, day, fallback, p.ing, qty)
  }
}

function proteinAssignOrder(id: string): number {
  if (id === 'egg') return 0
  if (id === 'milk') return 1
  if (id === 'chicken-breast') return 2
  if (id === 'beef' || id === 'tofu') return 3
  return 4
}

function assignCarbsForDay(
  day: number,
  mealsPerDay: number,
  portions: DayPortion[],
  store: Map<string, number>,
  carbIngs: ResolvedIngredient[],
): void {
  const carbs = portions.filter(
    (p) => isStapleCarb(p.ing.nutritionId) && p.dailyQty > 0,
  )

  for (const p of carbs) {
    if (isLunchDinnerStapleSplit(p.ing.nutritionId)) {
      const qty = roundDisplayQuantity(p.dailyQty, p.ing.unit)
      const [lunchChunk, dinnerChunk] = splitAcrossLunchDinner(p.ing, qty)
      if (
        lunchChunk > 0 &&
        canAssignStapleToMeal(day, LUNCH_MEAL, p.ing, store, carbIngs)
      ) {
        addQty(store, day, LUNCH_MEAL, p.ing, lunchChunk)
      }
      if (
        dinnerChunk > 0 &&
        canAssignStapleToMeal(day, DINNER_MEAL, p.ing, store, carbIngs)
      ) {
        addQty(store, day, DINNER_MEAL, p.ing, dinnerChunk)
      }
      continue
    }

    if (p.ing.nutritionId === 'bread' || p.ing.nutritionId === 'mantou') {
      const whole = Math.round(p.dailyQty)
      if (whole >= 1) {
        addQty(store, day, 1, p.ing, Math.min(whole, 2))
        if (whole > 1 && mealsPerDay >= 2) {
          addQty(store, day, 2, p.ing, whole - Math.min(whole, 2))
        }
      }
      continue
    }

    if (p.ing.nutritionId === 'oats') {
      addQty(store, day, 1, p.ing, roundDisplayQuantity(p.dailyQty, p.ing.unit))
      continue
    }

    if (p.ing.nutritionId === 'sweet-potato' || p.ing.nutritionId === 'corn') {
      const qty = roundDisplayQuantity(p.dailyQty, p.ing.unit)
      const [lunchChunk, dinnerChunk] = splitAcrossLunchDinner(p.ing, qty)
      if (lunchChunk > 0) addQty(store, day, LUNCH_MEAL, p.ing, lunchChunk)
      if (dinnerChunk > 0) addQty(store, day, DINNER_MEAL, p.ing, dinnerChunk)
      continue
    }

    const meals = p.ing.nutritionId === 'potato' ? [2, 3, 1] : [2, 3]
    const usable = meals.filter(
      (m) => m <= mealsPerDay && canAssignStapleToMeal(day, m, p.ing, store, carbIngs),
    )
    const chunks = splitPracticalChunks(p.ing, p.dailyQty, usable.length || 1)
    chunks.forEach((chunk, i) => {
      const meal = usable[i] ?? usable[0] ?? 2
      addQty(store, day, meal, p.ing, chunk)
    })
  }
}

function enforceStapleExclusivity(
  day: number,
  mealsPerDay: number,
  store: Map<string, number>,
  carbIngs: ResolvedIngredient[],
): void {
  for (let m = 1; m <= mealsPerDay; m++) {
    const present = carbIngs.filter(
      (ing) => getQty(store, day, m, ing.nutritionId) > 0,
    )
    if (present.length <= 1) continue

    for (let i = 1; i < present.length; i++) {
      const ing = present[i]
      const qty = getQty(store, day, m, ing.nutritionId)
      store.delete(slotKey(day, m, ing.nutritionId))

      for (let t = 1; t <= mealsPerDay; t++) {
        const target = ((m - 1 + t) % mealsPerDay) + 1
        if (!canAssignStapleToMeal(day, target, ing, store, carbIngs)) continue
        store.set(slotKey(day, target, ing.nutritionId), qty)
        break
      }
    }
  }
}

/** 合并 0.5 片/个 到整数餐次，清除难操作的半份 */
function mergeFractionalUnits(
  day: number,
  mealsPerDay: number,
  store: Map<string, number>,
  eligible: ResolvedIngredient[],
): void {
  for (const ing of eligible) {
    if (!HALF_STEP_UNITS.includes(ing.unit)) continue

    let halfTotal = 0
    const mealQty: { meal: number; qty: number }[] = []
    for (let m = 1; m <= mealsPerDay; m++) {
      const q = getQty(store, day, m, ing.nutritionId)
      if (q > 0) mealQty.push({ meal: m, qty: q })
      halfTotal += Math.round(q * 2)
    }

    if (halfTotal % 2 === 0 && !mealQty.some((x) => x.qty % 1 === 0.5)) continue

    for (let m = 1; m <= mealsPerDay; m++) {
      store.delete(slotKey(day, m, ing.nutritionId))
    }

    const wholes = Math.floor(halfTotal / 2)
    const hasHalf = halfTotal % 2 === 1
    const targetMeals = mealQty.length > 0
      ? mealQty.map((x) => x.meal)
      : [1, 2, 3].filter((m) => m <= mealsPerDay)

    for (let i = 0; i < wholes; i++) {
      addQty(store, day, targetMeals[i % targetMeals.length], ing, 1)
    }
    if (hasHalf && targetMeals.length > 0) {
      addQty(store, day, targetMeals[0], ing, 0.5)
    }
  }
}

function rebalanceTransferOrder(id: string): number {
  if (id === 'rice' || id === 'noodles') return 0
  if (isLunchDinnerMeat(id)) return 1
  if (getIngredientCategory(id) === 'vegetable') return 3
  return 4
}

function canMoveBetweenLunchDinner(ing: ResolvedIngredient): boolean {
  if (ing.nutritionId === 'egg' || isBreakfastDairy(ing.nutritionId)) return false
  if (isBreakfastStaple(ing.nutritionId) || ing.nutritionId === 'bread') return false
  if (ing.nutritionId === 'oats') return false
  return true
}

function minTransferChunk(ing: ResolvedIngredient): number {
  if (HALF_STEP_UNITS.includes(ing.unit)) return 1
  if (ing.nutritionId === 'rice' || ing.nutritionId === 'noodles') return 50
  if (isLunchDinnerMeat(ing.nutritionId)) return 40
  return 30
}

function tryMoveBetweenMeals(
  day: number,
  fromMeal: number,
  toMeal: number,
  ing: ResolvedIngredient,
  store: Map<string, number>,
  carbIngs: ResolvedIngredient[],
): boolean {
  if (!canMoveBetweenLunchDinner(ing)) return false
  if (!canAssignStapleToMeal(day, toMeal, ing, store, carbIngs)) return false

  const fromKey = slotKey(day, fromMeal, ing.nutritionId)
  const qty = store.get(fromKey) ?? 0
  const minChunk = minTransferChunk(ing)
  if (qty <= minChunk) return false

  const transfer = HALF_STEP_UNITS.includes(ing.unit)
    ? 1
    : Math.min(
        qty - minChunk,
        Math.max(minChunk, Math.round((qty * 0.35) / minChunk) * minChunk),
      )
  if (transfer <= 0) return false

  store.set(fromKey, roundDisplayQuantity(qty - transfer, ing.unit))
  addQty(store, day, toMeal, ing, transfer)
  return true
}

function rebalanceDayCalories(
  day: number,
  mealsPerDay: number,
  store: Map<string, number>,
  eligible: ResolvedIngredient[],
  carbIngs: ResolvedIngredient[],
  mealTargets: number[],
): void {
  if (mealsPerDay < 3) return

  const lunchIdx = 1
  const dinnerIdx = 2
  const movable = [...eligible]
    .filter(canMoveBetweenLunchDinner)
    .sort(
      (a, b) =>
        rebalanceTransferOrder(a.nutritionId) - rebalanceTransferOrder(b.nutritionId),
    )

  for (let pass = 0; pass < 16; pass++) {
    const cals = mealCaloriesForDay(day, mealsPerDay, store, eligible)
    const lunchLow = cals[lunchIdx] < mealTargets[lunchIdx] * 0.88
    const lunchHigh = cals[lunchIdx] > mealTargets[lunchIdx] * 1.12
    const dinnerLow = cals[dinnerIdx] < mealTargets[dinnerIdx] * 0.88
    const dinnerHigh = cals[dinnerIdx] > mealTargets[dinnerIdx] * 1.12

    if (!lunchLow && !lunchHigh && !dinnerLow && !dinnerHigh) break

    let moved = false
    if (lunchLow && dinnerHigh) {
      for (const ing of movable) {
        if (tryMoveBetweenMeals(day, DINNER_MEAL, LUNCH_MEAL, ing, store, carbIngs)) {
          moved = true
          break
        }
      }
    } else if (lunchHigh && dinnerLow) {
      for (const ing of movable) {
        if (tryMoveBetweenMeals(day, LUNCH_MEAL, DINNER_MEAL, ing, store, carbIngs)) {
          moved = true
          break
        }
      }
    }
    if (!moved) break
  }
}

function planSingleDay(
  day: number,
  days: number,
  mealsPerDay: number,
  eligible: ResolvedIngredient[],
  _profile: MealNutritionProfile,
  dailyCalorieTarget: number,
  store: Map<string, number>,
): void {
  const carbIngs = eligible.filter((ing) => isStapleCarb(ing.nutritionId))
  const ratios = mealCalorieRatios(mealsPerDay)
  const mealTargets = ratios.map((r) => r * dailyCalorieTarget)

  const portions: DayPortion[] = eligible
    .map((ing) => ({
      ing,
      dailyQty: splitTotalAcrossDays(ing.quantity, days, ing.unit)[day - 1] ?? 0,
    }))
    .filter((p) => p.dailyQty > 0)

  assignCarbsForDay(day, mealsPerDay, portions, store, carbIngs)
  assignVegetablesForDay(day, mealsPerDay, portions, store)
  assignProteinsForDay(day, mealsPerDay, portions, store, mealTargets)
  enforceStapleExclusivity(day, mealsPerDay, store, carbIngs)
  mergeFractionalUnits(day, mealsPerDay, store, eligible)
  rebalanceDayCalories(day, mealsPerDay, store, eligible, carbIngs, mealTargets)
  enforceStapleExclusivity(day, mealsPerDay, store, carbIngs)
}

/**
 * 按天规划：蔬菜/蛋白轮换、实用份量、热量比例约束。
 */
export function buildBalancedMealMaps(
  resolved: ResolvedIngredient[],
  days: number,
  mealsPerDay: number,
  profile: MealNutritionProfile,
  dailyCalorieTarget: number,
): Map<string, number> {
  const result = new Map<string, number>()
  const eligible = resolved.filter((ing) => shouldIncludeIngredient(ing, profile))

  for (let d = 1; d <= days; d++) {
    planSingleDay(d, days, mealsPerDay, eligible, profile, dailyCalorieTarget, result)
  }

  return result
}

export function computeInventoryStock(
  eligible: ResolvedIngredient[],
): DayCategoryStock {
  return {
    protein: eligible.some(
      (i) => getIngredientCategory(i.nutritionId) === 'protein',
    ),
    carb: eligible.some((i) => getIngredientCategory(i.nutritionId) === 'carb'),
    vegetable: eligible.some(
      (i) => getIngredientCategory(i.nutritionId) === 'vegetable',
    ),
  }
}

export function getMealBalanceNote(
  itemIds: string[],
  profile: MealNutritionProfile,
  meal: number | undefined,
  inventory: DayCategoryStock,
): string | undefined {
  const stapleCount = itemIds.filter(isStapleCarb).length
  if (stapleCount > 1) {
    return '已调整：同一餐仅保留一种主食。'
  }

  if (meal === 1 && itemIds.some((id) => NO_BREAKFAST_STAPLE_IDS.has(id))) {
    return '早餐不推荐米饭/面条，主食已分配至午/晚餐。'
  }

  const cats = new Set(itemIds.map(getIngredientCategory))
  const required = categoriesForProfile(profile)
  const missing = required.filter((cat) => !cats.has(cat))

  if (missing.length === 0) return undefined

  const depleted = missing.filter((cat) => {
    if (cat === 'protein') return !inventory.protein
    if (cat === 'carb') return !inventory.carb
    if (cat === 'vegetable') return !inventory.vegetable
    return true
  })

  if (depleted.length === 0) return undefined

  const labels: Record<NutritionCategory, string> = {
    protein: '优质蛋白',
    carb: '主食碳水',
    vegetable: '蔬菜',
    other: '其它',
  }
  return `原料不足：全天已无${depleted.map((c) => labels[c]).join('、')}类食材。`
}
