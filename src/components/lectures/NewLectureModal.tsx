import { useState } from 'react'
import { createLecture } from '@/lib/pipeline'
import { useCourses } from '@/hooks/useCourses'
import CoursePicker from '@/components/courses/CoursePicker'
import { Button, Modal } from '@/components/ui'
import { useToast } from '@/hooks/useToast'

export function NewLectureModal({
  open,
  onClose,
  courses,
  createCourse,
  defaultCourse,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  courses: ReturnType<typeof useCourses>['courses']
  createCourse: ReturnType<typeof useCourses>['create']
  defaultCourse: string | null
  onCreated: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState<string | null>(defaultCourse)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  return (
    <Modal open={open} onClose={onClose} title="New lecture">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            const id = await createLecture({ title, courseId })
            onCreated(id)
          } catch (err) {
            toast((err as Error).message, 'error')
          } finally {
            setBusy(false)
          }
        }}
      >
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            autoFocus
            placeholder="Leave blank and the AI will name it"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Course</label>
          <CoursePicker courses={courses} value={courseId} onChange={setCourseId} onCreate={createCourse} />
        </div>
        <p className="muted text-sm">
          Next you'll add sources: recordings, files, slides or notes. You can add as many as you like.
        </p>
        <Button type="submit" className="w-full" loading={busy}>
          Create lecture
        </Button>
      </form>
    </Modal>
  )
}
