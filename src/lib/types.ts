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

export interface SummaryContent {
  title_suggestion: string
  tldr: string
  big_picture: string
  key_takeaways: { point: string; why_it_matters: string }[]
  instructor_emphasis: string[]
  likely_exam_topics: string[]
  logistics: string[]
  questions_to_ask: string[]
}

export interface MarkdownContent {
  markdown: string
}

export interface Flashcard {
  front: string
  back: string
  hint: string
  kind: string
  topic: string
  difficulty: number
}

export interface QuizQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  question: string
  options: string[]
  correct_index: number
  correct_answer: string
  explanation: string
  topic: string
  difficulty: number
}

export interface PodcastContent {
  title: string
  description: string
  segments: { speaker: 'A' | 'B'; text: string }[]
}

export interface Visual {
  title: string
  kind: 'mindmap' | 'concept_map' | 'flowchart' | 'timeline' | 'sequence' | 'comparison_table'
  caption: string
  mermaid: string
  markdown: string
}

export interface GlossaryTerm {
  term: string
  definition: string
  example: string
  related: string[]
  category: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

