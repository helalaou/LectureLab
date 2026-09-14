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

export interface LectureDoc {
  title: string
  course_id: string | null
  output_types?: string[]
}

interface SourceDoc {
  kind: string
  title: string
  content: string
  segments?: Segment[]
  status: string
  created_at: string
}

export async function loadLecture(user: User, lectureId: string, opts: { timestamps?: boolean } = {}) {
  const base = `users/${user.uid}/lectures/${lectureId}`
  const lecture = await user.db.get<LectureDoc>(base)
  if (!lecture) throw new HttpError(404, 'Lecture not found.')

  const [sources, course] = await Promise.all([
    user.db.list<SourceDoc>(`${base}/sources`, { orderBy: 'created_at' }),
    lecture.course_id ? user.db.get<{ name: string }>(`users/${user.uid}/courses/${lecture.course_id}`) : Promise.resolve(null),
  ])

  const ready = sources.filter((s) => s.status === 'ready' && (s.content || '').trim().length > 0)
  if (!ready.length) {
    throw new HttpError(400, 'This lecture has no transcribed or readable sources yet. Add a recording, a file or some notes first.', 'no_sources')
  }

  const blocks = ready.map((s, i) => {
    let body = s.content
    const segs = s.segments || []
    if (opts.timestamps && segs.length) {
      body = segs.map((seg) => `[${fmtTime(seg.start)}] ${seg.text.trim()}`).join('\n')
    }
    return `=== SOURCE ${i + 1}: ${s.title} — ${KIND_LABEL[s.kind] || s.kind} ===\n${body.trim()}`
  })

  let sourcesText = blocks.join('\n\n')
  let truncated = false
  if (sourcesText.length > MAX_CHARS) {
    sourcesText = sourcesText.slice(0, MAX_CHARS) + '\n\n[…material truncated because it was very long…]'
    truncated = true
  }

  return { lecture, courseName: course?.name ?? null, sourcesText, truncated, sourceCount: ready.length, path: base }
}
