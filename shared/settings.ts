/** User-tunable settings and the options offered for each. */

export type Theme = 'light' | 'dark' | 'system'
export type DetailLevel = 'concise' | 'standard' | 'detailed'

export interface UserSettings {
  theme: Theme
  transcription_model: string
  text_model: string
  tts_model: string
  host_a_voice: string
  host_b_voice: string
  detail_level: DetailLevel
  output_language: string
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  transcription_model: 'gpt-transcribe',
  text_model: 'gpt-6-luna',
  tts_model: 'gpt-4o-mini-tts',
  host_a_voice: 'marin',
  host_b_voice: 'cedar',
  detail_level: 'standard',
  output_language: 'English',
}

export interface ModelOption {
  value: string
  label: string
}

export const TEXT_MODELS: ModelOption[] = [
  { value: 'gpt-6-luna', label: 'GPT-6 Luna (recommended: fast and cheapest)' },
  { value: 'gpt-6.1-sol', label: 'GPT-6.1 Sol (higher quality, costs more)' },
  { value: 'gpt-6-astra', label: 'GPT-6 Astra (best quality, most expensive)' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini (older)' },
]

export const TRANSCRIPTION_MODELS: ModelOption[] = [
  { value: 'gpt-transcribe', label: 'GPT Transcribe (recommended)' },
  { value: 'gpt-4o-transcribe', label: 'GPT-4o Transcribe (retiring Feb 2027)' },
  { value: 'gpt-4o-mini-transcribe', label: 'GPT-4o mini Transcribe (retiring Feb 2027)' },
]

export const TTS_MODELS: ModelOption[] = [
  { value: 'gpt-4o-mini-tts', label: 'GPT-4o mini TTS (recommended, expressive)' },
  { value: 'gpt-realtime-2.1-mini', label: 'GPT Realtime 2.1 mini (newer)' },
  { value: 'tts-1', label: 'TTS-1 (classic, retiring Jan 2027)' },
]

export const TTS_VOICES = [
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
] as const

export const OUTPUT_LANGUAGES = [
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
] as const
