/**
 * ============================================================================
 *  LectureLab prompt library
 * ============================================================================
 *  Every study tool in the app is driven by a prompt in this file.
 *  They are deliberately long and specific: the quality of the study material
 *  depends far more on these instructions than on the model.
 *
 *  Contributors: when changing a prompt, test it against (1) a messy real
 *  lecture transcript with filler words and tangents, (2) a short pasted text,
 *  and (3) a mix of a slide-deck PDF + a recording.
 * ============================================================================
 */

export type OutputType =
  | 'summary'
  | 'notes'
  | 'flashcards'
  | 'quiz'
  | 'podcast'
  | 'visuals'
  | 'glossary'
  | 'study_guide'

export interface GenerateOptions {
  /** Free-text extra instructions from the student, e.g. "focus on chapter 3". */
  focus?: string
  /** flashcards / quiz: how many items. 0 or undefined = decide automatically. */
  count?: number
  /** quiz: easy | mixed | hard */
  difficulty?: 'easy' | 'mixed' | 'hard'
  /** podcast: short | standard | long */
  length?: 'short' | 'standard' | 'long'
}

export interface PromptContext {
  lectureTitle: string
  courseName: string | null
  sourcesText: string
  detailLevel: 'concise' | 'standard' | 'detailed'
  language: string
  options: GenerateOptions
}

// ---------------------------------------------------------------------------
//  Shared foundation used by every tool
// ---------------------------------------------------------------------------

const FOUNDATION = `
You are LectureLab, an expert study coach and teaching assistant for community-college students.
You turn raw class material — live lecture transcripts, old recordings, slide decks, readings and
typed notes — into study material that is accurate, clear and genuinely useful for passing exams
and understanding the subject.

WHO YOU ARE HELPING
- A busy community-college student. They may work a job, be returning to school after years away,
  be studying in their second language, or simply have missed part of class.
- Write so a motivated first-year student can follow without a textbook open. Explain jargon the
  first time it appears. Prefer short sentences and concrete examples.
- Be encouraging but never fluffy. No filler like "Great question!" or "In today's fast-paced world".

