/**
 * Splits long audio into ~1 minute pieces for transcription.
 * Cuts are placed at the quietest moment near the target length so we
 * don't chop words in half.
 */
export const TARGET_RATE = 16000
export const CHUNK_SECONDS = 60
const SEARCH_SECONDS = 6
const WINDOW = Math.round(TARGET_RATE * 0.05) // 50 ms RMS windows

/** Returns the sample index of the quietest 50 ms window in [from, to). */
export function quietestPoint(samples: Float32Array, from: number, to: number): number {
  let best = to
  let bestRms = Infinity
  for (let i = Math.max(0, from); i + WINDOW <= Math.min(to, samples.length); i += WINDOW) {
    let sum = 0
    for (let j = i; j < i + WINDOW; j++) sum += samples[j] * samples[j]
    if (sum < bestRms) {
      bestRms = sum
      best = i + Math.floor(WINDOW / 2)
    }
  }
  return best
}

