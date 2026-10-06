import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Sun,
  Moon,
  Monitor,
  Mic,
  KeyRound,
  Sparkles,
  User,
  CheckCircle2,
  AlertTriangle,
  Play,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import { useAuth } from '../hooks/useAuth'
import { useAccess } from '../hooks/useAccess'
import { listMicrophones, micConstraints, type MicPrefs } from '../lib/audio/recorder'
import { getMicPrefs, setMicPrefs } from '../lib/micPrefs'
import { apiBlob, apiJson } from '../lib/api'
import { deleteAllData } from '../lib/db'
import { Button, Segmented, Toggle, useToast, cx, Badge } from '../components/ui'
import type { UserSettings } from '../lib/types'

const TEXT_MODELS = [
  { value: 'gpt-6-luna', label: 'GPT-6 Luna (recommended: fast and cheapest)' },
  { value: 'gpt-6.1-sol', label: 'GPT-6.1 Sol (higher quality, costs more)' },
  { value: 'gpt-6-astra', label: 'GPT-6 Astra (best quality, most expensive)' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini (older)' },
]
const TRANSCRIBE_MODELS = [
  { value: 'gpt-transcribe', label: 'GPT Transcribe (recommended)' },
  { value: 'gpt-4o-transcribe', label: 'GPT-4o Transcribe (retiring Feb 2027)' },
  { value: 'gpt-4o-mini-transcribe', label: 'GPT-4o mini Transcribe (retiring Feb 2027)' },
]
const TTS_MODELS = [
  { value: 'gpt-4o-mini-tts', label: 'GPT-4o mini TTS (recommended, expressive)' },
  { value: 'gpt-realtime-2.1-mini', label: 'GPT Realtime 2.1 mini (newer)' },
  { value: 'tts-1', label: 'TTS-1 (classic, retiring Jan 2027)' },
]
const VOICES = [
  'marin',
  'cedar',
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
]
const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'Arabic',
  'Portuguese',
  'Chinese (Simplified)',
  'Vietnamese',
  'Korean',
  'Haitian Creole',
  'Russian',
  'Hindi',
  'Tagalog',
  'German',
  'Italian',
  'Japanese',
]

function Section({
  id,
  icon,
  title,
  description,
  children,
}: {
  id?: string
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300 flex size-9 shrink-0 items-center justify-center rounded-xl">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="muted mt-0.5 text-sm">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  hint?: string
}) {
  const known = options.some((o) => o.value === value)
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {!known && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const { settings, update } = useSettings()
  const { user, signOut } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
  }, [])

  const set = (patch: Partial<UserSettings>) => update(patch).catch((e) => toast(e.message, 'error'))

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>

      <Section icon={<Sun className="size-5" />} title="Appearance">
        <Segmented
          value={settings.theme}
          onChange={(theme) => set({ theme })}
          options={[
            {
              value: 'light',
              label: (
                <>
                  <Sun className="size-4" /> Light
                </>
              ),
            },
            {
              value: 'dark',
              label: (
                <>
                  <Moon className="size-4" /> Dark
                </>
              ),
            },
            {
              value: 'system',
              label: (
                <>
                  <Monitor className="size-4" /> Auto
                </>
              ),
            },
          ]}
        />
      </Section>

      <MicrophoneSection />

      <ApiKeySection />

      <Section
        icon={<Sparkles className="size-5" />}
        title="Study material"
        description="How the AI writes your notes, cards and quizzes."
      >
        <div className="space-y-5">
          <div>
            <label className="label">Detail level</label>
            <Segmented
              value={settings.detail_level}
              onChange={(detail_level) => set({ detail_level })}
              options={[
                { value: 'concise', label: 'Concise' },
                { value: 'standard', label: 'Standard' },
                { value: 'detailed', label: 'Detailed' },
              ]}
            />
          </div>
          <Select
            label="Write study material in"
            value={settings.output_language}
            onChange={(output_language) => set({ output_language })}
            options={LANGUAGES.map((l) => ({ value: l, label: l }))}
            hint="Lectures can be in any language. This only changes the language of notes, cards and answers."
          />
          <details className="group rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <summary className="cursor-pointer text-sm font-medium">Advanced: AI models and podcast voices</summary>
            <div className="mt-4 space-y-4">
              <Select
                label="Writing model"
                value={settings.text_model}
                onChange={(text_model) => set({ text_model })}
                options={TEXT_MODELS}
              />
              <Select
                label="Transcription model"
                value={settings.transcription_model}
                onChange={(transcription_model) => set({ transcription_model })}
                options={TRANSCRIBE_MODELS}
              />
              <Select
                label="Voice model"
                value={settings.tts_model}
                onChange={(tts_model) => set({ tts_model })}
                options={TTS_MODELS}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <VoicePicker
                  label="Host 1 · Maya"
                  speaker="A"
                  value={settings.host_a_voice}
                  onChange={(host_a_voice) => set({ host_a_voice })}
                />
                <VoicePicker
                  label="Host 2 · Theo"
                  speaker="B"
                  value={settings.host_b_voice}
                  onChange={(host_b_voice) => set({ host_b_voice })}
                />
              </div>
            </div>
          </details>
        </div>
      </Section>

      <Section icon={<User className="size-5" />} title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {user?.photoURL && (
              <img src={user.photoURL} alt="" className="size-10 rounded-full" referrerPolicy="no-referrer" />
            )}
            <div>
              <div className="font-medium">{user?.displayName || 'Signed in'}</div>
              <div className="muted text-sm">{user?.email}</div>
            </div>
          </div>
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </div>
        <DeleteData />
      </Section>

      <p className="muted pb-4 text-center text-xs">
        LectureLab is open source ·{' '}
        <a className="underline" href="https://github.com/helalaou/lecturelab" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
    </div>
  )
}

