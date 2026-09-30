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

