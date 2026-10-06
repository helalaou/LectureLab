import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { apiJson } from '@/lib/api'
import { deleteAllData } from '@/lib/db'
import { Button } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { useDialog } from '@/hooks/useDialog'

export function DeleteAccountData() {
  const [busy, setBusy] = useState(false)
  const { signOut } = useAuth()
  const toast = useToast()
  const dialog = useDialog()
  return (
    <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</h3>
      <p className="muted mt-1 text-sm">
        Permanently delete all your lectures, recordings, study material and your saved API key.
      </p>
      <Button
        className="mt-3"
        variant="danger"
        size="sm"
        loading={busy}
        onClick={async () => {
          const ok = await dialog.confirm({
            title: 'Delete all your data?',
            message:
              'This permanently erases every lecture, recording, study tool and your saved API key. It cannot be undone.',
            confirmLabel: 'Delete everything',
            danger: true,
            requireText: 'DELETE',
          })
          if (!ok) return
          setBusy(true)
          try {
            await deleteAllData()
            await apiJson('/api/key', { method: 'DELETE' }).catch(() => {})
            toast('All your data was deleted.', 'success')
            await signOut()
          } catch (e) {
            toast((e as Error).message, 'error')
          } finally {
            setBusy(false)
          }
        }}
      >
        Delete all my data
      </Button>
    </div>
  )
}
