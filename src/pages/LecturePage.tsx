import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Pencil, Trash2, FolderInput, CalendarDays, Library, Loader2 } from 'lucide-react'
import { listOutputs, updateLecture, watchLecture, watchSources } from '@/lib/db'
import { deleteLecture } from '@/lib/pipeline'
import { generate, runKey, useRunning } from '@/lib/genStore'
import { exportAnki, exportCsv } from '@/lib/export'
import { slug } from '@/lib/format'
import type {
  Flashcard,
  GlossaryTerm,
  Lecture,
  MarkdownContent,
  Output,
  OutputType,
  PodcastContent,
  QuizQuestion,
  Source,
  SummaryContent,
  Visual,
} from '@/lib/types'
import { useCourses, COURSE_COLORS } from '@/hooks/useCourses'
import SourcesPanel, { AddSourceModal } from '@/components/SourcesPanel'
import ToolPanel from '@/components/tools/ToolPanel'
import { OUTPUT_META, TAB_ORDER, CHAT_META } from '@/components/tools/meta'
import SummaryView from '@/components/tools/SummaryView'
import FlashcardsView from '@/components/tools/FlashcardsView'
import QuizView from '@/components/tools/QuizView'
import PodcastView from '@/components/tools/PodcastView'
import VisualsView from '@/components/tools/VisualsView'
import GlossaryView from '@/components/tools/GlossaryView'
import ChatView from '@/components/tools/ChatView'
import Markdown from '@/components/Markdown'
import CourseSelect from '@/components/CourseSelect'
import { Button, IconButton, Menu, MenuItem, Modal, PageSpinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToast } from '@/hooks/useToast'
import { FileSpreadsheet, Layers } from 'lucide-react'
import { ApiError } from '@/lib/api'

type Tab = OutputType | 'sources' | 'chat'

const KIT_ORDER: OutputType[] = [
  'summary',
  'notes',
  'flashcards',
  'quiz',
  'glossary',
  'visuals',
  'study_guide',
  'podcast',
]

