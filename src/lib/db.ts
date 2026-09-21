/**
 * All Firestore reads/writes for the app. Data lives under users/{uid}/…
 * (see firestore.rules), so each user can only ever see their own lectures.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  addDoc,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import type { ChatMessage, Course, Lecture, Output, OutputType, Source, SourceKind, UserSettings } from './types'
import type { CardState } from './srs'
import { deleteAudio } from './storage'

function uid(): string {
  const u = auth.currentUser
  if (!u) throw new Error('Not signed in')
  return u.uid
}
const now = () => new Date().toISOString()
const userCol = (...path: string[]) => collection(db, 'users', uid(), ...(path as [string]))
const userDoc = (...path: string[]) => doc(db, 'users', uid(), ...(path as [string]))
const rows = <T>(snap: QuerySnapshot<DocumentData>) => snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))

// ------------------------------------------------------------------ settings

export async function getSettings(): Promise<Partial<UserSettings>> {
  const snap = await getDoc(doc(db, 'users', uid()))
  return (snap.data()?.settings as Partial<UserSettings>) || {}
}

export async function saveSettings(patch: Partial<UserSettings>) {
  await setDoc(doc(db, 'users', uid()), { settings: patch, updated_at: now() }, { merge: true })
}

// ------------------------------------------------------------------ courses

export async function listCourses(): Promise<Course[]> {
  return rows<Course>(await getDocs(query(userCol('courses'), orderBy('name'))))
}
export async function createCourse(name: string, color: string): Promise<Course> {
  const data = { name: name.trim(), color, created_at: now() }
  const ref = await addDoc(userCol('courses'), data)
  return { ...data, id: ref.id }
}
export const renameCourse = (id: string, name: string) => updateDoc(userDoc('courses', id), { name })
export async function deleteCourse(id: string) {
  const lectures = await listLectures()
  const batch = writeBatch(db)
  for (const l of lectures.filter((l) => l.course_id === id)) batch.update(userDoc('lectures', l.id), { course_id: null })
  batch.delete(userDoc('courses', id))
  await batch.commit()
}

// ------------------------------------------------------------------ lectures

export async function listLectures(): Promise<Lecture[]> {
  return rows<Lecture>(await getDocs(query(userCol('lectures'), orderBy('updated_at', 'desc'))))
}
export async function getLecture(id: string): Promise<Lecture | null> {
  const snap = await getDoc(userDoc('lectures', id))
  return snap.exists() ? ({ ...(snap.data() as Lecture), id: snap.id }) : null
}
export function watchLecture(id: string, cb: (l: Lecture | null) => void) {
  return onSnapshot(userDoc('lectures', id), (s) => cb(s.exists() ? ({ ...(s.data() as Lecture), id: s.id }) : null))
}
export async function createLecture(input: { title: string; courseId: string | null }): Promise<string> {
  const t = now()
  const ref = await addDoc(userCol('lectures'), {
    title: input.title,
    course_id: input.courseId,
    lecture_date: t.slice(0, 10),
    created_at: t,
    updated_at: t,
    output_types: [],
    source_kinds: [],
    source_count: 0,
    processing: false,
  })
  return ref.id
}
export const updateLecture = (id: string, patch: Partial<Lecture>) => updateDoc(userDoc('lectures', id), { ...patch, updated_at: now() })

