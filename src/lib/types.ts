export type OutputType = 'summary' | 'notes' | 'flashcards' | 'quiz' | 'podcast' | 'visuals' | 'glossary' | 'study_guide'

export interface Course {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Lecture {
  id: string
  course_id: string | null
  title: string
  lecture_date: string
  created_at: string
  updated_at: string
  output_types: OutputType[]
  source_kinds: SourceKind[]
  source_count: number
  processing: boolean
}

export interface Segment {
  start: number
  end: number
  text: string
}

export type SourceKind = 'recording' | 'audio' | 'document' | 'text'

export interface Source {
  id: string
  lecture_id: string
  kind: SourceKind
  title: string
  storage_path: string | null
  mime_type: string | null
  duration_sec: number | null
  content: string
  segments: Segment[]
  status: 'uploading' | 'transcribing' | 'ready' | 'error'
  error: string | null
  created_at: string
}

export interface Output<T = unknown> {
  id: string
  lecture_id: string
  type: OutputType
  content: T
  audio_path: string | null
  model: string | null
  created_at: string
}

