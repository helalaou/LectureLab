import { useState } from 'react'
import { KeyRound, CheckCircle2, AlertTriangle, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { useAccess } from '@/hooks/useAccess'
import { apiJson } from '@/lib/api'
import { Button, Badge } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { SettingsSection } from '@/components/settings/SettingsSection'

export function ApiKeySection() {
  const { access, error, refresh } = useAccess()
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  return (
    <SettingsSection
      id="api-key"
      icon={<KeyRound className="size-5" />}
      title="Your OpenAI API key"
      description="Optional if your email is on this app's free-access list. Otherwise, add your own key. You only pay OpenAI for what you use."
    >
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {access && (
        <div className="mb-4 flex flex-wrap gap-2">
          {access.hasOwnKey ? (
            <Badge tone="green">
              <CheckCircle2 className="size-3.5" /> Using your key ····{access.ownKeyLast4}
            </Badge>
          ) : access.allowlisted ? (
            <Badge tone="green">
              <CheckCircle2 className="size-3.5" /> Free access enabled for your account
            </Badge>
          ) : (
            <Badge tone="amber">
              <AlertTriangle className="size-3.5" /> Add a key to use AI features
            </Badge>
          )}
        </div>
      )}
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await apiJson('/api/key', { method: 'POST', body: JSON.stringify({ key }) })
            setKey('')
            toast('Key saved and verified.', 'success')
            refresh()
          } catch (err) {
            toast((err as Error).message, 'error')
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="relative">
          <input
            className="input pr-11 font-mono text-sm"
            type={show ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            placeholder={access?.hasOwnKey ? 'Paste a new key to replace it' : 'sk-...'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" loading={busy} disabled={!key.trim()}>
            Save key
          </Button>
          {access?.hasOwnKey && (
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                if (!confirm('Remove your key?')) return
                await apiJson('/api/key', { method: 'DELETE' })
                toast('Key removed.')
                refresh()
              }}
            >
              Remove key
            </Button>
          )}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            className="text-accent-600 dark:text-accent-400 ml-auto flex items-center gap-1 text-sm font-medium"
          >
            Get a key <ExternalLink className="size-3.5" />
          </a>
        </div>
        <p className="muted text-xs">
          Your key is encrypted on the server and never sent back to the browser. With the default models, transcribing
          a 1-hour lecture costs about $0.30, and each study tool costs less than a cent.
        </p>
      </form>
    </SettingsSection>
  )
}
