import { APP_NAME } from '@shared/app'
import { useState } from 'react'
import { Mic, Upload, Layers, Headphones, Sparkles, Brain } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/Layout'
import { Button } from '@/components/ui'

const FEATURES = [
  {
    icon: Mic,
    title: 'Record class live',
    text: 'Plug in a mic and hit record. It saves as you go, even if Wi-Fi drops.',
  },
  {
    icon: Upload,
    title: 'Add any source',
    text: 'Old recordings, videos, slides as PDF, Word docs or your own notes.',
  },
  {
    icon: Layers,
    title: 'Flashcards & quizzes',
    text: 'Spaced-repetition cards and exam-style practice with explanations.',
  },
  { icon: Headphones, title: 'Study podcast', text: 'A two-host audio recap you can listen to on the bus.' },
  { icon: Brain, title: 'Notes & visuals', text: 'Clean study notes, mind maps, timelines and a study guide.' },
  { icon: Sparkles, title: 'Ask the lecture', text: 'Chat with a tutor that only answers from your class material.' },
]

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}

export default function Login() {
  const { signInWithGoogle, signInWithEmail } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent'>('idle')

  return (
    <div className="from-accent-50 dark:from-accent-950/40 min-h-dvh bg-gradient-to-b via-zinc-50 to-zinc-50 dark:via-zinc-950 dark:to-zinc-950">
      <div className="mx-auto flex max-w-5xl flex-col px-5 py-6 sm:px-8">
        <Logo />
        <div className="mt-12 grid items-center gap-12 sm:mt-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Turn every class into <span className="text-accent-600 dark:text-accent-400">study material</span> that
              works.
            </h1>
            <p className="muted mt-5 max-w-lg text-lg">
              Record your lectures or upload old ones. {APP_NAME} writes your notes, builds flashcards and practice
              quizzes, draws the big picture, and even makes a podcast so you can review anywhere.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                variant="secondary"
                loading={loading}
                icon={<GoogleIcon />}
                className="shadow-sm"
                onClick={async () => {
                  setLoading(true)
                  setError(null)
                  try {
                    await signInWithGoogle()
                  } catch (e) {
                    setError((e as Error).message)
                    setLoading(false)
                  }
                }}
              >
                Continue with Google
              </Button>
              <span className="muted text-sm">Free and open source. Your lectures stay private.</span>
            </div>
            <form
              className="mt-5 flex max-w-md flex-col gap-2 sm:flex-row"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!email.trim()) return
                setEmailState('sending')
                setError(null)
                try {
                  await signInWithEmail(email)
                  setEmailState('sent')
                } catch (err) {
                  setError((err as Error).message)
                  setEmailState('idle')
                }
              }}
            >
              <input
                className="input"
                type="email"
                placeholder="or sign in with your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="soft" loading={emailState === 'sending'}>
                Email me a link
              </Button>
            </form>
            {emailState === 'sent' && (
              <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                Check your inbox for a sign-in link.
              </p>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-4">
                <Icon className="text-accent-600 dark:text-accent-400 size-5" />
                <div className="mt-2.5 font-medium">{title}</div>
                <div className="muted mt-0.5 text-sm">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
