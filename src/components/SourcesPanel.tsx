import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, AudioLines, FileText, Type, Plus, Trash2, RotateCcw, ChevronDown, Loader2, AlertCircle, Sparkles, Copy } from 'lucide-react'
import type { Source } from '../lib/types'
import { addDocument, addMediaFile, addText, deleteSource, retryRecordingSource, useJobs } from '../lib/pipeline'
import { DOC_ACCEPT } from '../lib/docs'
import { audioUrl as getAudioUrl } from '../lib/storage'
import { fmtDuration, wordCount } from '../lib/format'
import { Button, Modal, Progress, useToast, cx, IconButton, Badge } from './ui'

const KIND = {
  recording: { icon: Mic, label: 'Class recording' },
  audio: { icon: AudioLines, label: 'Audio / video' },
  document: { icon: FileText, label: 'Document' },
  text: { icon: Type, label: 'Notes' },
}

export function AddSourceModal({ open, onClose, lectureId }: { open: boolean; onClose: () => void; lectureId: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const mediaRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const [pasting, setPasting] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')

  useEffect(() => {
    if (!open) {
      setPasting(false)
      setTitle('')
      setText('')
    }
  }, [open])

  const options = [
    { icon: Mic, title: 'Record now', text: 'Use your microphone during class', onClick: () => navigate(`/record?lecture=${lectureId}`) },
    { icon: AudioLines, title: 'Upload recordings', text: 'MP3, M4A, WAV, WEBM, or video files (MP4, MOV)', onClick: () => mediaRef.current?.click() },
    { icon: FileText, title: 'Upload documents', text: 'Slides or readings as PDF, Word (.docx), or TXT', onClick: () => docRef.current?.click() },
    { icon: Type, title: 'Paste text', text: 'Your own notes, a syllabus, or a textbook passage', onClick: () => setPasting(true) },
  ]

  return (
    <Modal open={open} onClose={onClose} title={pasting ? 'Paste text' : 'Add a source'}>
      {!pasting ? (
        <>
          <p className="muted mb-4 text-sm">Add as many sources as you like. Every study tool uses all of them together.</p>
          <div className="grid gap-2.5">
            {options.map(({ icon: Icon, title, text, onClick }) => (
              <button key={title} onClick={onClick} className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-4 text-left transition hover:border-accent-400 hover:bg-accent-50/50 dark:border-zinc-800 dark:hover:border-accent-700 dark:hover:bg-accent-950/30">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300">
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="muted text-sm">{text}</div>
                </div>
              </button>
            ))}
          </div>
          <input
            ref={mediaRef}
            type="file"
            accept="audio/*,video/*,.m4a,.mp3,.wav,.webm,.ogg,.aac,.flac,.mp4,.mov,.mkv"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              e.target.value = ''
              if (!files.length) return
              onClose()
              ;(async () => {
                for (const f of files) await addMediaFile(lectureId, f).catch((err) => toast(err.message, 'error'))
              })()
              toast(files.length > 1 ? `Processing ${files.length} files…` : 'Processing your file…')
            }}
          />
          <input
            ref={docRef}
            type="file"
            accept={DOC_ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              e.target.value = ''
              if (!files.length) return
              onClose()
              files.forEach((f) => addDocument(lectureId, f).catch((err) => toast(err.message, 'error')))
            }}
          />
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!text.trim()) return
            await addText(lectureId, title, text).catch((err) => toast(err.message, 'error'))
            onClose()
          }}
        >
          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. My notes, Chapter 3 reading" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Text</label>
            <textarea className="input min-h-56" placeholder="Paste or type here…" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
            <p className="muted mt-1 text-xs">{wordCount(text).toLocaleString()} words</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setPasting(false)}>
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={!text.trim()}>
              Add text
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

