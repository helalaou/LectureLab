import {
  FileText,
  Layers,
  ListChecks,
  Headphones,
  Network,
  BookA,
  Target,
  Sparkles,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import type { OutputType } from '@/lib/types'

export interface ToolMeta {
  label: string
  short: string
  icon: LucideIcon
  blurb: string
}

export const OUTPUT_META: Record<OutputType, ToolMeta> = {
  summary: {
    label: 'Summary',
    short: 'Summary',
    icon: Sparkles,
    blurb: 'The big picture, key takeaways and what is likely on the exam.',
  },
  notes: {
    label: 'Study notes',
    short: 'Notes',
    icon: FileText,
    blurb: 'Clean, organised notes with definitions, examples and formulas.',
  },
  flashcards: {
    label: 'Flashcards',
    short: 'Cards',
    icon: Layers,
    blurb: 'Spaced-repetition cards that only show you what you are about to forget.',
  },
  quiz: {
    label: 'Practice quiz',
    short: 'Quiz',
    icon: ListChecks,
    blurb: 'Exam-style questions with explanations for every answer.',
  },
  podcast: {
    label: 'Podcast',
    short: 'Podcast',
    icon: Headphones,
    blurb: 'A two-host audio episode that teaches the lecture. Listen anywhere.',
  },
  visuals: {
    label: 'Visuals',
    short: 'Visuals',
    icon: Network,
    blurb: 'Mind maps, concept maps, flowcharts, timelines and comparison tables.',
  },
  glossary: {
    label: 'Glossary',
    short: 'Glossary',
    icon: BookA,
    blurb: 'Every key term, explained simply with an example.',
  },
  study_guide: {
    label: 'Study guide',
    short: 'Guide',
    icon: Target,
    blurb: 'What to master, practice problems, common traps and a study plan.',
  },
}

export const TAB_ORDER: (OutputType | 'sources' | 'chat')[] = [
  'sources',
  'summary',
  'notes',
  'flashcards',
  'quiz',
  'podcast',
  'visuals',
  'glossary',
  'study_guide',
  'chat',
]

export const CHAT_META: ToolMeta = {
  label: 'Ask',
  short: 'Ask',
  icon: MessageCircle,
  blurb: 'Ask questions and get answers grounded in this lecture.',
}
