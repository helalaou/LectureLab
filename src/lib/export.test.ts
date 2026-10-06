import { describe, expect, it } from 'vitest'
import { toMarkdown } from './export'

describe('toMarkdown', () => {
  it('renders a quiz with options and an answer key', () => {
    const md = toMarkdown(
      'quiz',
      {
        questions: [
          {
            type: 'multiple_choice',
            question: 'Which organelle makes most ATP?',
            options: ['Nucleus', 'Mitochondrion', 'Ribosome', 'Golgi'],
            correct_index: 1,
            correct_answer: 'Mitochondrion',
            explanation: 'Oxidative phosphorylation happens there.',
            topic: 'Cells',
            difficulty: 1,
          },
        ],
      },
      'Biology',
    )
    expect(md).toContain('# Practice quiz: Biology')
    expect(md).toContain('B. Mitochondrion')
    expect(md).toContain('## Answer key')
    expect(md).toContain('**B. Mitochondrion**')
  })

  it('passes Markdown outputs through unchanged', () => {
    expect(toMarkdown('notes', { markdown: '# Notes' }, 'x')).toBe('# Notes')
  })

  it('labels podcast speakers by host name', () => {
    const md = toMarkdown(
      'podcast',
      { title: 'Ep 1', description: 'Intro', segments: [{ speaker: 'B', text: 'Hi!' }] },
      'x',
    )
    expect(md).toContain('**Theo:** Hi!')
  })
})
