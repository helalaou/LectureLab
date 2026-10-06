import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Modal } from '@/components/ui'
import { DialogContext, type ConfirmOptions, type DialogApi, type PromptOptions } from '@/hooks/useDialog'

type Request = { id: number } & (
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }
)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null)
  const seq = useRef(0)

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise((resolve) => setRequest({ id: ++seq.current, kind: 'confirm', options, resolve })),
      prompt: (options) =>
        new Promise((resolve) => setRequest({ id: ++seq.current, kind: 'prompt', options, resolve })),
    }),
    [],
  )

  const finish = useCallback(
    (result: boolean | string | null) => {
      if (!request) return
      if (request.kind === 'confirm') request.resolve(result === true)
      else request.resolve(typeof result === 'string' && result.trim() ? result.trim() : null)
      setRequest(null)
    },
    [request],
  )

  return (
    <DialogContext.Provider value={api}>
      {children}
      {request && (
        <DialogBody
          key={request.id}
          request={request}
          onCancel={() => finish(request.kind === 'confirm' ? false : null)}
          onDone={finish}
        />
      )}
    </DialogContext.Provider>
  )
}

function DialogBody({
  request,
  onCancel,
  onDone,
}: {
  request: Request
  onCancel: () => void
  onDone: (result: boolean | string) => void
}) {
  const { options } = request
  const [text, setText] = useState(request.kind === 'prompt' ? (request.options.initialValue ?? '') : '')
  const requireText = request.kind === 'confirm' ? request.options.requireText : undefined
  const danger = request.kind === 'confirm' && request.options.danger
  const canSubmit = request.kind === 'prompt' ? !!text.trim() : !requireText || text === requireText

  return (
    <Modal open onClose={onCancel} title={options.title}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) onDone(request.kind === 'prompt' ? text : true)
        }}
      >
        {options.message && <p className="text-[15px] text-zinc-600 dark:text-zinc-300">{options.message}</p>}
        {request.kind === 'prompt' && (
          <div>
            {request.options.label && <label className="label">{request.options.label}</label>}
            <input
              autoFocus
              className="input"
              placeholder={request.options.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        )}
        {requireText && (
          <div>
            <label className="label">
              Type <b>{requireText}</b> to confirm
            </label>
            <input
              autoFocus
              className="input"
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            autoFocus={!requireText && request.kind === 'confirm'}
          >
            {(request.kind === 'confirm' && request.options.cancelLabel) || 'Cancel'}
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={!canSubmit}>
            {options.confirmLabel || (request.kind === 'prompt' ? 'Save' : 'OK')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
