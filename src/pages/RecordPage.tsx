import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Mic, Pause, Play, Square, Trash2, Settings2, HardDriveDownload, ShieldCheck, Wifi, Sun } from 'lucide-react'
import {
  LectureRecorder,
  listMicrophones,
  listStoredRecordings,
  deleteStoredRecording,
  type RecordingMeta,
} from '@/lib/audio/recorder'
import { processRecording } from '@/lib/pipeline'
import { getMicPrefs } from '@/lib/micPrefs'
import { defaultLectureTitle, fmtDuration, relativeTime } from '@/lib/format'
import { getLecture } from '@/lib/db'
import { useCourses } from '@/hooks/useCourses'
import CoursePicker from '@/components/courses/CoursePicker'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToast } from '@/hooks/useToast'
import { useDialog } from '@/hooks/useDialog'

type Phase = 'setup' | 'recording' | 'saving'
const BARS = 56

export default function RecordPage() {
  const [params] = useSearchParams()
  const lectureId = params.get('lecture') || undefined
  const navigate = useNavigate()
  const toast = useToast()
  const dialog = useDialog()
  const { courses, create } = useCourses()

  const [phase, setPhase] = useState<Phase>('setup')
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [existingTitle, setExistingTitle] = useState<string | null>(null)
  const [micName, setMicName] = useState<string>('Default microphone')
  const [seconds, setSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0))
  const [stored, setStored] = useState<RecordingMeta[]>([])
  const [starting, setStarting] = useState(false)
  const recRef = useRef<LectureRecorder | null>(null)
  const lastBar = useRef(0)

  const refreshStored = useCallback(() => {
    listStoredRecordings()
      .then((r) => setStored(r.filter((m) => m.id !== recRef.current?.id)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshStored()
    const prefs = getMicPrefs()
    listMicrophones()
      .then((mics) => {
        const m =
          mics.find((d) => d.deviceId === prefs.deviceId) || mics.find((d) => d.deviceId === 'default') || mics[0]
        if (m?.label) setMicName(m.label.replace(/^Default - /, ''))
      })
      .catch(() => {})
  }, [refreshStored])

  useEffect(() => {
    if (!lectureId) return
    getLecture(lectureId)
      .then((l) => setExistingTitle(l?.title ?? null))
      .catch(() => {})
  }, [lectureId])

  // Warn before closing the tab while recording.
  useEffect(() => {
    if (phase !== 'recording') return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [phase])

  // Stop the mic if the user navigates away mid-recording (recording stays saved on device).
  useEffect(() => () => void recRef.current?.stop().catch(() => {}), [])

  async function start() {
    setStarting(true)
    try {
      const rec = new LectureRecorder()
      rec.onTick = (s) => setSeconds(s)
      rec.onLevel = (lvl) => {
        const now = performance.now()
        if (now - lastBar.current < 90) return
        lastBar.current = now
        setLevels((l) => [...l.slice(1), lvl])
      }
      await rec.start(getMicPrefs(), { title: title.trim() || defaultLectureTitle(), lectureId, courseId })
      recRef.current = rec
      setPhase('recording')
      setPaused(false)
    } catch (e) {
      const err = e as Error
      toast(
        err.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow it in your browser’s site settings and try again.'
          : err.name === 'OverconstrainedError' || err.name === 'NotFoundError'
            ? 'The selected microphone was not found. Pick another one in Settings.'
            : err.message,
        'error',
      )
    } finally {
      setStarting(false)
    }
  }

  async function stop() {
    const rec = recRef.current
    if (!rec) return
    setPhase('saving')
    try {
      const meta = await rec.stop()
      recRef.current = null
      if (meta.durationSec < 2) {
        await deleteStoredRecording(meta.id)
        toast('Recording was too short, so it was discarded.', 'info')
        setPhase('setup')
        return
      }
      const { lectureId: lid } = await processRecording(meta.id)
      toast('Saved! Transcribing in the background…', 'success')
      navigate(`/lecture/${lid}`)
    } catch (e) {
      toast(`${(e as Error).message}. Your recording is saved on this device; you can finish it below.`, 'error')
      setPhase('setup')
      refreshStored()
    }
  }

  async function discard() {
    const ok = await dialog.confirm({
      title: 'Discard this recording?',
      message: 'It cannot be recovered.',
      confirmLabel: 'Discard',
      danger: true,
    })
    if (!ok) return
    await recRef.current?.discard()
    recRef.current = null
    setPhase('setup')
    setSeconds(0)
  }

  function togglePause() {
    const rec = recRef.current
    if (!rec) return
    if (rec.isPaused) rec.resume()
    else rec.pause()
    setPaused(rec.isPaused)
  }

  // ------------------------------------------------------------------ recording UI
  if (phase !== 'setup') {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center pt-6 text-center sm:pt-12">
        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
            paused
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
          )}
        >
          <span className={cn('size-2 rounded-full', paused ? 'bg-amber-500' : 'animate-pulse bg-red-500')} />
          {phase === 'saving' ? 'Saving…' : paused ? 'Paused' : 'Recording'}
        </div>
        <div className="mt-6 font-mono text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl">
          {fmtDuration(seconds)}
        </div>
        <p className="muted mt-2 truncate text-sm">
          {existingTitle ? `Adding to “${existingTitle}”` : title || defaultLectureTitle()}
        </p>

        <div className="mt-10 flex h-24 w-full items-center justify-center gap-[3px]" aria-hidden>
          {levels.map((l, i) => (
            <span
              key={i}
              className={cn(
                'w-1 rounded-full transition-[height] duration-100',
                paused ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-accent-500',
              )}
              style={{
                height: `${Math.max(4, Math.min(96, Math.sqrt(l) * 110))}px`,
                opacity: 0.35 + (i / BARS) * 0.65,
              }}
            />
          ))}
        </div>

        <div className="mt-10 flex items-center gap-5">
          <button
            onClick={discard}
            disabled={phase === 'saving'}
            className="flex size-14 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 transition hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300"
            aria-label="Discard"
          >
            <Trash2 className="size-5" />
          </button>
          <button
            onClick={stop}
            disabled={phase === 'saving'}
            className="flex size-20 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700 disabled:opacity-60"
            aria-label="Stop and save"
          >
            <Square className="size-7 fill-current" />
          </button>
          <button
            onClick={togglePause}
            disabled={phase === 'saving'}
            className="flex size-14 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 transition hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300"
            aria-label={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
          </button>
        </div>
        <p className="muted mt-4 text-sm">Tap the red button when class ends.</p>

        <div className="card mt-10 w-full p-4 text-left text-sm">
          <div className="flex gap-3">
            <ShieldCheck className="size-5 shrink-0 text-emerald-600" />
            <p className="muted">
              Audio is saved on this device every few seconds, so nothing is lost if the tab closes or the battery dies.
            </p>
          </div>
          <div className="mt-3 flex gap-3">
            <Sun className="size-5 shrink-0 text-amber-500" />
            <p className="muted">
              Keep this page open. On phones, the screen is kept awake while you record. Plug in if it's a long class.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------ setup UI
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Record a lecture</h1>
      <p className="muted mt-1">
        {existingTitle ? (
          <>
            The recording will be added to <b className="text-zinc-800 dark:text-zinc-200">{existingTitle}</b>.
          </>
        ) : (
          'Start recording when the session begins. You can pause during breaks.'
        )}
      </p>

      <div className="card mt-6 space-y-4 p-5">
        {!lectureId && (
          <>
            <div>
              <label className="label">Lecture title (optional)</label>
              <input
                className="input"
                placeholder="The AI can name it for you"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Course</label>
              <CoursePicker courses={courses} value={courseId} onChange={setCourseId} onCreate={create} />
            </div>
          </>
        )}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3.5 py-3 dark:bg-zinc-800/60">
          <div className="flex min-w-0 items-center gap-2.5">
            <Mic className="text-accent-600 size-4 shrink-0" />
            <span className="truncate text-sm">{micName}</span>
          </div>
          <Link
            to="/settings#microphone"
            className="text-accent-600 dark:text-accent-400 flex shrink-0 items-center gap-1 text-sm font-medium"
          >
            <Settings2 className="size-4" /> Change
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <button
          onClick={start}
          disabled={starting}
          className="group bg-accent-600 shadow-accent-600/30 hover:bg-accent-700 flex size-28 items-center justify-center rounded-full text-white shadow-xl transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
          aria-label="Start recording"
        >
          <Mic className="size-11" />
        </button>
        <span className="mt-3 font-medium">{starting ? 'Starting…' : 'Tap to start'}</span>
        <span className="muted mt-1 flex items-center gap-1.5 text-xs">
          <Wifi className="size-3.5" /> Works offline. Transcription happens after you stop.
        </span>
      </div>

      {stored.length > 0 && (
        <div className="mt-10">
          <h2 className="flex items-center gap-2 font-semibold">
            <HardDriveDownload className="size-4" /> Saved on this device
          </h2>
          <p className="muted mt-1 text-sm">
            These recordings were not finished (closed tab, no connection, or an error). Process them now.
          </p>
          <ul className="mt-3 space-y-2">
            {stored.map((r) => (
              <li key={r.id} className="card flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.title}</div>
                  <div className="muted text-xs">
                    {fmtDuration(r.durationSec)} · recorded {relativeTime(new Date(r.startedAt).toISOString())}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const { lectureId: lid } = await processRecording(r.id)
                      navigate(`/lecture/${lid}`)
                    } catch (e) {
                      toast((e as Error).message, 'error')
                    }
                  }}
                >
                  Process
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const ok = await dialog.confirm({
                      title: 'Delete this recording from the device?',
                      message: 'It has not been processed yet, so it cannot be recovered.',
                      confirmLabel: 'Delete',
                      danger: true,
                    })
                    if (!ok) return
                    await deleteStoredRecording(r.id)
                    refreshStored()
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
