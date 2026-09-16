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

