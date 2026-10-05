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

async function makeAudio(output: Output<PodcastData>): Promise<Output<PodcastData>> {
  const segs = output.content.segments
  const blobs: Blob[] = new Array(segs.length)
  let done = 0
  let next = 0
  jobs[output.id] = 0
  publish()
  try {
    const worker = async () => {
      while (next < segs.length) {
        const i = next++
        for (let attempt = 1; ; attempt++) {
          try {
            blobs[i] = await apiBlob('/api/tts', { text: segs[i].text, speaker: segs[i].speaker })
            break
          } catch (e) {
            if (attempt >= 3 || [400, 401, 402].includes((e as ApiError).status)) throw e
            await new Promise((r) => setTimeout(r, 1200 * attempt))
          }
        }
        done++
        jobs[output.id] = done / segs.length
        publish()
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()])

    // Byte offsets let us highlight the current line (OpenAI TTS MP3 is constant bitrate).
    const offsets: number[] = []
    let total = 0
    for (const b of blobs) {
      offsets.push(total)
      total += b.size
    }
    offsets.push(total)
    const mp3 = new Blob(blobs, { type: 'audio/mpeg' })

    const path = `${auth.currentUser!.uid}/${output.lecture_id}/podcast-${Date.now()}.mp3`
    await uploadAudio(path, mp3)
    if (output.audio_path) await deleteAudio(output.audio_path).catch(() => {})
    const content = { ...output.content, _audio_offsets: offsets }
    return (await updateOutput(output.lecture_id, 'podcast', { audio_path: path, content })) as Output<PodcastData>
  } finally {
    delete jobs[output.id]
    publish()
  }
}

