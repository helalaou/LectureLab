import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Headphones, Download, Wand2, Gauge } from 'lucide-react'
import type { Output, PodcastContent } from '../../lib/types'
import { auth } from '../../lib/firebase'
import { updateOutput } from '../../lib/db'
import { audioUrl, deleteAudio, fetchAudioBlob, uploadAudio } from '../../lib/storage'
import { apiBlob, ApiError } from '../../lib/api'
import { download } from '../../lib/export'
import { slug } from '../../lib/format'
import { Button, Progress, cx, useToast } from '../ui'

type PodcastData = PodcastContent & { _audio_offsets?: number[] }

// ------------------------------------------------------------------ background audio jobs
const jobs: Record<string, number> = {} // outputId -> progress 0..1
let snapshot = { ...jobs }
const subs = new Set<() => void>()
const publish = () => {
  snapshot = { ...jobs }
  subs.forEach((s) => s())
}
const useAudioJobs = () =>
  useSyncExternalStore(
    (l) => {
      subs.add(l)
      return () => subs.delete(l)
    },
    () => snapshot,
  )

async function makeAudio(output: Output<PodcastData>): Promise<Output<PodcastData>> {
  const segs = output.content.segments
  const blobs: Blob[] = new Array(segs.length)
  let done = 0
  let next = 0
  jobs[output.id] = 0
  publish()
  try {
    const worker = async () => {
      while (next < segs.length) {
        const i = next++
        for (let attempt = 1; ; attempt++) {
          try {
            blobs[i] = await apiBlob('/api/tts', { text: segs[i].text, speaker: segs[i].speaker })
            break
          } catch (e) {
            if (attempt >= 3 || [400, 401, 402].includes((e as ApiError).status)) throw e
            await new Promise((r) => setTimeout(r, 1200 * attempt))
          }
        }
        done++
        jobs[output.id] = done / segs.length
        publish()
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()])

    // Byte offsets let us highlight the current line (OpenAI TTS MP3 is constant bitrate).
    const offsets: number[] = []
    let total = 0
    for (const b of blobs) {
      offsets.push(total)
      total += b.size
    }
    offsets.push(total)
    const mp3 = new Blob(blobs, { type: 'audio/mpeg' })

    const path = `${auth.currentUser!.uid}/${output.lecture_id}/podcast-${Date.now()}.mp3`
    await uploadAudio(path, mp3)
    if (output.audio_path) await deleteAudio(output.audio_path).catch(() => {})
    const content = { ...output.content, _audio_offsets: offsets }
    return (await updateOutput(output.lecture_id, 'podcast', { audio_path: path, content })) as Output<PodcastData>
  } finally {
    delete jobs[output.id]
    publish()
  }
}

// ------------------------------------------------------------------ view

const SPEEDS = [1, 1.25, 1.5, 1.75, 2]

export default function PodcastView({ output, onChange }: { output: Output<PodcastData>; onChange: (o: Output) => void }) {
  const p = output.content
  const job = useAudioJobs()[output.id]
  const toast = useToast()
  const [url, setUrl] = useState<string | null>(null)
  const [speed, setSpeed] = useState(1)
  const [current, setCurrent] = useState(-1)
  const audioRef = useRef<HTMLAudioElement>(null)
  const offsets = p._audio_offsets

  useEffect(() => {
    if (!output.audio_path) return setUrl(null)
    audioUrl(output.audio_path)
      .then(setUrl)
      .catch(() => setUrl(null))
  }, [output.audio_path])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed, url])

  const onTime = () => {
    const a = audioRef.current
    if (!a || !offsets || !a.duration) return
    const byte = (a.currentTime / a.duration) * offsets[offsets.length - 1]
    let i = 0
    while (i < offsets.length - 2 && offsets[i + 1] <= byte) i++
    if (i !== current) setCurrent(i)
  }

  const seekTo = (i: number) => {
    const a = audioRef.current
    if (!a || !offsets || !a.duration) return
    a.currentTime = (offsets[i] / offsets[offsets.length - 1]) * a.duration
    a.play()
  }

  useEffect(() => {
    if (current < 0) return
    document.getElementById(`pline-${current}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [current])

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-accent-600 to-violet-700 p-5 text-white sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-accent-100 uppercase">
            <Headphones className="size-4" /> Study podcast · Maya & Theo
          </div>
          <h2 className="mt-2 text-xl font-semibold text-balance">{p.title}</h2>
          <p className="mt-1 text-sm text-accent-100">{p.description}</p>
        </div>
        <div className="p-4 sm:p-5">
          {job !== undefined ? (
            <div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Recording the episode…</span>
                <span className="muted tabular-nums">{Math.round(job * 100)}%</span>
              </div>
              <Progress className="mt-2" value={job} />
              <p className="muted mt-2 text-xs">Usually 30–90 seconds. You can switch tabs, but keep the app open.</p>
            </div>
          ) : url ? (
            <div className="space-y-3">
              <audio ref={audioRef} src={url} controls preload="metadata" className="w-full" onTimeUpdate={onTime} />
              <div className="flex flex-wrap items-center gap-2">
                <Gauge className="muted size-4" />
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={cx('rounded-lg px-2.5 py-1 text-sm font-medium', speed === s ? 'bg-accent-600 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300')}
                  >
                    {s}×
                  </button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  icon={<Download className="size-4" />}
                  onClick={async () => {
                    download(`${slug(p.title)}.mp3`, await fetchAudioBlob(url), 'audio/mpeg')
                  }}
                >
                  MP3
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="muted text-sm">The script is ready. Turn it into audio you can listen to anywhere.</p>
              <Button
                icon={<Wand2 className="size-4" />}
                onClick={async () => {
                  try {
                    onChange(await makeAudio(output))
                    toast('Your podcast is ready 🎧', 'success')
                  } catch (e) {
                    toast((e as Error).message, 'error')
                  }
                }}
              >
                Create audio
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <h3 className="mb-3 font-semibold">Script</h3>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {p.segments.map((s, i) => (
            <button
              id={`pline-${i}`}
              key={i}
              onClick={() => seekTo(i)}
              className={cx('flex w-full gap-3 rounded-xl p-2 text-left transition', current === i ? 'bg-accent-50 dark:bg-accent-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50')}
            >
              <span
                className={cx(
                  'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  s.speaker === 'A' ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200',
                )}
              >
                {s.speaker === 'A' ? 'M' : 'T'}
              </span>
              <p className="text-[15px] leading-relaxed">
                <span className="mr-1.5 font-semibold">{s.speaker === 'A' ? 'Maya' : 'Theo'}</span>
                {s.text}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
