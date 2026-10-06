import { useState } from 'react'
import { updateLecture } from '@/lib/db'
import type { Lecture } from '@/lib/types'
import { useCourses } from '@/hooks/useCourses'
import CourseSelect from '@/components/CourseSelect'
import { Button, Modal } from '@/components/ui'

export function EditLectureModal({
  open,
  onClose,
  lecture,
  courses,
  createCourse,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  lecture: Lecture
  courses: ReturnType<typeof useCourses>['courses']
  createCourse: ReturnType<typeof useCourses>['create']
  onSaved: (l: Lecture) => void
}) {
  const [title, setTitle] = useState(lecture.title)
  const [courseId, setCourseId] = useState<string | null>(lecture.course_id)
  const [date, setDate] = useState(lecture.lecture_date)
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Edit lecture">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const patch = { title: title.trim() || lecture.title, course_id: courseId, lecture_date: date }
          await updateLecture(lecture.id, patch)
          setBusy(false)
          onSaved({ ...lecture, ...patch })
        }}
      >
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Course</label>
          <CourseSelect courses={courses} value={courseId} onChange={setCourseId} onCreate={createCourse} />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" loading={busy}>
          Save
        </Button>
      </form>
    </Modal>
  )
}
