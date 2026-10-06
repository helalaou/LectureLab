import { APP_NAME } from '@shared/app'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Mic,
  FileText,
  AudioLines,
  Type,
  ChevronRight,
  HardDriveDownload,
  BookOpen,
  Pencil,
  Trash2,
} from 'lucide-react'
import { listLectures } from '@/lib/db'
import { createLecture } from '@/lib/pipeline'
import { listStoredRecordings, type RecordingMeta } from '@/lib/audio/recorder'
import { fmtDate, relativeTime } from '@/lib/format'
import type { Lecture, OutputType, SourceKind } from '@/lib/types'
import { useCourses, COURSE_COLORS } from '@/hooks/useCourses'
import { useAuth } from '@/hooks/useAuth'
import CourseSelect from '@/components/CourseSelect'
import { Button, Empty, Modal, PageSpinner, IconButton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToast } from '@/hooks/useToast'
import { OUTPUT_META } from '@/components/tools/meta'

type LectureRow = Lecture

const KIND_ICON = { recording: Mic, audio: AudioLines, document: FileText, text: Type }

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { courses, create, rename, remove } = useCourses()
  const [lectures, setLectures] = useState<LectureRow[] | null>(null)
  const [query, setQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [pending, setPending] = useState<RecordingMeta[]>([])

  useEffect(() => {
    listLectures()
      .then(setLectures)
      .catch((e) => {
        toast(e.message, 'error')
        setLectures([])
      })
    listStoredRecordings()
      .then((r) => setPending(r.filter((m) => m.stopped || Date.now() - m.startedAt > 60_000)))
      .catch(() => {})
  }, [toast])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (lectures || []).filter(
      (l) =>
        (courseFilter === 'all' || (courseFilter === 'none' ? !l.course_id : l.course_id === courseFilter)) &&
        (!q ||
          l.title.toLowerCase().includes(q) ||
          courses
            .find((c) => c.id === l.course_id)
            ?.name.toLowerCase()
            .includes(q)),
    )
  }, [lectures, query, courseFilter, courses])

  const firstName = (user?.displayName ?? undefined)?.split(' ')[0]

  if (!lectures) return <PageSpinner />

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="muted text-sm">{firstName ? `Hi ${firstName} 👋` : 'Welcome back 👋'}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">Your lectures</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>
            New lecture
          </Button>
          <Button
            className="hidden sm:inline-flex"
            icon={<Mic className="size-4" />}
            onClick={() => navigate('/record')}
          >
            Record class
          </Button>
        </div>
      </div>

      {pending.length > 0 && (
        <Link
          to="/record"
          className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <HardDriveDownload className="size-5 shrink-0" />
          <div className="flex-1 text-sm">
            <b>{pending.length === 1 ? '1 recording' : `${pending.length} recordings`} saved on this device</b> haven't
            been processed yet. Tap to finish them.
          </div>
          <ChevronRight className="size-5" />
        </Link>
      )}

      {lectures.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              className="input pl-10"
              placeholder="Search lectures"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {[{ id: 'all', name: 'All' }, ...courses, { id: 'none', name: 'No course' }].map((c) => (
              <button
                key={c.id}
                onClick={() => setCourseFilter(c.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  courseFilter === c.id
                    ? 'border-accent-600 bg-accent-600 text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
                )}
              >
                {'color' in c && (
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      COURSE_COLORS[(c as { color: string }).color] || 'bg-zinc-400',
                    )}
                  />
                )}
                {c.name}
              </button>
            ))}
            <button
              onClick={() => setManageOpen(true)}
              className="text-accent-600 dark:text-accent-400 shrink-0 rounded-full px-3 py-1.5 text-sm font-medium"
            >
              Manage courses
            </button>
          </div>
        </div>
      )}

      {lectures.length === 0 ? (
        <div className="card mt-6">
          <Empty
            icon={<BookOpen className="size-7" />}
            title="Your first lecture starts here"
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button icon={<Mic className="size-4" />} onClick={() => navigate('/record')}>
                  Record a class
                </Button>
                <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>
                  Upload files or notes
                </Button>
              </div>
            }
          >
            Record your next class, or upload an old recording, slides or notes. {APP_NAME} turns them into notes,
            flashcards, quizzes and more.
          </Empty>
        </div>
      ) : filtered.length === 0 ? (
        <p className="muted mt-10 text-center">No lectures match.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((l) => {
            const course = courses.find((c) => c.id === l.course_id)
            const busy = !!l.processing
            const kinds = (l.source_kinds || []) as SourceKind[]
            return (
              <li key={l.id}>
                <Link
                  to={`/lecture/${l.id}`}
                  className="card group hover:border-accent-300 dark:hover:border-accent-700 block p-4 transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {course && (
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          <span className={cn('size-2 rounded-full', COURSE_COLORS[course.color] || 'bg-zinc-400')} />
                          <span className="truncate">{course.name}</span>
                        </div>
                      )}
                      <h3 className="group-hover:text-accent-700 dark:group-hover:text-accent-300 line-clamp-2 font-semibold">
                        {l.title}
                      </h3>
                    </div>
                    <ChevronRight className="group-hover:text-accent-500 mt-1 size-5 shrink-0 text-zinc-300 dark:text-zinc-600" />
                  </div>
                  <div className="muted mt-3 flex items-center gap-3 text-xs">
                    <span>{fmtDate(l.lecture_date)}</span>
                    <span className="flex items-center gap-1">
                      {kinds.map((k) => {
                        const I = KIND_ICON[k]
                        return <I key={k} className="size-3.5" />
                      })}
                      {l.source_count || 0} source{l.source_count === 1 ? '' : 's'}
                    </span>
                    {busy && <span className="text-accent-600 dark:text-accent-400 font-medium">Processing…</span>}
                    <span className="ml-auto">{relativeTime(l.updated_at)}</span>
                  </div>
                  {(l.output_types || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(l.output_types || []).map((t: OutputType) => {
                        const m = OUTPUT_META[t]
                        if (!m) return null
                        const I = m.icon
                        return (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            <I className="size-3" />
                            {m.short}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <NewLectureModal
        key={newOpen ? 'open' : 'closed'}
        open={newOpen}
        onClose={() => setNewOpen(false)}
        courses={courses}
        createCourse={create}
        defaultCourse={courseFilter !== 'all' && courseFilter !== 'none' ? courseFilter : null}
        onCreated={(id) => navigate(`/lecture/${id}?add=1`)}
      />

      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title="Courses">
        {courses.length === 0 && <p className="muted text-sm">No courses yet. Add one when you create a lecture.</p>}
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {courses.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <span className={cn('size-3 rounded-full', COURSE_COLORS[c.color])} />
              <span className="flex-1 font-medium">{c.name}</span>
              <IconButton
                label="Rename"
                onClick={() => {
                  const n = prompt('Rename course', c.name)
                  if (n?.trim()) rename(c.id, n.trim())
                }}
              >
                <Pencil className="size-4" />
              </IconButton>
              <IconButton
                label="Delete"
                onClick={() => {
                  if (confirm(`Delete "${c.name}"? Lectures in it are kept, just without a course.`)) remove(c.id)
                }}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Button
            variant="secondary"
            icon={<Plus className="size-4" />}
            onClick={async () => {
              const n = prompt('Course name (e.g. "BIO 101")')
              if (n?.trim()) await create(n)
            }}
          >
            Add course
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function NewLectureModal({
  open,
  onClose,
  courses,
  createCourse,
  defaultCourse,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  courses: ReturnType<typeof useCourses>['courses']
  createCourse: ReturnType<typeof useCourses>['create']
  defaultCourse: string | null
  onCreated: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState<string | null>(defaultCourse)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  return (
    <Modal open={open} onClose={onClose} title="New lecture">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            const id = await createLecture({ title, courseId })
            onCreated(id)
          } catch (err) {
            toast((err as Error).message, 'error')
          } finally {
            setBusy(false)
          }
        }}
      >
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            autoFocus
            placeholder="Leave blank and the AI will name it"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Course</label>
          <CourseSelect courses={courses} value={courseId} onChange={setCourseId} onCreate={createCourse} />
        </div>
        <p className="muted text-sm">
          Next you'll add sources: recordings, files, slides or notes. You can add as many as you like.
        </p>
        <Button type="submit" className="w-full" loading={busy}>
          Create lecture
        </Button>
      </form>
    </Modal>
  )
}