export default function LecturePage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { courses, create: createCourse } = useCourses()
  const running = useRunning()

  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [outputs, setOutputs] = useState<Partial<Record<OutputType, Output>>>({})
  const [notFound, setNotFound] = useState(false)
  const [addOpen, setAddOpen] = useState(params.get('add') === '1')
  const [editOpen, setEditOpen] = useState(false)
  const [makingAll, setMakingAll] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const tab = (params.get('tab') as Tab) || 'sources'
  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params)
    next.set('tab', t)
    next.delete('add')
    setParams(next, { replace: true })
  }

  // Live updates: the lecture and its sources refresh automatically (also across devices).
  useEffect(() => {
    const offLecture = watchLecture(id, (l) => (l ? setLecture(l) : setNotFound(true)))
    const offSources = watchSources(id, setSources)
    listOutputs(id)
      .then(setOutputs)
      .catch(() => {})
    return () => {
      offLecture()
      offSources()
    }
  }, [id])

  // keep the active tab chip visible
  useEffect(() => {
    const box = tabsRef.current
    const el = box?.querySelector<HTMLElement>('[data-active="true"]')
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
  }, [tab])

  const canGenerate = sources.some((s) => s.status === 'ready' && s.content.trim())
  const course = courses.find((c) => c.id === lecture?.course_id)

  const setOutput = useCallback((o: Output) => {
    setOutputs((m) => ({ ...m, [o.type]: o }))
  }, [])

  async function makeAll() {
    setMakingAll(true)
    const todo = KIT_ORDER.filter((t) => !outputs[t])
    if (!todo.length) {
      toast('You already have everything. Use Regenerate on a tab to refresh one.', 'info')
      setMakingAll(false)
      return
    }
    toast(`Making ${todo.length} study tools…`)
    setTab(todo[0])
    let failed = 0
    // two at a time keeps it quick without hitting rate limits
    const queue = [...todo]
    const worker = async () => {
      while (queue.length) {
        const t = queue.shift()!
        try {
          setOutput(await generate(id, t))
        } catch (e) {
          failed++
          if ((e as ApiError).code === 'no_key') {
            queue.length = 0
            toast((e as Error).message, 'error')
            navigate('/settings#api-key')
          }
        }
      }
    }
    await Promise.all([worker(), worker()])
    setMakingAll(false)
    toast(
      failed
        ? `Done, but ${failed} tool${failed > 1 ? 's' : ''} failed. Open them to retry.`
        : 'Your study kit is ready! 🎉',
      failed ? 'error' : 'success',
    )
  }

  const tabs = useMemo(
    () =>
      TAB_ORDER.map((t) => {
        if (t === 'sources')
          return { id: t, label: `Sources${sources.length ? ` (${sources.length})` : ''}`, icon: Library }
        if (t === 'chat') return { id: t, label: CHAT_META.label, icon: CHAT_META.icon }
        return { id: t, label: OUTPUT_META[t].short, icon: OUTPUT_META[t].icon }
      }),
    [sources.length],
  )

  if (notFound)
    return (
      <div className="py-20 text-center">
        <p className="font-medium">Lecture not found.</p>
        <Link to="/" className="text-accent-600 mt-3 inline-block">
          Back to lectures
        </Link>
      </div>
    )
  if (!lecture) return <PageSpinner />

  const title = lecture.title
  const tool = (
    type: OutputType,
    render: (o: Output) => React.ReactNode,
    extra?: Parameters<typeof ToolPanel>[0]['extraExports'],
  ) => (
    <ToolPanel
      type={type}
      lectureId={id}
      lectureTitle={title}
      output={outputs[type]}
      canGenerate={canGenerate}
      onChange={setOutput}
      extraExports={extra}
    >
      {render}
    </ToolPanel>
  )

  return (
    <div>
      {/* Header */}
      <div className="no-print">
        <Link to="/" className="muted inline-flex items-center gap-1 text-sm hover:text-zinc-900 dark:hover:text-white">
          <ArrowLeft className="size-4" /> Lectures
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="muted flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {course && (
                <span className="flex items-center gap-1.5">
                  <span className={cn('size-2 rounded-full', COURSE_COLORS[course.color])} />
                  {course.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {new Date(lecture.lecture_date + 'T12:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
              {title}
            </h1>
          </div>
          <Menu
            trigger={(toggle) => (
              <IconButton label="Lecture options" onClick={toggle}>
                <MoreHorizontal className="size-5" />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon={<Pencil className="size-4" />}
                  onClick={() => {
                    close()
                    setEditOpen(true)
                  }}
                >
                  Edit title, course & date
                </MenuItem>
                <MenuItem
                  icon={<FolderInput className="size-4" />}
                  onClick={() => {
                    close()
                    setAddOpen(true)
                  }}
                >
                  Add source
                </MenuItem>
                <MenuItem
                  danger
                  icon={<Trash2 className="size-4" />}
                  onClick={async () => {
                    close()
                    if (!confirm('Delete this lecture, its recordings and all study material?')) return
                    await deleteLecture(id)
                    navigate('/')
                  }}
                >
                  Delete lecture
                </MenuItem>
              </>
            )}
          </Menu>
        </div>

        {/* Tabs */}
        <div className="sticky top-14 z-20 -mx-4 mt-4 border-b border-zinc-200 bg-zinc-50/90 px-4 backdrop-blur-md sm:top-16 sm:mx-0 sm:px-0 dark:border-zinc-800 dark:bg-zinc-950/90">
          <div ref={tabsRef} className="no-scrollbar relative flex gap-1 overflow-x-auto py-2">
            {tabs.map(({ id: t, label, icon: Icon }) => {
              const active = tab === t
              const busy = t !== 'sources' && t !== 'chat' && !!running[runKey(id, t)]
              const has = t !== 'sources' && t !== 'chat' && !!outputs[t]
              return (
                <button
                  key={t}
                  data-active={active}
                  onClick={() => setTab(t)}
                  className={cn(
                    'relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent-600 text-white shadow-sm'
                      : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800',
                  )}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                  {label}
                  {has && !active && (
                    <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {tab === 'sources' && (
          <SourcesPanel sources={sources} onAdd={() => setAddOpen(true)} onMakeAll={makeAll} makingAll={makingAll} />
        )}
        {tab === 'summary' && tool('summary', (o) => <SummaryView c={o.content as SummaryContent} />)}
        {tab === 'notes' &&
          tool('notes', (o) => (
            <div className="card p-5 sm:p-8">
              <Markdown>{(o.content as MarkdownContent).markdown}</Markdown>
            </div>
          ))}
        {tab === 'study_guide' &&
          tool('study_guide', (o) => (
            <div className="card p-5 sm:p-8">
              <Markdown>{(o.content as MarkdownContent).markdown}</Markdown>
            </div>
          ))}
        {tab === 'flashcards' &&
          tool(
            'flashcards',
            (o) => <FlashcardsView cards={(o.content as { cards: Flashcard[] }).cards} lectureId={id} />,
            (o, close) => (
              <>
                <MenuItem
                  icon={<Layers className="size-4" />}
                  onClick={() => {
                    close()
                    exportAnki((o.content as { cards: Flashcard[] }).cards, title)
                  }}
                >
                  Anki deck (.txt)
                </MenuItem>
                <MenuItem
                  icon={<FileSpreadsheet className="size-4" />}
                  onClick={() => {
                    close()
                    const cards = (o.content as { cards: Flashcard[] }).cards
                    exportCsv(
                      [['Front', 'Back', 'Topic'], ...cards.map((c) => [c.front, c.back, c.topic])],
                      `${slug(title)}-flashcards.csv`,
                    )
                  }}
                >
                  CSV (Quizlet, Excel)
                </MenuItem>
              </>
            ),
          )}
        {tab === 'quiz' &&
          tool('quiz', (o) => (
            <QuizView key={o.id + o.created_at} questions={(o.content as { questions: QuizQuestion[] }).questions} />
          ))}
        {tab === 'podcast' &&
          tool('podcast', (o) => <PodcastView output={o as Output<PodcastContent>} onChange={setOutput} />)}
        {tab === 'visuals' &&
          tool('visuals', (o) => <VisualsView visuals={(o.content as { visuals: Visual[] }).visuals} />)}
        {tab === 'glossary' &&
          tool(
            'glossary',
            (o) => <GlossaryView terms={(o.content as { terms: GlossaryTerm[] }).terms} />,
            (o, close) => (
              <MenuItem
                icon={<FileSpreadsheet className="size-4" />}
                onClick={() => {
                  close()
                  const terms = (o.content as { terms: GlossaryTerm[] }).terms
                  exportCsv(
                    [
                      ['Term', 'Definition', 'Example', 'Category'],
                      ...terms.map((t) => [t.term, t.definition, t.example, t.category]),
                    ],
                    `${slug(title)}-glossary.csv`,
                  )
                }}
              >
                CSV
              </MenuItem>
            ),
          )}
        {tab === 'chat' && <ChatView lectureId={id} canChat={canGenerate} />}
      </div>

      <AddSourceModal
        key={addOpen ? 'open' : 'closed'}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        lectureId={id}
      />
      <EditLectureModal
        key={editOpen ? 'open' : 'closed'}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lecture={lecture}
        courses={courses}
        createCourse={createCourse}
        onSaved={(l) => {
          setLecture(l)
          setEditOpen(false)
        }}
      />
    </div>
  )
}

function EditLectureModal({
  open,
  onClose,
  lecture,
  courses,
  createCourse,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  lecture: Lecture
  courses: ReturnType<typeof useCourses>['courses']
  createCourse: ReturnType<typeof useCourses>['create']
  onSaved: (l: Lecture) => void
}) {
  const [title, setTitle] = useState(lecture.title)
  const [courseId, setCourseId] = useState<string | null>(lecture.course_id)
  const [date, setDate] = useState(lecture.lecture_date)
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Edit lecture">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const patch = { title: title.trim() || lecture.title, course_id: courseId, lecture_date: date }
          await updateLecture(lecture.id, patch)
          setBusy(false)
          onSaved({ ...lecture, ...patch })
        }}
      >
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Course</label>
          <CourseSelect courses={courses} value={courseId} onChange={setCourseId} onCreate={createCourse} />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" loading={busy}>
          Save
        </Button>
      </form>
    </Modal>
  )
}
