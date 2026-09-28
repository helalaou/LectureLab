import type { Flashcard, GlossaryTerm, MarkdownContent, OutputType, PodcastContent, QuizQuestion, SummaryContent, Visual } from './types'
import { slug } from './format'

export function download(filename: string, data: BlobPart, mime = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([data], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const list = (items: string[]) => items.map((i) => `- ${i}`).join('\n')

/** Convert any output into Markdown (used for .md download and for PDF printing). */
export function toMarkdown(type: OutputType, content: unknown, title: string): string {
  switch (type) {
    case 'summary': {
      const c = content as SummaryContent
      return [
        `# Summary: ${title}`,
        `> ${c.tldr}`,
        `## The big picture\n${c.big_picture}`,
        `## Key takeaways\n${c.key_takeaways.map((k, i) => `${i + 1}. **${k.point}**\n   ${k.why_it_matters}`).join('\n')}`,
        c.instructor_emphasis.length ? `## What the instructor emphasised\n${list(c.instructor_emphasis)}` : '',
        c.likely_exam_topics.length ? `## Likely exam topics\n${list(c.likely_exam_topics)}` : '',
        c.logistics.length ? `## Announcements & to-dos\n${list(c.logistics)}` : '',
        c.questions_to_ask.length ? `## Questions worth asking\n${list(c.questions_to_ask)}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
    }
    case 'notes':
    case 'study_guide':
      return (content as MarkdownContent).markdown
    case 'flashcards': {
      const cards = (content as { cards: Flashcard[] }).cards
      return `# Flashcards: ${title}\n\n` + cards.map((c, i) => `**${i + 1}. ${c.front}**\n\n${c.back}\n`).join('\n---\n\n')
    }
    case 'quiz': {
      const qs = (content as { questions: QuizQuestion[] }).questions
      const body = qs
        .map((q, i) => {
          const opts = q.options.length ? '\n\n' + q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`).join('\n') : '\n\n   _Short answer_'
          return `${i + 1}. ${q.question}${opts}`
        })
        .join('\n\n')
      const key = qs
        .map((q, i) => `${i + 1}. **${q.correct_index >= 0 && q.options.length ? String.fromCharCode(65 + q.correct_index) + '. ' : ''}${q.correct_answer}**: ${q.explanation}`)
        .join('\n')
      return `# Practice quiz: ${title}\n\n${body}\n\n---\n\n## Answer key\n\n${key}`
    }
    case 'glossary': {
      const terms = (content as { terms: GlossaryTerm[] }).terms
      return `# Glossary: ${title}\n\n` + terms.map((t) => `**${t.term}**: ${t.definition}${t.example ? `\n  _Example:_ ${t.example}` : ''}`).join('\n\n')
    }
    case 'podcast': {
      const p = content as PodcastContent
      return `# ${p.title}\n\n_${p.description}_\n\n` + p.segments.map((s) => `**${s.speaker === 'A' ? 'Maya' : 'Theo'}:** ${s.text}`).join('\n\n')
    }
    case 'visuals': {
      const v = (content as { visuals: Visual[] }).visuals
      return `# Visuals: ${title}\n\n` + v.map((x) => `## ${x.title}\n\n${x.caption}\n\n${x.mermaid ? '```mermaid\n' + x.mermaid + '\n```' : x.markdown}`).join('\n\n')
    }
  }
}

