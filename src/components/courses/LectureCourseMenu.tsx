import { Check, ChevronDown, FolderPlus, Plus } from 'lucide-react'
import type { Course } from '@/lib/types'
import { COURSE_COLORS } from '@/hooks/useCourses'
import { useDialog } from '@/hooks/useDialog'
import { useToast } from '@/hooks/useToast'
import { Menu, MenuItem } from '@/components/ui'
import { cn } from '@/lib/cn'

/** The course label on a lecture page; tap it to move the lecture to another course. */
export function LectureCourseMenu({
  courses,
  courseId,
  onCreate,
  onChange,
}: {
  courses: Course[]
  courseId: string | null
  onCreate: (name: string) => Promise<Course>
  onChange: (courseId: string | null) => Promise<void>
}) {
  const dialog = useDialog()
  const toast = useToast()
  const course = courses.find((c) => c.id === courseId)

  async function pick(id: string | null) {
    if (id === courseId) return
    try {
      await onChange(id)
      const name = courses.find((c) => c.id === id)?.name
      toast(name ? `Moved to ${name}` : 'Removed from course', 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <Menu
      align="left"
      trigger={(toggle) => (
        <button
          type="button"
          onClick={toggle}
          className="-mx-2 flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {course ? (
            <span className={cn('size-2 rounded-full', COURSE_COLORS[course.color] || 'bg-zinc-400')} />
          ) : (
            <FolderPlus className="size-3.5" />
          )}
          {course ? course.name : 'Add to a course'}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      )}
    >
      {(close) => (
        <>
          {courses.map((c) => (
            <MenuItem
              key={c.id}
              icon={<span className={cn('size-2.5 rounded-full', COURSE_COLORS[c.color] || 'bg-zinc-400')} />}
              onClick={() => {
                close()
                pick(c.id)
              }}
            >
              <span className="flex-1 truncate">{c.name}</span>
              {c.id === courseId && <Check className="text-accent-600 dark:text-accent-400 size-4" />}
            </MenuItem>
          ))}
          {course && (
            <MenuItem
              icon={<span className="size-2.5 rounded-full border border-zinc-400" />}
              onClick={() => {
                close()
                pick(null)
              }}
            >
              No course
            </MenuItem>
          )}
          {courses.length > 0 && <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />}
          <MenuItem
            icon={<Plus className="size-4" />}
            onClick={async () => {
              close()
              const name = await dialog.prompt({
                title: 'New course',
                label: 'Course name',
                placeholder: 'e.g. BIO 101 – Intro to Biology',
                confirmLabel: 'Create and move',
              })
              if (!name) return
              try {
                const c = await onCreate(name)
                await onChange(c.id)
                toast(`Moved to ${c.name}`, 'success')
              } catch (e) {
                toast((e as Error).message, 'error')
              }
            }}
          >
            New course…
          </MenuItem>
        </>
      )}
    </Menu>
  )
}
