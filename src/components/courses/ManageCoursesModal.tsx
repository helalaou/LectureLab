import { useState, type KeyboardEvent } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Course } from '@/lib/types'
import { COURSE_COLORS } from '@/hooks/useCourses'
import { useDialog } from '@/hooks/useDialog'
import { useToast } from '@/hooks/useToast'
import { Button, IconButton, Modal } from '@/components/ui'
import { cn } from '@/lib/cn'

/** Add, rename and delete courses, all inline. */
export function ManageCoursesModal({
  open,
  onClose,
  courses,
  lectureCounts,
  onCreate,
  onRename,
  onRemove,
}: {
  open: boolean
  onClose: () => void
  courses: Course[]
  lectureCounts: Record<string, number>
  onCreate: (name: string) => Promise<Course>
  onRename: (id: string, name: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const toast = useToast()
  const dialog = useDialog()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id)
    try {
      await fn()
      return true
    } catch (e) {
      toast((e as Error).message, 'error')
      return false
    } finally {
      setBusy(null)
    }
  }

  async function saveRename(c: Course) {
    const name = draft.trim()
    if (!name || name === c.name) return setEditing(null)
    if (await run(c.id, () => onRename(c.id, name))) setEditing(null)
  }

  async function add() {
    const name = newName.trim()
    if (!name) return
    if (await run('new', () => onCreate(name))) setNewName('')
  }

  const keys = (submit: () => void, cancel?: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape' && cancel) {
      e.preventDefault()
      e.stopPropagation()
      cancel()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Courses">
      {courses.length === 0 && (
        <p className="muted mb-2 text-sm">Group lectures by class. Add your first course below.</p>
      )}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {courses.map((c) => {
          const count = lectureCounts[c.id] || 0
          return (
            <li key={c.id} className="flex min-h-14 items-center gap-3 py-2">
              <span className={cn('size-3 shrink-0 rounded-full', COURSE_COLORS[c.color] || 'bg-zinc-400')} />
              {editing === c.id ? (
                <>
                  <input
                    autoFocus
                    aria-label="Course name"
                    className="input h-10"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={keys(
                      () => saveRename(c),
                      () => setEditing(null),
                    )}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <IconButton label="Save name" disabled={busy === c.id} onClick={() => saveRename(c)}>
                    <Check className="size-4" />
                  </IconButton>
                  <IconButton label="Cancel" onClick={() => setEditing(null)}>
                    <X className="size-4" />
                  </IconButton>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setEditing(c.id)
                      setDraft(c.name)
                    }}
                  >
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="muted text-xs">{count === 1 ? '1 lecture' : `${count} lectures`}</div>
                  </button>
                  <IconButton
                    label={`Rename ${c.name}`}
                    onClick={() => {
                      setEditing(c.id)
                      setDraft(c.name)
                    }}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Delete ${c.name}`}
                    disabled={busy === c.id}
                    onClick={async () => {
                      const ok = await dialog.confirm({
                        title: `Delete "${c.name}"?`,
                        message:
                          count > 0
                            ? `Its ${count === 1 ? 'lecture is' : `${count} lectures are`} kept, just without a course.`
                            : undefined,
                        confirmLabel: 'Delete course',
                        danger: true,
                      })
                      if (ok) await run(c.id, () => onRemove(c.id))
                    }}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex items-center gap-2">
        <input
          className="input"
          aria-label="New course name"
          placeholder='New course, e.g. "BIO 101"'
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={keys(add)}
        />
        <Button
          type="button"
          variant="secondary"
          icon={<Plus className="size-4" />}
          loading={busy === 'new'}
          disabled={!newName.trim()}
          onClick={add}
        >
          Add
        </Button>
      </div>
    </Modal>
  )
}
