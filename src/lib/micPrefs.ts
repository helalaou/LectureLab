import type { MicPrefs } from './audio/recorder'

const KEY = 'll-mic'

/** Lecture-friendly defaults: keep echo cancellation off so distant voices aren't suppressed. */
export const DEFAULT_MIC: MicPrefs = { deviceId: undefined, echoCancellation: false, noiseSuppression: true, autoGainControl: true }

export function getMicPrefs(): MicPrefs {
  try {
    return { ...DEFAULT_MIC, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return DEFAULT_MIC
  }
}

export function setMicPrefs(p: MicPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}