// ------------------------------------------------------------------ microphone

function MicrophoneSection() {
  const [prefs, setPrefs] = useState<MicPrefs>(getMicPrefs)
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [testing, setTesting] = useState(false)
  const [level, setLevel] = useState(0)
  const stopRef = useRef<() => void>(() => {})
  const toast = useToast()

  const loadMics = () =>
    listMicrophones()
      .then(setMics)
      .catch(() => {})
  useEffect(() => {
    loadMics()
    navigator.mediaDevices?.addEventListener?.('devicechange', loadMics)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', loadMics)
      stopRef.current()
    }
  }, [])

  const save = (p: MicPrefs) => {
    setPrefs(p)
    setMicPrefs(p)
    if (testing) {
      stopRef.current()
      setTimeout(() => startTest(p), 50)
    }
  }

  async function startTest(p = prefs) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(micConstraints(p))
      const ctx = new AudioContext()
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      ctx.createMediaStreamSource(stream).connect(an)
      const data = new Uint8Array(an.fftSize)
      let raf = 0
      const loop = () => {
        an.getByteTimeDomainData(data)
        let peak = 0
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128)
        setLevel((l) => Math.max(peak, l * 0.85))
        raf = requestAnimationFrame(loop)
      }
      loop()
      setTesting(true)
      loadMics()
      stopRef.current = () => {
        cancelAnimationFrame(raf)
        stream.getTracks().forEach((t) => t.stop())
        ctx.close().catch(() => {})
        setTesting(false)
        setLevel(0)
        stopRef.current = () => {}
      }
    } catch (e) {
      toast(
        (e as Error).name === 'NotAllowedError'
          ? 'Microphone permission is blocked for this site.'
          : (e as Error).message,
        'error',
      )
    }
  }

  return (
    <Section
      id="microphone"
      icon={<Mic className="size-5" />}
      title="Microphone"
      description="Plug in a USB or lapel mic for the best transcripts. This choice is saved on this device."
    >
      <div className="space-y-4">
        <div>
          <label className="label">Input device</label>
          <select
            className="input"
            value={prefs.deviceId ?? ''}
            onChange={(e) => save({ ...prefs, deviceId: e.target.value || undefined })}
          >
            <option value="">System default</option>
            {mics
              .filter((m) => m.deviceId && m.deviceId !== 'default')
              .map((m, i) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || `Microphone ${i + 1}`}
                </option>
              ))}
          </select>
          {mics.length > 0 && !mics[0].label && (
            <p className="muted mt-1 text-xs">Click “Test microphone” once to see device names.</p>
          )}
        </div>

        <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={testing ? 'secondary' : 'soft'}
              onClick={() => (testing ? stopRef.current() : startTest())}
            >
              {testing ? 'Stop test' : 'Test microphone'}
            </Button>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={cx(
                  'h-full rounded-full transition-[width] duration-75',
                  level > 0.85 ? 'bg-red-500' : level > 0.05 ? 'bg-emerald-500' : 'bg-zinc-400',
                )}
                style={{ width: `${Math.min(100, Math.sqrt(level) * 100)}%` }}
              />
            </div>
          </div>
          {testing && (
            <p className="muted mt-2 text-xs">
              Talk normally. The bar should move into green. If it hits red, move the mic further away.
            </p>
          )}
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <Toggle
            checked={prefs.noiseSuppression}
            onChange={(v) => save({ ...prefs, noiseSuppression: v })}
            label="Noise suppression"
            description="Reduces fans, AC hum and chatter."
          />
          <Toggle
            checked={prefs.autoGainControl}
            onChange={(v) => save({ ...prefs, autoGainControl: v })}
            label="Automatic volume"
            description="Boosts a teacher who is far from the mic."
          />
          <Toggle
            checked={prefs.echoCancellation}
            onChange={(v) => save({ ...prefs, echoCancellation: v })}
            label="Echo cancellation"
            description="Only needed if speakers are playing nearby. Usually best off in a classroom."
          />
        </div>
      </div>
    </Section>
  )
}

