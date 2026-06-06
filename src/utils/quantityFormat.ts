import type { MeasureUnit } from '../types'

export const HALF_STEP_UNITS: MeasureUnit[] = ['个', '片']

/** 个/片：整数或 0.5；其余单位：整数 */
export function roundDisplayQuantity(quantity: number, unit: MeasureUnit): number {
  if (quantity <= 0) return 0

  if (HALF_STEP_UNITS.includes(unit)) {
    const rounded = Math.round(quantity * 2) / 2
    return rounded < 0.5 ? 0.5 : rounded
  }

  const rounded = Math.round(quantity)
  return rounded < 1 ? 1 : rounded
}

export function formatQuantityDisplay(quantity: number, unit: MeasureUnit): string {
  if (HALF_STEP_UNITS.includes(unit)) {
    const display = quantity % 1 === 0 ? String(quantity) : quantity.toFixed(1)
    return `${display}${unit}`
  }
  return `${quantity}${unit}`
}
