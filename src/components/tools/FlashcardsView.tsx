import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, Shuffle, Lightbulb, PartyPopper, Layers, List, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Flashcard } from '../../lib/types'
import { listCardProgress, saveCardProgress } from '../../lib/db'
import { cardKey, intervalLabel, NEW_CARD, review, type CardState } from '../../lib/srs'
import { InlineMd } from '../Markdown'
import { Button, Segmented, cx, Badge, Progress } from '../ui'

type Mode = 'study' | 'browse'

export default function FlashcardsView({ cards, lectureId }: { cards: Flashcard[]; lectureId: string }) {
  const [mode, setMode] = useState<Mode>('study')
  const [progress, setProgress] = useState<Record<string, CardState>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    listCardProgress(lectureId)
      .then((map) => {
        setProgress(map)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [lectureId])

  const stats = useMemo(() => {
    const now = Date.now()
    let fresh = 0,
      due = 0,
      learned = 0
    for (const c of cards) {
      const p = progress[cardKey(c.front)]
      if (!p) fresh++
      else if (new Date(p.due_at).getTime() <= now) due++
      else learned++
    }
    return { fresh, due, learned }
  }, [cards, progress])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-sm">
          <Badge tone="accent">{stats.fresh} new</Badge>
          <Badge tone="amber">{stats.due} due</Badge>
          <Badge tone="green">{stats.learned} learned</Badge>
        </div>
        <div className="w-56">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'study', label: <><Layers className="size-4" /> Study</> },
              { value: 'browse', label: <><List className="size-4" /> All cards</> },
            ]}
          />
        </div>
      </div>
      {mode === 'study' ? (
        loaded && <StudySession cards={cards} lectureId={lectureId} progress={progress} setProgress={setProgress} />
      ) : (
        <Browse cards={cards} />
      )}
    </div>
  )
}

function StudySession({
  cards,
  lectureId,
  progress,
  setProgress,
}: {
  cards: Flashcard[]
  lectureId: string
  progress: Record<string, CardState>
  setProgress: React.Dispatch<React.SetStateAction<Record<string, CardState>>>
}) {
  const buildQueue = useCallback(
    (all = false) => {
      const now = Date.now()
      const due = cards.filter((c) => {
        const p = progress[cardKey(c.front)]
        return all || !p || new Date(p.due_at).getTime() <= now
      })
      // due reviews first, then new cards in the order the AI wrote them
      return due.sort((a, b) => Number(!!progress[cardKey(b.front)]) - Number(!!progress[cardKey(a.front)]))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards],
  )
  const [queue, setQueue] = useState<Flashcard[]>(() => buildQueue())
  const [initial, setInitial] = useState(queue.length)
  const [flipped, setFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const card = queue[0]
  const state = card ? progress[cardKey(card.front)] || NEW_CARD : NEW_CARD

  const grade = useCallback(
    async (g: 0 | 1 | 2 | 3) => {
      if (!card) return
      const key = cardKey(card.front)
      const next = review(progress[key] || NEW_CARD, g)
      setProgress((p) => ({ ...p, [key]: next }))
      setFlipped(false)
      setShowHint(false)
      // "Again" puts the card back a few places in this session
      setQueue((q) => {
        const rest = q.slice(1)
        if (g === 0) rest.splice(Math.min(3, rest.length), 0, card)
        return rest
      })
      await saveCardProgress(lectureId, key, next)
    },
    [card, progress, setProgress, lectureId],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
      if (flipped && ['1', '2', '3', '4'].includes(e.key)) grade((Number(e.key) - 1) as 0 | 1 | 2 | 3)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, grade])

  if (!card) {
    const nextDue = Object.values(progress)
      .map((p) => new Date(p.due_at).getTime())
      .filter((t) => t > Date.now())
      .sort((a, b) => a - b)[0]
    return (
      <div className="card px-6 py-12 text-center">
        <PartyPopper className="mx-auto size-10 text-accent-600" />
        <h3 className="mt-3 text-lg font-semibold">All caught up!</h3>
        <p className="muted mt-1">
          {nextDue ? `Next review ${new Date(nextDue).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.` : 'Come back later to review.'} Spacing out reviews is what makes it stick.
        </p>
        <Button
          className="mt-6"
          variant="secondary"
          icon={<RotateCcw className="size-4" />}
          onClick={() => {
            const q = buildQueue(true)
            setQueue(q)
            setInitial(q.length)
          }}
        >
          Practise all cards anyway
        </Button>
      </div>
    )
  }

  const done = initial - queue.length
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center gap-3">
        <Progress value={initial ? done / initial : 0} />
        <span className="muted shrink-0 text-xs tabular-nums">
          {Math.max(0, done)}/{initial}
        </span>
        <button
          aria-label="Shuffle"
          title="Shuffle"
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          onClick={() => setQueue((q) => [...q].sort(() => Math.random() - 0.5))}
        >
          <Shuffle className="size-4" />
        </button>
      </div>

      <button className="flip block w-full text-left" onClick={() => setFlipped((f) => !f)} aria-label="Flip card">
        <div className={cx('flip-inner relative min-h-72 sm:min-h-80', flipped && 'flipped')}>
          <div className="flip-face card absolute inset-0 flex flex-col overflow-y-auto p-6">
            <div className="flex items-center justify-between">
              <Badge>{card.topic}</Badge>
              <span className="muted text-xs capitalize">{card.kind}</span>
            </div>
            <div className="flex flex-1 items-center justify-center py-6 text-center text-xl leading-snug font-medium text-balance">
              <InlineMd>{card.front}</InlineMd>
            </div>
            <div className="muted text-center text-xs">Tap to reveal answer</div>
          </div>
          <div className="flip-face flip-back card absolute inset-0 flex flex-col overflow-y-auto border-accent-200 bg-accent-50/40 p-6 dark:border-accent-900 dark:bg-accent-950/20">
            <div className="muted text-xs">Answer</div>
            <div className="flex flex-1 items-center justify-center py-6 text-center text-lg leading-relaxed text-balance">
              <InlineMd>{card.back}</InlineMd>
            </div>
          </div>
        </div>
      </button>

      {!flipped ? (
        <div className="mt-4 flex gap-2">
          {card.hint && (
            <Button variant="ghost" icon={<Lightbulb className="size-4" />} onClick={() => setShowHint(true)} disabled={showHint}>
              {showHint ? card.hint : 'Hint'}
            </Button>
          )}
          <Button className="flex-1" onClick={() => setFlipped(true)}>
            Show answer
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {(
            [
              [0, 'Again', 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 dark:text-red-300'],
              [1, 'Hard', 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300'],
              [2, 'Good', 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300'],
              [3, 'Easy', 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 dark:text-sky-300'],
            ] as const
          ).map(([g, label, cls]) => (
            <button key={g} onClick={() => grade(g)} className={cx('flex flex-col items-center rounded-xl py-2.5 text-sm font-semibold transition', cls)}>
              {label}
              <span className="text-[11px] font-normal opacity-75">{intervalLabel(state, g)}</span>
            </button>
          ))}
        </div>
      )}
      <p className="muted mt-4 hidden text-center text-xs sm:block">Shortcuts: Space flips · 1–4 grade</p>
    </div>
  )
}

