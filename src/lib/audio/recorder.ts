import { idb } from './idb'
import { CHUNK_SECONDS, findCut, Resampler, TARGET_RATE } from './chunker'
import { encodeWav } from './wav'

export interface MicPrefs {
  deviceId?: string
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

export interface RecordingMeta {
  id: string
  startedAt: number
  lectureId?: string
  courseId?: string | null
  title: string
  mimeType: string
  durationSec: number
  chunkCount: number
  partCount: number
  stopped: boolean
}

export interface StoredChunk {
  start: number
  duration: number
  blob: Blob
}

const WORKLET = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(4096); this.n = 0; }
  process(inputs) {
    const ch = inputs[0];
    if (ch && ch.length) {
      const len = ch[0].length;
      for (let i = 0; i < len; i++) {
        let v = 0;
        for (let c = 0; c < ch.length; c++) v += ch[c][i];
        this.buf[this.n++] = v / ch.length;
        if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor('lecturelab-tap', Tap);
`

function pickMime(): string {
  const options = [
    'audio/webm;codecs=opus',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ]
  for (const m of options) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
  return ''
}

export function micConstraints(p: MicPrefs): MediaStreamConstraints {
  return {
    audio: {
      deviceId: p.deviceId ? { exact: p.deviceId } : undefined,
      echoCancellation: p.echoCancellation,
      noiseSuppression: p.noiseSuppression,
      autoGainControl: p.autoGainControl,
      channelCount: 1,
    },
  }
}

/**
 * Records a lecture:
 *  - a compressed copy (MediaRecorder, ~32 kbps) for playback later
 *  - 16 kHz PCM cut into ~60 s WAV chunks for transcription
 * Both are persisted to IndexedDB as they are produced.
 */
export class LectureRecorder {
  id = crypto.randomUUID()
  meta!: RecordingMeta
  onLevel?: (level: number) => void
  onTick?: (seconds: number) => void

  private stream?: MediaStream
  private ctx?: AudioContext
  private node?: AudioWorkletNode
  private analyser?: AnalyserNode
  private media?: MediaRecorder
  private resampler?: Resampler
  private pending: Float32Array[] = []
  private pendingLen = 0
  private consumedSamples = 0
  private paused = false
  private raf = 0
  private writes: Promise<unknown> = Promise.resolve()
  private wakeLock: { release: () => Promise<void> } | null = null

  async start(prefs: MicPrefs, info: { title: string; lectureId?: string; courseId?: string | null }) {
    this.stream = await navigator.mediaDevices.getUserMedia(micConstraints(prefs))
    this.ctx = new AudioContext()
    await this.ctx.resume()
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
    await this.ctx.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)

    const src = this.ctx.createMediaStreamSource(this.stream)
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 1024
    src.connect(this.analyser)
    this.node = new AudioWorkletNode(this.ctx, 'lecturelab-tap')
    src.connect(this.node)
    // Worklets only run when connected to the destination; route through a muted gain.
    const mute = this.ctx.createGain()
    mute.gain.value = 0
    this.node.connect(mute).connect(this.ctx.destination)
    this.resampler = new Resampler(this.ctx.sampleRate)
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => this.onPcm(e.data)

    const mimeType = pickMime()
    this.media = new MediaRecorder(this.stream, { mimeType: mimeType || undefined, audioBitsPerSecond: 32000 })
    this.media.ondataavailable = (e) => {
      if (!e.data.size) return
      const n = this.meta.partCount++
      this.persist(`rec:${this.id}:part:${String(n).padStart(5, '0')}`, e.data)
    }
    this.media.start(5000)

    this.meta = {
      id: this.id,
      startedAt: Date.now(),
      lectureId: info.lectureId,
      courseId: info.courseId,
      title: info.title,
      mimeType: this.media.mimeType || mimeType || 'audio/webm',
      durationSec: 0,
      chunkCount: 0,
      partCount: 0,
      stopped: false,
    }
    this.saveMeta()
    this.loopLevel()
    this.requestWakeLock()
  }

  private async requestWakeLock() {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> }
      }
      this.wakeLock = (await nav.wakeLock?.request('screen')) ?? null
    } catch {
      /* not supported — fine */
    }
  }

  private loopLevel() {
    const data = new Uint8Array(this.analyser!.fftSize)
    const tick = () => {
      this.analyser!.getByteTimeDomainData(data)
      let peak = 0
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128)
      this.onLevel?.(this.paused ? 0 : peak)
      this.raf = requestAnimationFrame(tick)
    }
    tick()
  }

  private onPcm(frame: Float32Array) {
    if (this.paused || !this.resampler) return
    const out = this.resampler.process(frame)
    this.pending.push(out)
    this.pendingLen += out.length
    const total = (this.consumedSamples + this.pendingLen) / TARGET_RATE
    this.meta.durationSec = total
    this.onTick?.(total)
    if (this.pendingLen >= CHUNK_SECONDS * TARGET_RATE) this.flush(false)
  }

  private flush(final: boolean) {
    if (!this.pendingLen) return
    const all = new Float32Array(this.pendingLen)
    let off = 0
    for (const p of this.pending) {
      all.set(p, off)
      off += p.length
    }
    const cut = final ? all.length : findCut(all)
    const piece = all.subarray(0, cut)
    const rest = all.slice(cut)
    const chunk: StoredChunk = {
      start: this.consumedSamples / TARGET_RATE,
      duration: piece.length / TARGET_RATE,
      blob: encodeWav(piece, TARGET_RATE),
    }
    this.consumedSamples += piece.length
    this.pending = rest.length ? [rest] : []
    this.pendingLen = rest.length
    if (chunk.duration >= 0.5) {
      const n = this.meta.chunkCount++
      this.persist(`rec:${this.id}:chunk:${String(n).padStart(5, '0')}`, chunk)
    }
  }

  private persist(key: string, value: unknown) {
    this.writes = this.writes.then(() => idb.set(key, value)).then(() => this.saveMeta())
  }

  private saveMeta() {
    return idb.set(`rec:${this.id}:meta`, { ...this.meta })
  }

  get isPaused() {
    return this.paused
  }

  pause() {
    this.paused = true
    if (this.media?.state === 'recording') this.media.pause()
  }

  resume() {
    this.paused = false
    if (this.media?.state === 'paused') this.media.resume()
  }

  /** Stops everything, flushes the last chunk, and returns the recording id. */
  async stop(): Promise<RecordingMeta> {
    cancelAnimationFrame(this.raf)
    await new Promise<void>((resolve) => {
      if (!this.media || this.media.state === 'inactive') return resolve()
      this.media.onstop = () => resolve()
      this.media.stop()
    })
    this.flush(true)
    this.meta.stopped = true
    this.meta.durationSec = this.consumedSamples / TARGET_RATE
    await this.writes
    await this.saveMeta()
    this.cleanup()
    return { ...this.meta }
  }

  /** Abandon without saving. */
  async discard() {
    cancelAnimationFrame(this.raf)
    try {
      this.media?.stop()
    } catch {
      /* ignore */
    }
    this.cleanup()
    await this.writes
    await idb.delPrefix(`rec:${this.id}:`)
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.node?.disconnect()
    this.ctx?.close().catch(() => {})
    this.wakeLock?.release().catch(() => {})
  }
}

// ------------------------------------------------------------------ stored recordings

export async function listStoredRecordings(): Promise<RecordingMeta[]> {
  const keys = (await idb.keys()).map(String).filter((k) => k.startsWith('rec:') && k.endsWith(':meta'))
  const metas = await Promise.all(keys.map((k) => idb.get<RecordingMeta>(k)))
  return metas.filter((m): m is RecordingMeta => !!m).sort((a, b) => b.startedAt - a.startedAt)
}

export async function loadStoredRecording(
  id: string,
): Promise<{ meta: RecordingMeta; chunks: StoredChunk[]; audio: Blob }> {
  const meta = await idb.get<RecordingMeta>(`rec:${id}:meta`)
  if (!meta) throw new Error('Recording not found on this device.')
  const keys = (await idb.keys()).map(String).sort()
  const chunks: StoredChunk[] = []
  const parts: Blob[] = []
  for (const k of keys) {
    if (k.startsWith(`rec:${id}:chunk:`)) {
      const c = await idb.get<StoredChunk>(k)
      if (c) chunks.push(c)
    } else if (k.startsWith(`rec:${id}:part:`)) {
      const p = await idb.get<Blob>(k)
      if (p) parts.push(p)
    }
  }
  const durationSec = chunks.reduce((s, c) => Math.max(s, c.start + c.duration), 0) || meta.durationSec
  return { meta: { ...meta, durationSec }, chunks, audio: new Blob(parts, { type: meta.mimeType.split(';')[0] }) }
}

export async function deleteStoredRecording(id: string) {
  await idb.delPrefix(`rec:${id}:`)
}

// ------------------------------------------------------------------ devices

export async function listMicrophones(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  let devices = await navigator.mediaDevices.enumerateDevices()
  // Labels are empty until the user has granted mic permission once.
  if (devices.some((d) => d.kind === 'audioinput' && !d.label)) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      s.getTracks().forEach((t) => t.stop())
      devices = await navigator.mediaDevices.enumerateDevices()
    } catch {
      /* permission denied — return unlabeled list */
    }
  }
  return devices.filter((d) => d.kind === 'audioinput')
}
