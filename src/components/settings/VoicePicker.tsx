import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { apiBlob } from '@/lib/api'
import { Button } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { TTS_VOICES } from '@shared/settings'

export function VoicePicker({
  label,
  speaker,
  value,
  onChange,
}: {
  label: string
  speaker: 'A' | 'B'
  value: string
  onChange: (v: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <select className="input capitalize" value={value} onChange={(e) => onChange(e.target.value)}>
          {TTS_VOICES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          aria-label="Preview voice"
          onClick={async () => {
            setLoading(true)
            try {
              const blob = await apiBlob('/api/tts', {
                speaker,
                text:
                  speaker === 'A'
                    ? "Hi, I'm Maya. Let's break down today's lecture together."
                    : "And I'm Theo. I'll ask the questions you're probably thinking!",
              })
              const audio = new Audio(URL.createObjectURL(blob))
              await audio.play()
            } catch (e) {
              toast((e as Error).message, 'error')
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        </Button>
      </div>
      <p className="muted mt-1 text-xs">Save the voice first, then preview.</p>
    </div>
  )
}
