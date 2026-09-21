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

/** Find a cut position for a buffer that is at least CHUNK_SECONDS long. */
export function findCut(samples: Float32Array): number {
  const target = CHUNK_SECONDS * TARGET_RATE
  return quietestPoint(samples, target - SEARCH_SECONDS * TARGET_RATE, Math.min(samples.length, target))
}

/** Split an entire buffer (e.g. a decoded upload) into chunk ranges. */
export function splitAll(samples: Float32Array): Float32Array[] {
  const out: Float32Array[] = []
  let rest = samples
  const minLast = 2 * TARGET_RATE
  while (rest.length > (CHUNK_SECONDS + SEARCH_SECONDS) * TARGET_RATE) {
    const cut = findCut(rest)
    out.push(rest.subarray(0, cut))
    rest = rest.subarray(cut)
  }
  if (rest.length > minLast || out.length === 0) out.push(rest)
  else if (out.length) {
    // fold a tiny tail into the previous chunk
    const prev = out.pop()!
    const merged = new Float32Array(prev.length + rest.length)
    merged.set(prev)
    merged.set(rest, prev.length)
    out.push(merged)
  }
  return out
}

