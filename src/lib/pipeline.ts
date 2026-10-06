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

async function insertSource(
  lectureId: string,
  kind: SourceKind,
  title: string,
  extra: Partial<Source> = {},
): Promise<Source> {
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

async function uploadSourceAudio(
  lectureId: string,
  sourceId: string,
  blob: Blob,
  mime: string,
  onProgress?: (p: number) => void,
): Promise<string | null> {
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
    const src = await insertSource(lectureId, 'recording', title, {
      duration_sec: meta.durationSec,
      mime_type: meta.mimeType,
    })
    sourceId = src.id
    const { idb } = await import('./audio/idb')
    await idb.set(`rec:${recordingId}:meta`, { ...meta, lectureId, sourceId })
  }

  void runRecordingJob(recordingId, lectureId, sourceId, chunks, audio, meta)
  return { lectureId, sourceId }
}

async function runRecordingJob(
  recordingId: string,
  lectureId: string,
  sourceId: string,
  chunks: Awaited<ReturnType<typeof loadStoredRecording>>['chunks'],
  audio: Blob,
  meta: RecordingMeta,
) {
  try {
    setJob({ sourceId, lectureId, stage: 'Uploading audio…' })
    await updateSource(sourceId, lectureId, { status: 'uploading', error: null })
    const path = await uploadSourceAudio(lectureId, sourceId, audio, meta.mimeType, (p) =>
      setJob({ sourceId, lectureId, stage: `Uploading audio… ${Math.round(p * 100)}%`, progress: p }),
    )
    await updateSource(sourceId, lectureId, { status: 'transcribing', storage_path: path })
    const ctx = await lectureContext(lectureId)
    const { text, segments } = await transcribeChunks(chunks, {
      ...ctx,
      onProgress: (d, t) =>
        setJob({ sourceId, lectureId, stage: `Transcribing… ${d}/${t} min`, progress: t ? d / t : 0 }),
    })
    if (!text.trim()) throw new Error('No speech was detected in this recording. Check your microphone in Settings.')
    await updateSource(sourceId, lectureId, {
      status: 'ready',
      content: text,
      segments,
      duration_sec: meta.durationSec,
    })
    await deleteStoredRecording(recordingId)
  } catch (e) {
    await updateSource(sourceId, lectureId, {
      status: 'error',
      error: `${(e as Error).message} — the recording is still saved on this device; tap Retry.`,
    }).catch(() => {})
  } finally {
    endJob(sourceId)
  }
}

// ------------------------------------------------------------------ uploads

export async function addMediaFile(lectureId: string, file: File): Promise<void> {
  const title = file.name.replace(/\.[^.]+$/, '')
  const src = await insertSource(lectureId, 'audio', title, { mime_type: file.type || null })
  setJob({ sourceId: src.id, lectureId, stage: 'Reading file…' })
  try {
    const { chunks, durationSec } = await fileToChunks(file, (s) => setJob({ sourceId: src.id, lectureId, stage: s }))
    setJob({ sourceId: src.id, lectureId, stage: 'Uploading audio…' })
    const path = await uploadSourceAudio(lectureId, src.id, file, file.type || 'audio/mpeg')
    await updateSource(src.id, lectureId, { status: 'transcribing', storage_path: path, duration_sec: durationSec })
    const ctx = await lectureContext(lectureId)
    const { text, segments } = await transcribeChunks(chunks, {
      ...ctx,
      onProgress: (d, t) =>
        setJob({ sourceId: src.id, lectureId, stage: `Transcribing… ${d}/${t} min`, progress: t ? d / t : 0 }),
    })
    if (!text.trim()) throw new Error('No speech was detected in this file.')
    await updateSource(src.id, lectureId, { status: 'ready', content: text, segments })
  } catch (e) {
    await updateSource(src.id, lectureId, { status: 'error', error: (e as Error).message }).catch(() => {})
  } finally {
    endJob(src.id)
  }
}

export async function addDocument(lectureId: string, file: File): Promise<void> {
  const src = await insertSource(lectureId, 'document', file.name, { mime_type: file.type || null })
  setJob({ sourceId: src.id, lectureId, stage: 'Reading document…' })
  try {
    const text = await extractText(file, (s) => setJob({ sourceId: src.id, lectureId, stage: s }))
    if (!text.trim()) throw new Error('No readable text found in this document.')
    await updateSource(src.id, lectureId, { status: 'ready', content: text })
  } catch (e) {
    await updateSource(src.id, lectureId, { status: 'error', error: (e as Error).message }).catch(() => {})
  } finally {
    endJob(src.id)
  }
}

export async function addText(lectureId: string, title: string, text: string): Promise<void> {
  await insertSource(lectureId, 'text', title.trim() || 'My notes', {
    status: 'ready',
    content: text.trim(),
  } as Partial<Source>)
}

export async function deleteSource(src: Source) {
  await db.removeSource(src)
  changed(src.lecture_id)
}

/** Find the on-device recording that belongs to a failed source, if any. */
export async function findRecordingForSource(sourceId: string): Promise<string | null> {
  const { listStoredRecordings } = await import('./audio/recorder')
  const recs = (await listStoredRecordings()) as (RecordingMeta & { sourceId?: string })[]
  return recs.find((r) => r.sourceId === sourceId)?.id ?? null
}

export async function retryRecordingSource(sourceId: string) {
  const recId = await findRecordingForSource(sourceId)
  if (!recId) throw new Error('The original recording is not on this device anymore.')
  await processRecording(recId)
}

export async function deleteLecture(lectureId: string) {
  await db.deleteLecture(lectureId)
}
