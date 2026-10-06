import { useState, type ReactNode } from 'react'
import { Download, FileDown, Printer, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import Markdown from '@/components/Markdown'
import { OUTPUT_META } from '@/components/tools/meta'
import { Button, Menu, MenuItem, Modal, Progress, Segmented } from '@/components/ui'
import { useGenerate } from '@/hooks/useGenerate'
import { exportMarkdown, toMarkdown } from '@/lib/export'
import { runKey, useRunning, type GenOptions } from '@/lib/genStore'
import { printNode } from '@/lib/print'
import type { Output, OutputType } from '@/lib/types'

function OptionsForm({
  type,
  value,
  onChange,
}: {
  type: OutputType
  value: GenOptions
  onChange: (v: GenOptions) => void
}) {
  return (
    <div className="space-y-4 text-left">
      {type === 'flashcards' && (
        <div>
          <label className="label">How many cards?</label>
          <Segmented
            value={String(value.count ?? 0)}
            onChange={(v) => onChange({ ...value, count: Number(v) || undefined })}
            options={[
              { value: '0', label: 'Auto' },
              { value: '15', label: '15' },
              { value: '30', label: '30' },
              { value: '50', label: '50' },
            ]}
          />
        </div>
      )}
      {type === 'quiz' && (
        <>
          <div>
            <label className="label">Questions</label>
            <Segmented
              value={String(value.count ?? 0)}
              onChange={(v) => onChange({ ...value, count: Number(v) || undefined })}
              options={[
                { value: '0', label: 'Auto' },
                { value: '5', label: '5' },
                { value: '10', label: '10' },
                { value: '20', label: '20' },
              ]}
            />
          </div>
          <div>
            <label className="label">Difficulty</label>
            <Segmented
              value={value.difficulty ?? 'mixed'}
              onChange={(difficulty) => onChange({ ...value, difficulty })}
              options={[
                { value: 'easy', label: 'Easier' },
                { value: 'mixed', label: 'Mixed' },
                { value: 'hard', label: 'Harder' },
              ]}
            />
          </div>
        </>
      )}
      {type === 'podcast' && (
        <div>
          <label className="label">Episode length</label>
          <Segmented
            value={value.length ?? 'standard'}
            onChange={(length) => onChange({ ...value, length })}
            options={[
              { value: 'short', label: '~5 min' },
              { value: 'standard', label: '~10 min' },
              { value: 'long', label: '~15 min' },
            ]}
          />
        </div>
      )}
      <div>
        <label className="label">Anything to focus on? (optional)</label>
        <input
          className="input"
          placeholder={
            type === 'quiz'
              ? 'e.g. "only chapter 4" or "more math problems"'
              : 'e.g. "focus on the formulas" or "explain it simpler"'
          }
          value={value.focus ?? ''}
          onChange={(e) => onChange({ ...value, focus: e.target.value })}
        />
      </div>
    </div>
  )
}

/**
 * Wraps every study tool: empty state → live progress → content with
 * regenerate and export actions.
 */
export default function ToolPanel<T>({
  type,
  lectureId,
  lectureTitle,
  output,
  canGenerate,
  onChange,
  children,
  extraExports,
}: {
  type: OutputType
  lectureId: string
  lectureTitle: string
  output: Output<T> | undefined
  canGenerate: boolean
  onChange: (o: Output) => void
  children: (o: Output<T>) => ReactNode
  extraExports?: (o: Output<T>, close: () => void) => ReactNode
}) {
  const meta = OUTPUT_META[type]
  const running = useRunning()[runKey(lectureId, type)]
  const [options, setOptions] = useState<GenOptions>({})
  const [regenOpen, setRegenOpen] = useState(false)
  const run = useGenerate(lectureId, onChange)
  const Icon = meta.icon

  if (running) {
    const isMd = type === 'notes' || type === 'study_guide'
    const approx = running.text.length
    return (
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300 flex size-10 items-center justify-center rounded-xl">
            <Wand2 className="size-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Making your {meta.label.toLowerCase()}…</div>
            <div className="muted text-sm">
              {running.status}
              {approx > 0 && !isMd && ` · ${Math.round(approx / 100) / 10}k characters`}
            </div>
          </div>
        </div>
        <Progress className="mt-4" value={Math.min(0.95, 0.08 + approx / (isMd ? 14000 : 9000))} />
        <p className="muted mt-3 text-xs">This usually takes 10–40 seconds. You can switch tabs; it keeps going.</p>
        {isMd && running.text && (
          <div className="mt-6 max-h-[60vh] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
            <Markdown>{running.text}</Markdown>
          </div>
        )}
      </div>
    )
  }

  if (!output) {
    return (
      <div className="card px-5 py-10 text-center sm:px-10">
        <div className="bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300 mx-auto flex size-14 items-center justify-center rounded-2xl">
          <Icon className="size-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{meta.label}</h3>
        <p className="muted mx-auto mt-1 max-w-sm">{meta.blurb}</p>
        {canGenerate ? (
          <div className="mx-auto mt-6 max-w-sm">
            <OptionsForm type={type} value={options} onChange={setOptions} />
            <Button
              className="mt-5 w-full"
              size="lg"
              icon={<Sparkles className="size-5" />}
              onClick={() => run(type, options)}
            >
              Create {meta.label.toLowerCase()}
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-sm font-medium text-amber-700 dark:text-amber-400">
            Add a recording, file or notes in the Sources tab first.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <p className="muted truncate text-xs">
          Made{' '}
          {new Date(output.created_at).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {(output.content as { _truncated?: boolean })?._truncated &&
            ' · sources were very long, so only the first part was used'}
        </p>
        <div className="flex shrink-0 gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw className="size-4" />}
            onClick={() => setRegenOpen(true)}
            disabled={!canGenerate}
          >
            <span className="hidden sm:inline">Regenerate</span>
          </Button>
          <Menu
            trigger={(toggle) => (
              <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={toggle}>
                Export
              </Button>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon={<Printer className="size-4" />}
                  onClick={() => {
                    close()
                    printNode(
                      <Markdown>{toMarkdown(type, output.content, lectureTitle)}</Markdown>,
                      `${lectureTitle} – ${meta.label}`,
                    )
                  }}
                >
                  Save as PDF
                </MenuItem>
                <MenuItem
                  icon={<FileDown className="size-4" />}
                  onClick={() => {
                    close()
                    exportMarkdown(type, output.content, lectureTitle)
                  }}
                >
                  Download Markdown (.md)
                </MenuItem>
                {extraExports?.(output, close)}
              </>
            )}
          </Menu>
        </div>
      </div>

      {children(output)}

      <Modal open={regenOpen} onClose={() => setRegenOpen(false)} title={`Regenerate ${meta.label.toLowerCase()}`}>
        <p className="muted mb-4 text-sm">
          This replaces the current version. Use it after adding new sources, or to change the focus.
        </p>
        <OptionsForm type={type} value={options} onChange={setOptions} />
        <Button
          className="mt-5 w-full"
          icon={<Sparkles className="size-4" />}
          onClick={() => {
            setRegenOpen(false)
            run(type, options)
          }}
        >
          Regenerate
        </Button>
      </Modal>
    </div>
  )
}
