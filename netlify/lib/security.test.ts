import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(() => {
  process.env.KEY_ENCRYPTION_SECRET = 'test-secret-for-unit-tests'
})

describe('API key encryption', () => {
  it('round-trips and produces different ciphertext each time', async () => {
    const { encryptSecret, decryptSecret } = await import('./server')
    const a = encryptSecret('sk-test-123')
    const b = encryptSecret('sk-test-123')
    expect(a).not.toBe(b)
    expect(decryptSecret(a)).toBe('sk-test-123')
  })

  it('rejects tampered ciphertext', async () => {
    const { encryptSecret, decryptSecret } = await import('./server')
    const [v, iv, tag, data] = encryptSecret('sk-test-123').split(':')
    const tampered = [v, iv, tag, Buffer.from('garbage').toString('base64') + data.slice(12)].join(':')
    expect(() => decryptSecret(tampered)).toThrow()
  })
})

describe('signed audio links', () => {
  it('accepts a valid signature and rejects others', async () => {
    const { sign, verifySignature } = await import('./audio')
    const exp = Math.floor(Date.now() / 1000) + 60
    const sig = sign('uid/lecture/file.webm', exp)
    expect(verifySignature('uid/lecture/file.webm', exp, sig)).toBe(true)
    expect(verifySignature('uid/lecture/other.webm', exp, sig)).toBe(false)
    expect(verifySignature('uid/lecture/file.webm', exp + 1, sig)).toBe(false)
  })

  it('rejects expired links', async () => {
    const { sign, verifySignature } = await import('./audio')
    const exp = Math.floor(Date.now() / 1000) - 1
    expect(verifySignature('k/l/f', exp, sign('k/l/f', exp))).toBe(false)
  })
})
