const STORAGE_KEY = 'smart-meal-planner-completed'

export function loadCompletedMeals(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

export function saveCompletedMeals(completed: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]))
}

export function toggleCompleted(
  completed: Set<string>,
  slotId: string,
): Set<string> {
  const next = new Set(completed)
  if (next.has(slotId)) next.delete(slotId)
  else next.add(slotId)
  saveCompletedMeals(next)
  return next
}
