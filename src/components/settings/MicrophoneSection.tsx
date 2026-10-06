import { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { listMicrophones, micConstraints, type MicPrefs } from '@/lib/audio/recorder'
import { getMicPrefs, setMicPrefs } from '@/lib/micPrefs'
import { Button, Toggle } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/cn'
import { SettingsSection } from '@/components/settings/SettingsSection'

export function MicrophoneSection() {
  const [prefs, setPrefs] = useState<MicPrefs>(getMicPrefs)
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [testing, setTesting] = useState(false)
  const [level, setLevel] = useState(0)
  const stopRef = useRef<() => void>(() => {})
  const toast = useToast()

  const loadMics = () =>
    listMicrophones()
      .then(setMics)
      .catch(() => {})
  useEffect(() => {
    loadMics()
    navigator.mediaDevices?.addEventListener?.('devicechange', loadMics)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', loadMics)
      stopRef.current()
    }
  }, [])

  const save = (p: MicPrefs) => {
    setPrefs(p)
    setMicPrefs(p)
    if (testing) {
      stopRef.current()
      setTimeout(() => startTest(p), 50)
    }
  }

  async function startTest(p = prefs) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(micConstraints(p))
      const ctx = new AudioContext()
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      ctx.createMediaStreamSource(stream).connect(an)
      const data = new Uint8Array(an.fftSize)
      let raf = 0
      const loop = () => {
        an.getByteTimeDomainData(data)
        let peak = 0
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128)
        setLevel((l) => Math.max(peak, l * 0.85))
        raf = requestAnimationFrame(loop)
      }
      loop()
      setTesting(true)
      loadMics()
      stopRef.current = () => {
        cancelAnimationFrame(raf)
        stream.getTracks().forEach((t) => t.stop())
        ctx.close().catch(() => {})
        setTesting(false)
        setLevel(0)
        stopRef.current = () => {}
      }
    } catch (e) {
      toast(
        (e as Error).name === 'NotAllowedError'
          ? 'Microphone permission is blocked for this site.'
          : (e as Error).message,
        'error',
      )
    }
  }

  return (
    <SettingsSection
      id="microphone"
      icon={<Mic className="size-5" />}
      title="Microphone"
      description="Plug in a USB or lapel mic for the best transcripts. This choice is saved on this device."
    >
      <div className="space-y-4">
        <div>
          <label className="label">Input device</label>
          <select
            className="input"
            value={prefs.deviceId ?? ''}
            onChange={(e) => save({ ...prefs, deviceId: e.target.value || undefined })}
          >
            <option value="">System default</option>
            {mics
              .filter((m) => m.deviceId && m.deviceId !== 'default')
              .map((m, i) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || `Microphone ${i + 1}`}
                </option>
              ))}
          </select>
          {mics.length > 0 && !mics[0].label && (
            <p className="muted mt-1 text-xs">Click “Test microphone” once to see device names.</p>
          )}
        </div>

        <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={testing ? 'secondary' : 'soft'}
              onClick={() => (testing ? stopRef.current() : startTest())}
            >
              {testing ? 'Stop test' : 'Test microphone'}
            </Button>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-75',
                  level > 0.85 ? 'bg-red-500' : level > 0.05 ? 'bg-emerald-500' : 'bg-zinc-400',
                )}
                style={{ width: `${Math.min(100, Math.sqrt(level) * 100)}%` }}
              />
            </div>
          </div>
          {testing && (
            <p className="muted mt-2 text-xs">
              Talk normally. The bar should move into green. If it hits red, move the mic further away.
            </p>
          )}
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <Toggle
            checked={prefs.noiseSuppression}
            onChange={(v) => save({ ...prefs, noiseSuppression: v })}
            label="Noise suppression"
            description="Reduces fans, AC hum and chatter."
          />
          <Toggle
            checked={prefs.autoGainControl}
            onChange={(v) => save({ ...prefs, autoGainControl: v })}
            label="Automatic volume"
            description="Boosts a teacher who is far from the mic."
          />
          <Toggle
            checked={prefs.echoCancellation}
            onChange={(v) => save({ ...prefs, echoCancellation: v })}
            label="Echo cancellation"
            description="Only needed if speakers are playing nearby. Usually best off in a classroom."
          />
        </div>
      </div>
    </SettingsSection>
  )
}
