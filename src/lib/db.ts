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

export async function deleteLecture(id: string) {
  const [sources, outputs] = await Promise.all([getDocs(userCol('lectures', id, 'sources')), getDocs(userCol('lectures', id, 'outputs'))])
  const audio = [
    ...sources.docs.map((d) => d.data().storage_path as string | null),
    ...outputs.docs.map((d) => d.data().audio_path as string | null),
  ].filter((k): k is string => !!k)
  await Promise.all(audio.map((k) => deleteAudio(k).catch(() => {})))
  for (const sub of ['sources', 'outputs', 'chat', 'cards']) {
    const snap = await getDocs(userCol('lectures', id, sub))
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db)
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }
  await deleteDoc(userDoc('lectures', id))
}

// ------------------------------------------------------------------ sources

export function watchSources(lectureId: string, cb: (s: Source[]) => void) {
  return onSnapshot(query(userCol('lectures', lectureId, 'sources'), orderBy('created_at')), (snap) =>
    cb(rows<Source>(snap).map((s) => ({ ...s, lecture_id: lectureId }))),
  )
}

/** Keep the small summary on the lecture doc (used by the home list) in sync. */
async function refreshLectureSummary(lectureId: string) {
  const all = rows<Source>(await getDocs(userCol('lectures', lectureId, 'sources')))
  await updateDoc(userDoc('lectures', lectureId), {
    source_kinds: Array.from(new Set(all.map((s) => s.kind))),
    source_count: all.length,
    processing: all.some((s) => s.status === 'uploading' || s.status === 'transcribing'),
    updated_at: now(),
  }).catch(() => {})
}

// Firestore documents max out at 1 MB, so very long texts are trimmed.
const MAX_CONTENT = 700_000

export async function addSource(lectureId: string, kind: SourceKind, title: string, extra: Partial<Source> = {}): Promise<Source> {
  const data = {
    kind,
    title,
    storage_path: null,
    mime_type: null,
    duration_sec: null,
    content: '',
    segments: [],
    status: 'uploading' as Source['status'],
    error: null,
    created_at: now(),
    ...extra,
  }
  if (data.content.length > MAX_CONTENT) data.content = data.content.slice(0, MAX_CONTENT)
  const ref = await addDoc(userCol('lectures', lectureId, 'sources'), data)
  await refreshLectureSummary(lectureId)
  return { ...data, id: ref.id, lecture_id: lectureId } as Source
}

export async function updateSource(lectureId: string, id: string, patch: Partial<Source>) {
  const p = { ...patch }
  if (p.content && p.content.length > MAX_CONTENT) p.content = p.content.slice(0, MAX_CONTENT)
  delete (p as Partial<Source>).id
  delete (p as Partial<Source>).lecture_id
  await updateDoc(userDoc('lectures', lectureId, 'sources', id), p)
  if ('status' in patch) await refreshLectureSummary(lectureId)
}

export async function removeSource(src: Source) {
  if (src.storage_path) await deleteAudio(src.storage_path).catch(() => {})
  await deleteDoc(userDoc('lectures', src.lecture_id, 'sources', src.id))
  await refreshLectureSummary(src.lecture_id)
}

// ------------------------------------------------------------------ outputs

export async function listOutputs(lectureId: string): Promise<Partial<Record<OutputType, Output>>> {
  const map: Partial<Record<OutputType, Output>> = {}
  for (const o of rows<Output>(await getDocs(userCol('lectures', lectureId, 'outputs')))) map[o.type] = o
  return map
}
export async function updateOutput(lectureId: string, type: OutputType, patch: Partial<Output>): Promise<Output> {
  await updateDoc(userDoc('lectures', lectureId, 'outputs', type), patch)
  const snap = await getDoc(userDoc('lectures', lectureId, 'outputs', type))
  return { ...(snap.data() as Output), id: snap.id }
}

// ------------------------------------------------------------------ chat

export async function listChat(lectureId: string): Promise<ChatMessage[]> {
  return rows<ChatMessage>(await getDocs(query(userCol('lectures', lectureId, 'chat'), orderBy('created_at'))))
}
export async function clearChat(lectureId: string) {
  const snap = await getDocs(userCol('lectures', lectureId, 'chat'))
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

// ------------------------------------------------------------------ flashcard progress

export async function listCardProgress(lectureId: string): Promise<Record<string, CardState>> {
  const map: Record<string, CardState> = {}
  for (const d of (await getDocs(userCol('lectures', lectureId, 'cards'))).docs) map[d.id] = d.data() as CardState
  return map
}
export const saveCardProgress = (lectureId: string, key: string, state: CardState) =>
  setDoc(userDoc('lectures', lectureId, 'cards', key), { ...state, updated_at: now() })

// ------------------------------------------------------------------ account

export async function deleteAllData() {
  for (const l of await listLectures()) await deleteLecture(l.id)
  for (const c of await listCourses()) await deleteDoc(userDoc('courses', c.id))
  await deleteDoc(doc(db, 'users', uid()))
}
