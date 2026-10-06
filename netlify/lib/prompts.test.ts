import { describe, expect, it } from 'vitest'
import { buildMessages, MARKDOWN_TYPES, SCHEMAS, type OutputType } from './prompts'

const TYPES: OutputType[] = ['summary', 'notes', 'flashcards', 'quiz', 'podcast', 'visuals', 'glossary', 'study_guide']

/** OpenAI strict structured outputs require every property to be listed as required. */
function assertStrict(schema: Record<string, unknown>, path = '$') {
  if (schema.type === 'object') {
    const props = Object.keys(schema.properties as object)
    expect(schema.additionalProperties, path).toBe(false)
    expect([...(schema.required as string[])].sort(), path).toEqual([...props].sort())
    for (const [key, value] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
      assertStrict(value, `${path}.${key}`)
    }
  }
  if (schema.type === 'array') assertStrict(schema.items as Record<string, unknown>, `${path}[]`)
}

describe('prompt library', () => {
  it('has a JSON schema for every non-Markdown output', () => {
    for (const type of TYPES) {
      if (MARKDOWN_TYPES.includes(type)) expect(SCHEMAS[type]).toBeUndefined()
      else expect(SCHEMAS[type], type).toBeDefined()
    }
  })

  it.each(TYPES.filter((t) => SCHEMAS[t]))('%s schema is valid for strict mode', (type) => {
    assertStrict(SCHEMAS[type]!)
  })

  it('includes sources, language and student focus in the user message', () => {
    const [system, user] = buildMessages('flashcards', {
      lectureTitle: 'Photosynthesis',
      courseName: 'BIO 101',
      sourcesText: '=== SOURCE 1 ===\nChlorophyll absorbs light.',
      detailLevel: 'detailed',
      language: 'Spanish',
      options: { count: 12, focus: 'the light reactions' },
    })
    expect(system.role).toBe('system')
    expect(system.content).toContain('Create exactly 12 cards')
    expect(user.content).toContain('Chlorophyll absorbs light.')
    expect(user.content).toContain('OUTPUT LANGUAGE: Spanish')
    expect(user.content).toContain('the light reactions')
    expect(user.content).toContain('DETAIL LEVEL: detailed')
  })
})
