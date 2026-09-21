/**
 * Minimal SM-2 style spaced repetition.
 * grade: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy
 */
export interface CardState {
  ease: number
  interval_days: number
  reps: number
  due_at: string
}

export const NEW_CARD: CardState = { ease: 2.5, interval_days: 0, reps: 0, due_at: new Date(0).toISOString() }

export function review(state: CardState, grade: 0 | 1 | 2 | 3, now = new Date()): CardState {
  let { ease, interval_days, reps } = state
  if (grade === 0) {
    reps = 0
    interval_days = 0
    ease = Math.max(1.3, ease - 0.2)
    return { ease, interval_days, reps, due_at: new Date(now.getTime() + 60_000).toISOString() } // again in 1 min
  }
  reps += 1
  if (reps === 1) interval_days = grade === 1 ? 0.5 : grade === 2 ? 1 : 3
  else if (reps === 2) interval_days = grade === 1 ? 2 : grade === 2 ? 3 : 6
  else interval_days = Math.round(interval_days * (grade === 1 ? 1.2 : grade === 2 ? ease : ease * 1.3) * 10) / 10
  ease = Math.max(1.3, ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0))
  return { ease, interval_days, reps, due_at: new Date(now.getTime() + interval_days * 86400_000).toISOString() }
}

