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

