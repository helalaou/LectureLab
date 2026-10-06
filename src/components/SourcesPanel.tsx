import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic,
  AudioLines,
  FileText,
  Type,
  Plus,
  Trash2,
  RotateCcw,
  ChevronDown,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
} from 'lucide-react'
import type { Source } from '../lib/types'
import { addDocument, addMediaFile, addText, deleteSource, retryRecordingSource, useJobs } from '../lib/pipeline'
import { DOC_ACCEPT } from '../lib/docs'
import { audioUrl as getAudioUrl } from '../lib/storage'
import { fmtDuration, wordCount } from '../lib/format'
import { Button, Modal, Progress, useToast, cx, IconButton, Badge } from './ui'

const KIND = {
  recording: { icon: Mic, label: 'Class recording' },
  audio: { icon: AudioLines, label: 'Audio / video' },
  document: { icon: FileText, label: 'Document' },
  text: { icon: Type, label: 'Notes' },
}

export function AddSourceModal({
  open,
  onClose,
  lectureId,
}: {
  open: boolean
  onClose: () => void
  lectureId: string
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const mediaRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const [pasting, setPasting] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')

  const options = [
    {
      icon: Mic,
      title: 'Record now',
      text: 'Use your microphone during class',
      action: 'record' as const,
    },
    {
      icon: AudioLines,
      title: 'Upload recordings',
      text: 'MP3, M4A, WAV, WEBM, or video files (MP4, MOV)',
      action: 'media' as const,
    },
    {
      icon: FileText,
      title: 'Upload documents',
      text: 'Slides or readings as PDF, Word (.docx), or TXT',
      action: 'documents' as const,
    },
    {
      icon: Type,
      title: 'Paste text',
      text: 'Your own notes, a syllabus, or a textbook passage',
      action: 'paste' as const,
    },
  ]

  function choose(action: (typeof options)[number]['action']) {
    if (action === 'record') navigate(`/record?lecture=${lectureId}`)
    else if (action === 'media') mediaRef.current?.click()
    else if (action === 'documents') docRef.current?.click()
    else setPasting(true)
  }

  return (
    <Modal open={open} onClose={onClose} title={pasting ? 'Paste text' : 'Add a source'}>
      {!pasting ? (
        <>
          <p className="muted mb-4 text-sm">
            Add as many sources as you like. Every study tool uses all of them together.
          </p>
          <div className="grid gap-2.5">
            {options.map(({ icon: Icon, title, text, action }) => (
              <button
                key={title}
                onClick={() => choose(action)}
                className="hover:border-accent-400 hover:bg-accent-50/50 dark:hover:border-accent-700 dark:hover:bg-accent-950/30 flex items-center gap-4 rounded-2xl border border-zinc-200 p-4 text-left transition dark:border-zinc-800"
              >
                <div className="bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300 flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="muted text-sm">{text}</div>
                </div>
              </button>
            ))}
          </div>
          <input
            ref={mediaRef}
            type="file"
            accept="audio/*,video/*,.m4a,.mp3,.wav,.webm,.ogg,.aac,.flac,.mp4,.mov,.mkv"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              e.target.value = ''
              if (!files.length) return
              onClose()
              ;(async () => {
                for (const f of files) await addMediaFile(lectureId, f).catch((err) => toast(err.message, 'error'))
              })()
              toast(files.length > 1 ? `Processing ${files.length} files…` : 'Processing your file…')
            }}
          />
          <input
            ref={docRef}
            type="file"
            accept={DOC_ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              e.target.value = ''
              if (!files.length) return
              onClose()
              files.forEach((f) => addDocument(lectureId, f).catch((err) => toast(err.message, 'error')))
            }}
          />
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!text.trim()) return
            await addText(lectureId, title, text).catch((err) => toast(err.message, 'error'))
            onClose()
          }}
        >
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              placeholder="e.g. My notes, Chapter 3 reading"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Text</label>
            <textarea
              className="input min-h-56"
              placeholder="Paste or type here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            <p className="muted mt-1 text-xs">{wordCount(text).toLocaleString()} words</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setPasting(false)}>
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={!text.trim()}>
              Add text
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function SourceItem({ source }: { source: Source }) {
  const job = useJobs()[source.id]
  const [open, setOpen] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [time, setTime] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const toast = useToast()
  const meta = KIND[source.kind]
  const Icon = meta.icon
  const processing = !!job || source.status === 'uploading' || source.status === 'transcribing'

  useEffect(() => {
    if (!open || !source.storage_path || audioUrl) return
    getAudioUrl(source.storage_path)
      .then(setAudioUrl)
      .catch(() => setAudioUrl(null))
  }, [open, source.storage_path, audioUrl])

  const words = wordCount(source.content)

  return (
    <li className="card overflow-hidden">
      <div className="flex items-center gap-3 p-3.5 sm:p-4">
        <div
          className={cx(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            source.status === 'error'
              ? 'bg-red-50 text-red-600 dark:bg-red-950/50'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
          )}
        >
          {processing ? (
            <Loader2 className="text-accent-600 size-5 animate-spin" />
          ) : source.status === 'error' ? (
            <AlertCircle className="size-5" />
          ) : (
            <Icon className="size-5" />
          )}
        </div>
        <button className="min-w-0 flex-1 text-left" onClick={() => source.status === 'ready' && setOpen((o) => !o)}>
          <div className="truncate font-medium">{source.title}</div>
          <div className="muted mt-0.5 truncate text-xs">
            {processing
              ? job?.stage || (source.status === 'transcribing' ? 'Transcribing…' : 'Uploading…')
              : source.status === 'error'
                ? 'Failed'
                : [
                    meta.label,
                    source.duration_sec ? fmtDuration(source.duration_sec) : null,
                    `${words.toLocaleString()} words`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
          </div>
        </button>
        {source.status === 'ready' && (
          <IconButton label={open ? 'Hide' : 'Show content'} onClick={() => setOpen((o) => !o)}>
            <ChevronDown className={cx('size-5 transition-transform', open && 'rotate-180')} />
          </IconButton>
        )}
        {!processing && (
          <IconButton
            label="Delete source"
            onClick={async () => {
              if (!confirm(`Delete "${source.title}"?`)) return
              await deleteSource(source)
            }}
          >
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </div>
      {processing && job?.progress !== undefined && <Progress className="rounded-none" value={job.progress} />}
      {processing && !job && (
        <p className="muted px-4 pb-3 text-xs">Processing on another device or tab. Refresh in a bit.</p>
      )}

      {source.status === 'error' && (
        <div className="border-t border-red-100 bg-red-50/60 px-4 py-3 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/20 dark:text-red-300">
          {source.error}
          {source.kind === 'recording' && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              loading={retrying}
              icon={<RotateCcw className="size-4" />}
              onClick={async () => {
                setRetrying(true)
                try {
                  await retryRecordingSource(source.id)
                } catch (e) {
                  toast((e as Error).message, 'error')
                } finally {
                  setRetrying(false)
                }
              }}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {open && (
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          {audioUrl && (
            <div className="sticky top-14 z-10 bg-white/95 px-4 pt-3 pb-2 backdrop-blur sm:top-16 dark:bg-zinc-900/95">
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                preload="metadata"
                className="w-full"
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              />
            </div>
          )}
          <div className="flex justify-end px-4 pt-2">
            <Button
              size="sm"
              variant="ghost"
              icon={<Copy className="size-4" />}
              onClick={() => {
                navigator.clipboard.writeText(source.content)
                toast('Copied', 'success')
              }}
            >
              Copy text
            </Button>
          </div>
          <div className="max-h-[55vh] overflow-y-auto px-4 pb-4">
            {source.segments?.length ? (
              <div className="space-y-1">
                {source.segments.map((s, i) => {
                  const active = time >= s.start && time < s.end
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (!audioRef.current) return
                        audioRef.current.currentTime = s.start
                        audioRef.current.play()
                      }}
                      className={cx(
                        'flex w-full gap-3 rounded-lg px-2 py-1.5 text-left text-[15px] leading-relaxed transition',
                        active ? 'bg-accent-50 dark:bg-accent-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                      )}
                    >
                      <span className="muted w-12 shrink-0 pt-0.5 font-mono text-xs tabular-nums">
                        {fmtDuration(s.start)}
                      </span>
                      <span>{s.text}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{source.content}</p>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export default function SourcesPanel({
  sources,
  onAdd,
  onMakeAll,
  makingAll,
}: {
  sources: Source[]
  onAdd: () => void
  onMakeAll: () => void
  makingAll: boolean
}) {
  const ready = sources.filter((s) => s.status === 'ready')
  const totalWords = ready.reduce((n, s) => n + wordCount(s.content), 0)
  return (
    <div className="space-y-4">
      {sources.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <div className="bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300 mx-auto flex size-14 items-center justify-center rounded-2xl">
            <Plus className="size-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Add your first source</h3>
          <p className="muted mx-auto mt-1 max-w-sm">
            Record the class, or upload old recordings, slides, readings or your own notes. Mix and match as many as you
            want.
          </p>
          <Button className="mt-6" size="lg" icon={<Plus className="size-5" />} onClick={onAdd}>
            Add source
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="muted text-sm">
              {sources.length} source{sources.length === 1 ? '' : 's'} · {totalWords.toLocaleString()} words ready
            </p>
            <Button variant="secondary" icon={<Plus className="size-4" />} onClick={onAdd}>
              Add source
            </Button>
          </div>
          <ul className="space-y-2.5">
            {sources.map((s) => (
              <SourceItem key={s.id} source={s} />
            ))}
          </ul>
          {ready.length > 0 && (
            <div className="border-accent-300 bg-accent-50/50 dark:border-accent-800 dark:bg-accent-950/20 rounded-2xl border border-dashed p-5 text-center">
              <Sparkles className="text-accent-600 mx-auto size-6" />
              <h3 className="mt-2 font-semibold">Ready to study?</h3>
              <p className="muted mx-auto mt-1 max-w-md text-sm">
                Create everything at once: summary, notes, flashcards, quiz, glossary, visuals, study guide and the
                podcast script. Takes about a minute.
              </p>
              <Button className="mt-4" loading={makingAll} icon={<Sparkles className="size-4" />} onClick={onMakeAll}>
                {makingAll ? 'Making your study kit…' : 'Make my study kit'}
              </Button>
              <div className="mt-2">
                <Badge tone="accent">Tip: add all your sources first</Badge>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
