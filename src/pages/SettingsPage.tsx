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

