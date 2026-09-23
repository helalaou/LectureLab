import { splitAll, TARGET_RATE } from './chunker'
import { encodeWav } from './wav'
import type { StoredChunk } from './recorder'

export const MAX_MEDIA_BYTES = 500 * 1024 * 1024

/**
 * Decode an uploaded audio/video file in the browser, convert it to 16 kHz mono
 * and split it into ~60 s WAV chunks ready for transcription.
 */
export async function fileToChunks(file: File, onStage?: (s: string) => void): Promise<{ chunks: StoredChunk[]; durationSec: number }> {
  if (file.size > MAX_MEDIA_BYTES) throw new Error('This file is over 500 MB. Please trim it or export just the audio first.')
  onStage?.('Reading file…')
  const data = await file.arrayBuffer()
  onStage?.('Decoding audio…')
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(data)
  } catch {
    throw new Error("Your browser couldn't read the audio in this file. Try MP3, M4A, WAV, WEBM or MP4.")
  } finally {
    ctx.close().catch(() => {})
  }

  onStage?.('Preparing audio…')
  const length = Math.ceil(decoded.duration * TARGET_RATE)
  const offline = new OfflineAudioContext(1, length, TARGET_RATE)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination) // automatic down-mix to mono + resample
  src.start()
  const rendered = await offline.startRendering()
  const samples = rendered.getChannelData(0)

  const pieces = splitAll(samples)
  let start = 0
  const chunks: StoredChunk[] = pieces.map((p) => {
    const c = { start, duration: p.length / TARGET_RATE, blob: encodeWav(p, TARGET_RATE) }
    start += c.duration
    return c
  })
  return { chunks, durationSec: decoded.duration }
}
