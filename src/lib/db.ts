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

