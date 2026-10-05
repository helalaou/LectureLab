import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Headphones, Download, Wand2, Gauge } from 'lucide-react'
import type { Output, PodcastContent } from '../../lib/types'
import { auth } from '../../lib/firebase'
import { updateOutput } from '../../lib/db'
import { audioUrl, deleteAudio, fetchAudioBlob, uploadAudio } from '../../lib/storage'
import { apiBlob, ApiError } from '../../lib/api'
import { download } from '../../lib/export'
import { slug } from '../../lib/format'
import { Button, Progress, cx, useToast } from '../ui'

type PodcastData = PodcastContent & { _audio_offsets?: number[] }

// ------------------------------------------------------------------ background audio jobs
const jobs: Record<string, number> = {} // outputId -> progress 0..1
let snapshot = { ...jobs }
const subs = new Set<() => void>()
const publish = () => {
  snapshot = { ...jobs }
  subs.forEach((s) => s())
}
const useAudioJobs = () =>
  useSyncExternalStore(
    (l) => {
      subs.add(l)
      return () => subs.delete(l)
    },
    () => snapshot,
  )

