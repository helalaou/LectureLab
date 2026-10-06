import { describe, expect, it } from 'vitest'
import { cardKey, intervalLabel, NEW_CARD, review } from './srs'

const now = new Date('2026-01-01T12:00:00Z')

describe('review', () => {
  it('schedules a new card a day out when graded Good', () => {
    const next = review(NEW_CARD, 2, now)
    expect(next.reps).toBe(1)
    expect(next.interval_days).toBe(1)
    expect(new Date(next.due_at).getTime() - now.getTime()).toBe(86_400_000)
  })

  it('grows the interval with repeated Good answers', () => {
    let state = NEW_CARD
    const intervals: number[] = []
    for (let i = 0; i < 4; i++) {
      state = review(state, 2, now)
      intervals.push(state.interval_days)
    }
    expect(intervals).toEqual([...intervals].sort((a, b) => a - b))
    expect(intervals[3]).toBeGreaterThan(10)
  })

  it('resets progress and lowers ease on Again', () => {
    const learned = review(review(NEW_CARD, 2, now), 2, now)
    const failed = review(learned, 0, now)
    expect(failed.reps).toBe(0)
    expect(failed.ease).toBeLessThan(learned.ease)
    expect(new Date(failed.due_at).getTime() - now.getTime()).toBe(60_000)
  })

  it('never lets ease drop below 1.3', () => {
    let state = NEW_CARD
    for (let i = 0; i < 20; i++) state = review(state, 0, now)
    expect(state.ease).toBe(1.3)
  })
})

describe('intervalLabel', () => {
  it('describes the next interval for each grade', () => {
    expect(intervalLabel(NEW_CARD, 0)).toBe('1m')
    expect(intervalLabel(NEW_CARD, 1)).toBe('12h')
    expect(intervalLabel(NEW_CARD, 2)).toBe('1d')
    expect(intervalLabel(NEW_CARD, 3)).toBe('3d')
  })
})

describe('cardKey', () => {
  it('is stable and distinguishes different fronts', () => {
    expect(cardKey('What is ATP?')).toBe(cardKey('What is ATP?'))
    expect(cardKey('What is ATP?')).not.toBe(cardKey('What is ADP?'))
  })
})
