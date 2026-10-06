/**
 * Keeps track of in-flight AI generations so progress survives switching tabs.
 */
import { useSyncExternalStore } from 'react'
import { apiStream } from './api'
import type { Output, OutputType } from './types'

export interface GenOptions {
  focus?: string
  count?: number
  difficulty?: 'easy' | 'mixed' | 'hard'
  length?: 'short' | 'standard' | 'long'
}

export interface Running {
  text: string
  status: string
  startedAt: number
}

type Key = string // `${lectureId}:${type}`
let state: Record<Key, Running> = {}
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const set = (k: Key, v: Running | null) => {
  const next = { ...state }
  if (v) next[k] = v
  else delete next[k]
  state = next
  emit()
}

export function useRunning(): Record<Key, Running> {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export const runKey = (lectureId: string, type: OutputType) => `${lectureId}:${type}`

export async function generate(lectureId: string, type: OutputType, options: GenOptions = {}): Promise<Output> {
  const k = runKey(lectureId, type)
  if (state[k]) throw new Error('Already generating.')
  let text = ''
  let output = null as Output | null
  set(k, { text: '', status: 'Reading your sources…', startedAt: Date.now() })
  try {
    await apiStream('/api/generate', { lectureId, type, options }, (e) => {
      if (e.t === 'status')
        set(k, { ...state[k], status: e.status === 'writing' ? 'Writing…' : 'Reading your sources…' })
      if (e.t === 'delta') {
        text += e.d
        set(k, { ...state[k], text, status: 'Writing…' })
      }
      if (e.t === 'done') output = e.output as Output
    })
    if (!output) throw new Error('No result returned.')
    return output
  } finally {
    set(k, null)
  }
}
