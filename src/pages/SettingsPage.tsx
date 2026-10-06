import { useEffect } from 'react'
import { Sun, Moon, Monitor, Sparkles, User } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useAuth } from '@/hooks/useAuth'
import { Button, Segmented } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { OUTPUT_LANGUAGES, TEXT_MODELS, TRANSCRIPTION_MODELS, TTS_MODELS, type UserSettings } from '@shared/settings'
import { APP_NAME, REPOSITORY_URL } from '@shared/app'
import { ApiKeySection } from '@/components/settings/ApiKeySection'
import { DeleteAccountData } from '@/components/settings/DeleteAccountData'
import { MicrophoneSection } from '@/components/settings/MicrophoneSection'
import { SelectField } from '@/components/settings/SelectField'
import { SettingsSection } from '@/components/settings/SettingsSection'
import { VoicePicker } from '@/components/settings/VoicePicker'

export default function SettingsPage() {
  const { settings, update } = useSettings()
  const { user, signOut } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
  }, [])

  const set = (patch: Partial<UserSettings>) => update(patch).catch((e) => toast(e.message, 'error'))

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>

      <SettingsSection icon={<Sun className="size-5" />} title="Appearance">
        <Segmented
          value={settings.theme}
          onChange={(theme) => set({ theme })}
          options={[
            {
              value: 'light',
              label: (
                <>
                  <Sun className="size-4" /> Light
                </>
              ),
            },
            {
              value: 'dark',
              label: (
                <>
                  <Moon className="size-4" /> Dark
                </>
              ),
            },
            {
              value: 'system',
              label: (
                <>
                  <Monitor className="size-4" /> Auto
                </>
              ),
            },
          ]}
        />
      </SettingsSection>

      <MicrophoneSection />

      <ApiKeySection />

      <SettingsSection
        icon={<Sparkles className="size-5" />}
        title="Study material"
        description="How the AI writes your notes, cards and quizzes."
      >
        <div className="space-y-5">
          <div>
            <label className="label">Detail level</label>
            <Segmented
              value={settings.detail_level}
              onChange={(detail_level) => set({ detail_level })}
              options={[
                { value: 'concise', label: 'Concise' },
                { value: 'standard', label: 'Standard' },
                { value: 'detailed', label: 'Detailed' },
              ]}
            />
          </div>
          <SelectField
            label="Write study material in"
            value={settings.output_language}
            onChange={(output_language) => set({ output_language })}
            options={OUTPUT_LANGUAGES.map((l) => ({ value: l, label: l }))}
            hint="Lectures can be in any language. This only changes the language of notes, cards and answers."
          />
          <details className="group rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <summary className="cursor-pointer text-sm font-medium">Advanced: AI models and podcast voices</summary>
            <div className="mt-4 space-y-4">
              <SelectField
                label="Writing model"
                value={settings.text_model}
                onChange={(text_model) => set({ text_model })}
                options={TEXT_MODELS}
              />
              <SelectField
                label="Transcription model"
                value={settings.transcription_model}
                onChange={(transcription_model) => set({ transcription_model })}
                options={TRANSCRIPTION_MODELS}
              />
              <SelectField
                label="Voice model"
                value={settings.tts_model}
                onChange={(tts_model) => set({ tts_model })}
                options={TTS_MODELS}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <VoicePicker
                  label="Host 1 · Maya"
                  speaker="A"
                  value={settings.host_a_voice}
                  onChange={(host_a_voice) => set({ host_a_voice })}
                />
                <VoicePicker
                  label="Host 2 · Theo"
                  speaker="B"
                  value={settings.host_b_voice}
                  onChange={(host_b_voice) => set({ host_b_voice })}
                />
              </div>
            </div>
          </details>
        </div>
      </SettingsSection>

      <SettingsSection icon={<User className="size-5" />} title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {user?.photoURL && (
              <img src={user.photoURL} alt="" className="size-10 rounded-full" referrerPolicy="no-referrer" />
            )}
            <div>
              <div className="font-medium">{user?.displayName || 'Signed in'}</div>
              <div className="muted text-sm">{user?.email}</div>
            </div>
          </div>
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </div>
        <DeleteAccountData />
      </SettingsSection>

      <p className="muted pb-4 text-center text-xs">
        {APP_NAME} is open source ·{' '}
        <a className="underline" href={REPOSITORY_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
    </div>
  )
}
