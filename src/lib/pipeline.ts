/**
 * Source processing pipeline: turns recordings, uploads, documents and text into
 * rows in the `sources` table, with live progress the UI can subscribe to.
 */
import { useSyncExternalStore } from 'react'
import { auth } from './firebase'
import * as db from './db'
import { uploadAudio, MAX_STORED_AUDIO } from './storage'
import { deleteStoredRecording, loadStoredRecording, type RecordingMeta } from './audio/recorder'
import { fileToChunks } from './audio/decode'
import { transcribeChunks } from './audio/transcribe'
import { extractText } from './docs'
import { defaultLectureTitle } from './format'
import type { Source, SourceKind } from './types'

// ------------------------------------------------------------------ job store

export interface Job {
  sourceId: string
  lectureId: string
  stage: string
  progress?: number // 0..1
}

let jobs: Record<string, Job> = {}
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

