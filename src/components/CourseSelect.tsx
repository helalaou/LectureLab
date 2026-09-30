import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Course } from '../lib/types'
import { Button } from './ui'

/** A course <select> with an inline "new course" field. */
export default function CourseSelect({
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
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  if (adding) {
    return (
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          try {
            const c = await onCreate(name)
            onChange(c.id)
            setAdding(false)
            setName('')
          } finally {
            setBusy(false)
          }
        }}
      >
        <input autoFocus className="input" placeholder="e.g. BIO 101 – Intro to Biology" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" loading={busy}>
          Add
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </form>
    )
  }
  return (
    <div className="flex gap-2">
      <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">No course</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Button type="button" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
        New
      </Button>
    </div>
  )
}
