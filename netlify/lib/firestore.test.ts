import { describe, expect, it } from 'vitest'
import { decode, encode } from './firestore'

describe('Firestore value encoding', () => {
  it('round-trips nested values', () => {
    const value = {
      title: 'Lecture',
      count: 3,
      ratio: 0.5,
      done: false,
      tags: ['a', 'b'],
      nested: { empty: null, list: [{ x: 1 }] },
    }
    expect(decode(encode(value))).toEqual(value)
  })

  it('encodes integers and doubles distinctly', () => {
    expect(encode(2)).toEqual({ integerValue: '2' })
    expect(encode(2.5)).toEqual({ doubleValue: 2.5 })
  })

  it('drops undefined object fields', () => {
    expect(decode(encode({ a: 1, b: undefined }))).toEqual({ a: 1 })
  })
})
