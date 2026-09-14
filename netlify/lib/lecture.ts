import { HttpError, type User } from './server.ts'

const KIND_LABEL: Record<string, string> = {
  recording: 'Live class recording (audio transcript)',
  audio: 'Uploaded recording (audio transcript)',
  document: 'Document',
  text: 'Typed / pasted notes',
}

/** Roughly 150k tokens. Plenty for several lectures, and keeps costs sane. */
const MAX_CHARS = 600_000

interface Segment {
  start: number
  end: number
  text: string
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