// ------------------------------------------------------------------ API key

function ApiKeySection() {
  const { access, error, refresh } = useAccess()
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  return (
    <Section
      id="api-key"
      icon={<KeyRound className="size-5" />}
      title="Your OpenAI API key"
      description="Optional if your email is on this app's free-access list. Otherwise, add your own key. You only pay OpenAI for what you use."
    >
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {access && (
        <div className="mb-4 flex flex-wrap gap-2">
          {access.hasOwnKey ? (
            <Badge tone="green">
              <CheckCircle2 className="size-3.5" /> Using your key ····{access.ownKeyLast4}
            </Badge>
          ) : access.allowlisted ? (
            <Badge tone="green">
              <CheckCircle2 className="size-3.5" /> Free access enabled for your account
            </Badge>
          ) : (
            <Badge tone="amber">
              <AlertTriangle className="size-3.5" /> Add a key to use AI features
            </Badge>
          )}
        </div>
      )}
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await apiJson('/api/key', { method: 'POST', body: JSON.stringify({ key }) })
            setKey('')
            toast('Key saved and verified.', 'success')
            refresh()
          } catch (err) {
            toast((err as Error).message, 'error')
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="relative">
          <input
            className="input pr-11 font-mono text-sm"
            type={show ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            placeholder={access?.hasOwnKey ? 'Paste a new key to replace it' : 'sk-...'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" loading={busy} disabled={!key.trim()}>
            Save key
          </Button>
          {access?.hasOwnKey && (
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                if (!confirm('Remove your key?')) return
                await apiJson('/api/key', { method: 'DELETE' })
                toast('Key removed.')
                refresh()
              }}
            >
              Remove key
            </Button>
          )}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            className="text-accent-600 dark:text-accent-400 ml-auto flex items-center gap-1 text-sm font-medium"
          >
            Get a key <ExternalLink className="size-3.5" />
          </a>
        </div>
        <p className="muted text-xs">
          Your key is encrypted on the server and never sent back to the browser. With the default models, transcribing
          a 1-hour lecture costs about $0.30, and each study tool costs less than a cent.
        </p>
      </form>
    </Section>
  )
}

// ------------------------------------------------------------------ voices

function VoicePicker({
  label,
  speaker,
  value,
  onChange,
}: {
  label: string
  speaker: 'A' | 'B'
  value: string
  onChange: (v: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <select className="input capitalize" value={value} onChange={(e) => onChange(e.target.value)}>
          {VOICES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          aria-label="Preview voice"
          onClick={async () => {
            setLoading(true)
            try {
              const blob = await apiBlob('/api/tts', {
                speaker,
                text:
                  speaker === 'A'
                    ? "Hi, I'm Maya. Let's break down today's lecture together."
                    : "And I'm Theo. I'll ask the questions you're probably thinking!",
              })
              const audio = new Audio(URL.createObjectURL(blob))
              await audio.play()
            } catch (e) {
              toast((e as Error).message, 'error')
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        </Button>
      </div>
      <p className="muted mt-1 text-xs">Save the voice first, then preview.</p>
    </div>
  )
}

// ------------------------------------------------------------------ delete data

function DeleteData() {
  const [busy, setBusy] = useState(false)
  const { signOut } = useAuth()
  const toast = useToast()
  return (
    <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</h3>
      <p className="muted mt-1 text-sm">
        Permanently delete all your lectures, recordings, study material and your saved API key.
      </p>
      <Button
        className="mt-3"
        variant="danger"
        size="sm"
        loading={busy}
        onClick={async () => {
          if (prompt('Type DELETE to permanently erase all your data.') !== 'DELETE') return
          setBusy(true)
          try {
            await deleteAllData()
            await apiJson('/api/key', { method: 'DELETE' }).catch(() => {})
            toast('All your data was deleted.', 'success')
            await signOut()
          } catch (e) {
            toast((e as Error).message, 'error')
          } finally {
            setBusy(false)
          }
        }}
      >
        Delete all my data
      </Button>
    </div>
  )
}
