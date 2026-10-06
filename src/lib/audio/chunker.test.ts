import { describe, expect, it } from 'vitest'
import { CHUNK_SECONDS, quietestPoint, Resampler, splitAll, TARGET_RATE } from './chunker'

const tone = (seconds: number, rate: number, freq = 440) =>
  Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => Math.sin((2 * Math.PI * freq * i) / rate))

describe('Resampler', () => {
  it('downsamples 48 kHz to 16 kHz across block boundaries', () => {
    const input = tone(2, 48_000)
    const resampler = new Resampler(48_000)
    const out: number[] = []
    for (let i = 0; i < input.length; i += 4096) out.push(...resampler.process(input.subarray(i, i + 4096)))
    expect(Math.abs(out.length - 2 * TARGET_RATE)).toBeLessThanOrEqual(2)
    const expected = tone(2, TARGET_RATE)
    const maxError = out.reduce((m, v, i) => Math.max(m, Math.abs(v - expected[i])), 0)
    expect(maxError).toBeLessThan(0.01)
  })

  it('handles a non-integer ratio (44.1 kHz)', () => {
    const resampler = new Resampler(44_100)
    const out = resampler.process(tone(1, 44_100))
    expect(Math.abs(out.length - TARGET_RATE)).toBeLessThanOrEqual(2)
  })
})

describe('quietestPoint', () => {
  it('finds the silent gap in a window', () => {
    const samples = tone(3, TARGET_RATE)
    samples.fill(0, TARGET_RATE * 1.5, TARGET_RATE * 1.6)
    const cut = quietestPoint(samples, 0, samples.length)
    expect(cut).toBeGreaterThanOrEqual(TARGET_RATE * 1.5)
    expect(cut).toBeLessThanOrEqual(TARGET_RATE * 1.6)
  })
})

describe('splitAll', () => {
  it('splits long audio into roughly one-minute chunks without losing samples', () => {
    const samples = tone(7.5 * 60, TARGET_RATE, 220)
    const chunks = splitAll(samples)
    expect(chunks.length).toBeGreaterThanOrEqual(8)
    expect(chunks.length).toBeLessThanOrEqual(9)
    expect(chunks.reduce((n, c) => n + c.length, 0)).toBe(samples.length)
    for (const c of chunks.slice(0, -1)) expect(c.length / TARGET_RATE).toBeLessThanOrEqual(CHUNK_SECONDS)
  })

  it('keeps short audio as a single chunk', () => {
    expect(splitAll(tone(10, TARGET_RATE))).toHaveLength(1)
  })
})
