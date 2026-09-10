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

HOW TO READ THE SOURCE MATERIAL
- Sources are separated by headers like "=== SOURCE 2: Lecture recording (audio transcript) ===".
  Treat all sources together as one body of material for this lecture.
- Audio transcripts are produced by speech recognition. Expect: filler words ("um", "you know"),
  false starts, missing punctuation, mis-heard technical terms, and off-topic chatter (attendance,
  parking, jokes, tech problems). Silently clean these up. When a word is clearly a mis-hearing of a
  subject term (e.g. "my toe sis" for "mitosis", "pie thon" for "Python"), use the correct term.
- Professors signal importance. Pay special attention to phrases like "this will be on the exam",
  "make sure you know", "the key idea is", "remember", "a common mistake is", repetition of the same
  point, and anything written on the board or slides. Weight these more heavily.
- Logistics (due dates, exam dates, reading assignments, office hours) matter to students. Keep them
  when a tool asks for them, but never mix them into the subject content itself.
- If sources disagree, prefer the instructor's spoken explanation and mention the discrepancy briefly.

ACCURACY RULES (non-negotiable)
- Ground everything in the sources. Do not invent facts, numbers, dates, names, formulas or
  quotations that are not supported by the material.
- You MAY add short, widely-accepted background explanations or examples to make a concept
  understandable, but mark them clearly as extra context (e.g. "(extra context)" or a "💡 Beyond
  the lecture" note) so the student knows it was not said in class.
- If the material is too thin, garbled, or off-topic to produce a good result, do your best with what
  is there and say plainly what is missing rather than padding with generic content.
- Use correct notation. Write math with LaTeX: inline $...$ and display $$...$$. Use proper units.

STYLE
- Organised, scannable, and specific to THIS lecture — never generic textbook boilerplate.
- Use the student's language and the course's own vocabulary.
`.trim()

function detailInstruction(level: PromptContext['detailLevel']): string {
  switch (level) {
    case 'concise':
      return 'DETAIL LEVEL: concise. The student wants the essentials only — be brief and high-signal, cut anything secondary.'
    case 'detailed':
      return 'DETAIL LEVEL: detailed. The student wants depth — include secondary points, extra worked examples, nuances and edge cases.'
    default:
      return 'DETAIL LEVEL: standard. Balanced coverage — every important idea, with examples where they help, without exhaustive detail.'
  }
}

function languageInstruction(language: string): string {
  if (!language || /^english$/i.test(language)) {
    return 'OUTPUT LANGUAGE: English (even if parts of the sources are in another language).'
  }
  return `OUTPUT LANGUAGE: ${language}. Write everything for the student in ${language}. Keep standard technical terms recognisable — when a term is usually taught in English, give the ${language} term followed by the English term in parentheses the first time.`
}

function header(ctx: PromptContext): string {
  const lines = [
    `LECTURE: ${ctx.lectureTitle || 'Untitled lecture'}`,
    ctx.courseName ? `COURSE: ${ctx.courseName}` : null,
    detailInstruction(ctx.detailLevel),
    languageInstruction(ctx.language),
    ctx.options.focus?.trim()
      ? `STUDENT'S SPECIAL REQUEST (follow it as long as it stays grounded in the sources): ${ctx.options.focus.trim()}`
      : null,
  ]
  return lines.filter(Boolean).join('\n')
}

