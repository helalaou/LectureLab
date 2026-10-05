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

