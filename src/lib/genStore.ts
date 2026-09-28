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

