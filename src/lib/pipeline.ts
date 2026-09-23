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

function setJob(job: Job) {
  jobs = { ...jobs, [job.sourceId]: job }
  emit()
}
function endJob(sourceId: string) {
  const { [sourceId]: _, ...rest } = jobs
  jobs = rest
  emit()
}

export function useJobs(): Record<string, Job> {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => jobs,
  )
}

/** Notifies pages that a source row changed so they can refetch. */
export const sourceEvents = new EventTarget()
function changed(lectureId: string) {
  sourceEvents.dispatchEvent(new CustomEvent('change', { detail: lectureId }))
}

// ------------------------------------------------------------------ helpers

export async function createLecture(input: { title?: string; courseId?: string | null }): Promise<string> {
  return db.createLecture({ title: input.title?.trim() || defaultLectureTitle(), courseId: input.courseId || null })
}

async function insertSource(lectureId: string, kind: SourceKind, title: string, extra: Partial<Source> = {}): Promise<Source> {
  const src = await db.addSource(lectureId, kind, title, extra)
  changed(lectureId)
  return src
}

async function updateSource(id: string, lectureId: string, patch: Partial<Source>) {
  await db.updateSource(lectureId, id, patch)
  changed(lectureId)
}

async function lectureContext(lectureId: string) {
  const lec = await db.getLecture(lectureId)
  let courseName: string | undefined
  if (lec?.course_id) courseName = (await db.listCourses()).find((c) => c.id === lec.course_id)?.name
  return {
    lectureTitle: /^lecture ·/i.test(lec?.title || '') ? undefined : lec?.title,
    courseName,
  }
}

function extFor(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  return 'audio'
}

async function uploadSourceAudio(lectureId: string, sourceId: string, blob: Blob, mime: string, onProgress?: (p: number) => void): Promise<string | null> {
  if (blob.size > MAX_STORED_AUDIO || blob.size === 0) return null
  const key = `${auth.currentUser!.uid}/${lectureId}/${sourceId}.${extFor(mime)}`
  try {
    await uploadAudio(key, blob.type ? blob : new Blob([blob], { type: mime }), onProgress)
    return key
  } catch (e) {
    console.warn('Audio upload failed (transcript will still be saved):', (e as Error).message)
    return null
  }
}

// ------------------------------------------------------------------ recordings

/**
 * Turn a finished recording (saved in IndexedDB) into a transcribed source.
 * Safe to call again for a recording that failed earlier.
 */
export async function processRecording(recordingId: string): Promise<{ lectureId: string; sourceId: string }> {
  const { meta, chunks, audio } = await loadStoredRecording(recordingId)
  const lectureId = meta.lectureId || (await createLecture({ title: meta.title, courseId: meta.courseId }))
  const startedAt = new Date(meta.startedAt)
  const title = `Class recording · ${startedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`

  // remember which lecture/source this recording belongs to, for retries
  let sourceId = (meta as RecordingMeta & { sourceId?: string }).sourceId
  if (!sourceId) {
    const src = await insertSource(lectureId, 'recording', title, { duration_sec: meta.durationSec, mime_type: meta.mimeType })
    sourceId = src.id
    const { idb } = await import('./audio/idb')
    await idb.set(`rec:${recordingId}:meta`, { ...meta, lectureId, sourceId })
  }

  void runRecordingJob(recordingId, lectureId, sourceId, chunks, audio, meta)
  return { lectureId, sourceId }
}

