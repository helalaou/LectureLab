import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Sun, Moon, Monitor, Mic, KeyRound, Sparkles, User, CheckCircle2, AlertTriangle, Play, Loader2, ExternalLink, Eye, EyeOff } from 'lucide-react'
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
const VOICES = ['marin', 'cedar', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse']
const LANGUAGES = ['English', 'Spanish', 'French', 'Arabic', 'Portuguese', 'Chinese (Simplified)', 'Vietnamese', 'Korean', 'Haitian Creole', 'Russian', 'Hindi', 'Tagalog', 'German', 'Italian', 'Japanese']

function Section({ id, icon, title, description, children }: { id?: string; icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300">{icon}</div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="muted mt-0.5 text-sm">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Select({ label, value, onChange, options, hint }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; hint?: string }) {
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
            { value: 'light', label: <><Sun className="size-4" /> Light</> },
            { value: 'dark', label: <><Moon className="size-4" /> Dark</> },
            { value: 'system', label: <><Monitor className="size-4" /> Auto</> },
          ]}
        />
      </Section>

      <MicrophoneSection />

      <ApiKeySection />

      <Section icon={<Sparkles className="size-5" />} title="Study material" description="How the AI writes your notes, cards and quizzes.">
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
              <Select label="Writing model" value={settings.text_model} onChange={(text_model) => set({ text_model })} options={TEXT_MODELS} />
              <Select label="Transcription model" value={settings.transcription_model} onChange={(transcription_model) => set({ transcription_model })} options={TRANSCRIBE_MODELS} />
              <Select label="Voice model" value={settings.tts_model} onChange={(tts_model) => set({ tts_model })} options={TTS_MODELS} />
              <div className="grid gap-4 sm:grid-cols-2">
                <VoicePicker label="Host 1 · Maya" speaker="A" value={settings.host_a_voice} onChange={(host_a_voice) => set({ host_a_voice })} />
                <VoicePicker label="Host 2 · Theo" speaker="B" value={settings.host_b_voice} onChange={(host_b_voice) => set({ host_b_voice })} />
              </div>
            </div>
          </details>
        </div>
      </Section>

      <Section icon={<User className="size-5" />} title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {user?.photoURL && <img src={user.photoURL} alt="" className="size-10 rounded-full" referrerPolicy="no-referrer" />}
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

  const loadMics = () => listMicrophones().then(setMics).catch(() => {})
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
      toast((e as Error).name === 'NotAllowedError' ? 'Microphone permission is blocked for this site.' : (e as Error).message, 'error')
    }
  }

  return (
    <Section id="microphone" icon={<Mic className="size-5" />} title="Microphone" description="Plug in a USB or lapel mic for the best transcripts. This choice is saved on this device.">
      <div className="space-y-4">
        <div>
          <label className="label">Input device</label>
          <select className="input" value={prefs.deviceId ?? ''} onChange={(e) => save({ ...prefs, deviceId: e.target.value || undefined })}>
            <option value="">System default</option>
            {mics
              .filter((m) => m.deviceId && m.deviceId !== 'default')
              .map((m, i) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || `Microphone ${i + 1}`}
                </option>
              ))}
          </select>
          {mics.length > 0 && !mics[0].label && <p className="muted mt-1 text-xs">Click “Test microphone” once to see device names.</p>}
        </div>

        <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <Button size="sm" variant={testing ? 'secondary' : 'soft'} onClick={() => (testing ? stopRef.current() : startTest())}>
              {testing ? 'Stop test' : 'Test microphone'}
            </Button>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div className={cx('h-full rounded-full transition-[width] duration-75', level > 0.85 ? 'bg-red-500' : level > 0.05 ? 'bg-emerald-500' : 'bg-zinc-400')} style={{ width: `${Math.min(100, Math.sqrt(level) * 100)}%` }} />
            </div>
          </div>
          {testing && <p className="muted mt-2 text-xs">Talk normally. The bar should move into green. If it hits red, move the mic further away.</p>}
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <Toggle checked={prefs.noiseSuppression} onChange={(v) => save({ ...prefs, noiseSuppression: v })} label="Noise suppression" description="Reduces fans, AC hum and chatter." />
          <Toggle checked={prefs.autoGainControl} onChange={(v) => save({ ...prefs, autoGainControl: v })} label="Automatic volume" description="Boosts a teacher who is far from the mic." />
          <Toggle checked={prefs.echoCancellation} onChange={(v) => save({ ...prefs, echoCancellation: v })} label="Echo cancellation" description="Only needed if speakers are playing nearby. Usually best off in a classroom." />
        </div>
      </div>
    </Section>
  )
}

