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
  const options = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
  for (const m of options) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
  return ''
}

