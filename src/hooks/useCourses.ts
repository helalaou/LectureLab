import { useCallback, useEffect, useState } from 'react'
import { createCourse, deleteCourse, listCourses, renameCourse } from '../lib/db'
import type { Course } from '../lib/types'

export const COURSE_COLORS: Record<string, string> = {
  indigo: 'bg-indigo-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  orange: 'bg-orange-500',
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setCourses(await listCourses().catch(() => []))
    setLoading(false)
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(
    async (name: string) => {
      const colors = Object.keys(COURSE_COLORS)
      const c = await createCourse(name, colors[courses.length % colors.length])
      await refresh()
      return c
    },
    [courses.length, refresh],
  )
  const rename = useCallback(
    async (id: string, name: string) => {
      await renameCourse(id, name)
      await refresh()
    },
    [refresh],
  )
  const remove = useCallback(
    async (id: string) => {
      await deleteCourse(id)
      await refresh()
    },
    [refresh],
  )
  return { courses, loading, refresh, create, rename, remove }
}
