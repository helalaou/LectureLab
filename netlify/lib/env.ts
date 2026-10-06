/**
 * Server-side configuration, read from environment variables.
 * Every value is read lazily so a missing variable produces a clear error
 * for the request that needs it instead of crashing the whole function.
 */

export class ConfigError extends Error {}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new ConfigError(`Server is missing the ${name} environment variable. See README → Configuration.`)
  return value
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}

export const env = {
  /** Firebase project id; the web app's VITE_ variable is reused so it only has to be set once. */
  get firebaseProjectId(): string {
    return optional('FIREBASE_PROJECT_ID') ?? required('VITE_FIREBASE_PROJECT_ID')
  },

  /** Shared OpenAI key used for allowlisted accounts. Optional: without it everyone brings their own key. */
  get openaiApiKey(): string | undefined {
    return optional('OPENAI_API_KEY')
  },

  /** Emails (lowercase) allowed to use the shared key. */
  get allowedEmails(): string[] {
    return (optional('ALLOWED_EMAILS') ?? '')
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  },

  /** Secret used to encrypt personal API keys and sign audio links. */
  get encryptionSecret(): string {
    return required('KEY_ENCRYPTION_SECRET')
  },
}
