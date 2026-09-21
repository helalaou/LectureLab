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

