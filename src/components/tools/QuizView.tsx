import { useMemo, useState } from 'react'
import { CheckCircle2, XCircle, RotateCcw, Trophy, ArrowRight } from 'lucide-react'
import type { QuizQuestion } from '@/lib/types'
import { InlineMd } from '@/components/Markdown'
import { Button, Badge, Progress } from '@/components/ui'
import { cn } from '@/lib/cn'

interface Answer {
  choice?: number
  text?: string
  correct: boolean
}

const DIFF = ['', 'Recall', 'Understanding', 'Application']

export default function QuizView({ questions }: { questions: QuizQuestion[] }) {
  const [order, setOrder] = useState(() => questions.map((_, i) => i))
  const [pos, setPos] = useState(0)
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [draft, setDraft] = useState('')
  const [revealedShort, setRevealedShort] = useState(false)
  const finished = pos >= order.length

  const score = useMemo(() => Object.values(answers).filter((a) => a.correct).length, [answers])

  const restart = (onlyWrong = false) => {
    const next = onlyWrong ? order.filter((i) => !answers[i]?.correct) : questions.map((_, i) => i)
    setOrder(next.length ? next : questions.map((_, i) => i))
    setAnswers({})
    setPos(0)
    setDraft('')
    setRevealedShort(false)
  }

  if (finished) {
    const total = order.length
    const pct = total ? Math.round((score / total) * 100) : 0
    const wrong = order.filter((i) => !answers[i]?.correct)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card px-6 py-10 text-center">
          <Trophy
            className={cn(
              'mx-auto size-12',
              pct >= 80 ? 'text-amber-500' : pct >= 60 ? 'text-accent-600' : 'text-zinc-400',
            )}
          />
          <div className="mt-3 text-4xl font-semibold tabular-nums">{pct}%</div>
          <p className="muted mt-1">
            {score} of {total} correct ·{' '}
            {pct >= 90
              ? 'Outstanding! You’re ready.'
              : pct >= 75
                ? 'Solid work. Review the misses below.'
                : pct >= 50
                  ? 'Getting there. Go over the explanations, then try again.'
                  : 'Good start. Read the notes, then retake it.'}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {wrong.length > 0 && wrong.length < total && (
              <Button onClick={() => restart(true)} icon={<RotateCcw className="size-4" />}>
                Retry the {wrong.length} I missed
              </Button>
            )}
            <Button variant="secondary" onClick={() => restart(false)} icon={<RotateCcw className="size-4" />}>
              Retake whole quiz
            </Button>
          </div>
        </div>
        {wrong.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold">Review what you missed</h3>
            <ul className="mt-4 space-y-5">
              {wrong.map((i) => {
                const q = questions[i]
                return (
                  <li key={i} className="border-l-2 border-red-300 pl-4 dark:border-red-800">
                    <div className="font-medium">
                      <InlineMd>{q.question}</InlineMd>
                    </div>
                    <div className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                      ✓ <InlineMd>{q.correct_answer}</InlineMd>
                    </div>
                    <div className="muted mt-1 text-sm">
                      <InlineMd>{q.explanation}</InlineMd>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const qi = order[pos]
  const q = questions[qi]
  const a = answers[qi]
  const answered = !!a

  const choose = (idx: number) => {
    if (answered) return
    setAnswers((x) => ({ ...x, [qi]: { choice: idx, correct: idx === q.correct_index } }))
  }
  const next = () => {
    setPos((p) => p + 1)
    setDraft('')
    setRevealedShort(false)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center gap-3">
        <Progress value={pos / order.length} />
        <span className="muted shrink-0 text-xs tabular-nums">
          {pos + 1}/{order.length}
        </span>
      </div>
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Badge>{q.topic}</Badge>
          <Badge tone="accent">{DIFF[q.difficulty] || 'Question'}</Badge>
        </div>
        <h3 className="mt-4 text-lg leading-snug font-medium">
          <InlineMd>{q.question}</InlineMd>
        </h3>

        {q.type !== 'short_answer' ? (
          <div className="mt-5 space-y-2">
            {q.options.map((opt, idx) => {
              const isCorrect = idx === q.correct_index
              const isChosen = a?.choice === idx
              return (
                <button
                  key={idx}
                  onClick={() => choose(idx)}
                  disabled={answered}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition',
                    !answered &&
                      'hover:border-accent-400 hover:bg-accent-50/50 dark:hover:border-accent-600 dark:hover:bg-accent-950/30 border-zinc-300 dark:border-zinc-700',
                    answered &&
                      isCorrect &&
                      'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40',
                    answered &&
                      isChosen &&
                      !isCorrect &&
                      'border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950/40',
                    answered && !isCorrect && !isChosen && 'border-zinc-200 opacity-60 dark:border-zinc-800',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      answered && isCorrect
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : answered && isChosen
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-zinc-300 dark:border-zinc-600',
                    )}
                  >
                    {q.type === 'true_false' ? (idx === 0 ? 'T' : 'F') : String.fromCharCode(65 + idx)}
                  </span>
                  <span className="pt-px">
                    <InlineMd>{opt}</InlineMd>
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mt-5">
            <textarea
              className="input min-h-28"
              placeholder="Type your answer…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={revealedShort}
            />
            {!revealedShort ? (
              <Button className="mt-3" onClick={() => setRevealedShort(true)} disabled={!draft.trim()}>
                Check my answer
              </Button>
            ) : (
              <div className="mt-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
                <div className="text-sm font-semibold">Model answer</div>
                <div className="mt-1 text-[15px]">
                  <InlineMd>{q.correct_answer}</InlineMd>
                </div>
                {!answered && (
                  <div className="mt-4">
                    <div className="mb-2 text-sm font-medium">Did your answer cover the key points?</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => setAnswers((x) => ({ ...x, [qi]: { text: draft, correct: true } }))}
                      >
                        Yes, I got it
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setAnswers((x) => ({ ...x, [qi]: { text: draft, correct: false } }))}
                      >
                        Not quite
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {answered && (
          <div
            className={cn(
              'mt-5 rounded-xl p-4',
              a.correct ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2 font-semibold',
                a.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400',
              )}
            >
              {a.correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
              {a.correct ? 'Correct!' : 'Not quite'}
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed">
              <InlineMd>{q.explanation}</InlineMd>
            </p>
          </div>
        )}

        {answered && (
          <Button className="mt-5 w-full" onClick={next} icon={<ArrowRight className="size-4" />}>
            {pos + 1 === order.length ? 'See results' : 'Next question'}
          </Button>
        )}
      </div>
    </div>
  )
}
