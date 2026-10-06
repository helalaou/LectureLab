import { describe, expect, it } from 'vitest'
import { encodeWav } from './wav'

describe('encodeWav', () => {
  it('writes a valid 16-bit mono PCM header', async () => {
    const blob = encodeWav(new Float32Array([0, 0.5, -0.5, 1, -1]), 16_000)
    const view = new DataView(await blob.arrayBuffer())
    const text = (offset: number) => String.fromCharCode(...new Uint8Array(view.buffer, offset, 4))
    expect(text(0)).toBe('RIFF')
    expect(text(8)).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(1) // channels
    expect(view.getUint32(24, true)).toBe(16_000) // sample rate
    expect(view.getUint16(34, true)).toBe(16) // bits per sample
    expect(view.getUint32(40, true)).toBe(10) // data bytes
    expect(blob.size).toBe(54)
  })

  it('clips samples outside [-1, 1]', async () => {
    const view = new DataView(await encodeWav(new Float32Array([2, -2]), 8000).arrayBuffer())
    expect(view.getInt16(44, true)).toBe(0x7fff)
    expect(view.getInt16(46, true)).toBe(-0x8000)
  })
})
