import { describe, expect, it } from 'vitest'
import { fmtDuration, slug, wordCount } from './format'

describe('fmtDuration', () => {
  it.each([
    [0, '0:00'],
    [59.6, '1:00'],
    [125, '2:05'],
    [3725, '1:02:05'],
    [null, '0:00'],
  ])('formats %s seconds as %s', (input, expected) => {
    expect(fmtDuration(input)).toBe(expected)
  })
})

describe('slug', () => {
  it('produces safe file names', () => {
    expect(slug('Cellular Respiration: Glucose → ATP!')).toBe('cellular-respiration-glucose-atp')
    expect(slug('***')).toBe('lecture')
  })
})

describe('wordCount', () => {
  it('counts words separated by any whitespace', () => {
    expect(wordCount('  one two\nthree\tfour ')).toBe(4)
    expect(wordCount('')).toBe(0)
  })
})
