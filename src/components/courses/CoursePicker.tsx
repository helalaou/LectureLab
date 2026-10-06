import { useState, type KeyboardEvent } from 'react'
import { Check, Plus, X } from 'lucide-react'
import type { Course } from '@/lib/types'
import { COURSE_COLORS } from '@/hooks/useCourses'
import { useToast } from '@/hooks/useToast'
import { Button, IconButton } from '@/components/ui'
import { cn } from '@/lib/cn'

const chip =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors'
const idle =
  'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
const active = 'border-accent-600 bg-accent-600 text-white'

/**
 * Pick a course by tapping a chip, or create one inline.
 * Not a <form>: it is used inside other forms, and nested forms submit the outer one.
 */
export default function CoursePicker({
  courses,
  value,
  onChange,
  onCreate,
}: {
  courses: Course[]
  value: string | null
  onChange: (id: string | null) => void
  onCreate: (name: string) => Promise<Course>
}) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const c = await onCreate(name)
      onChange(c.id)
      setAdding(false)
      setName('')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setAdding(false)
    }
  }

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Course" className="flex flex-wrap gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          onClick={() => onChange(null)}
          className={cn(chip, !value ? active : idle)}
        >
          No course
        </button>
        {courses.map((c) => {
          const on = value === c.id
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(c.id)}
              className={cn(chip, on ? active : idle)}
            >
              {on ? (
                <Check className="size-3.5" />
              ) : (
                <span className={cn('size-2 rounded-full', COURSE_COLORS[c.color] || 'bg-zinc-400')} />
              )}
              {c.name}
            </button>
          )
        })}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(
              chip,
              'text-accent-700 dark:text-accent-300 border-dashed border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800',
            )}
          >
            <Plus className="size-3.5" />
            New course
          </button>
        )}
      </div>
      {adding && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            className="input"
            placeholder="e.g. BIO 101 – Intro to Biology"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKey}
          />
          <Button type="button" loading={busy} disabled={!name.trim()} onClick={add}>
            Add
          </Button>
          <IconButton type="button" label="Cancel" onClick={() => setAdding(false)}>
            <X className="size-4" />
          </IconButton>
        </div>
      )}
    </div>
  )
}
