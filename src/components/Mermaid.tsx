import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

type MermaidApi = typeof import('mermaid').default
let mermaidPromise: Promise<MermaidApi> | null = null
let renderQueue: Promise<unknown> = Promise.resolve()

function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import('mermaid').then((m) => m.default)
  return mermaidPromise
}

/** Light-touch repairs for common LLM Mermaid mistakes. */
function clean(code: string): string {
  return code
    .replace(/^```(?:mermaid)?\s*/i, '')
    .replace(/```\s*$/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^\s*graph\s+(TD|TB|LR|RL|BT)/m, 'flowchart $1')
    .trim()
}

export default function Mermaid({ code, onSvg }: { code: string; onSvg?: (svg: string) => void }) {
  const id = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const onSvgRef = useRef(onSvg)
  onSvgRef.current = onSvg

  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    // mermaid.render is not re-entrant, so serialise renders.
    renderQueue = renderQueue.then(async () => {
      try {
        const mermaid = await loadMermaid()
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: 'Inter, ui-sans-serif, system-ui',
          themeVariables: dark
            ? {
                darkMode: true,
                background: '#18181b',
                primaryColor: '#312e81',
                primaryTextColor: '#eef2ff',
                primaryBorderColor: '#6366f1',
                secondaryColor: '#1e3a5f',
                tertiaryColor: '#27272a',
                lineColor: '#818cf8',
                textColor: '#e4e4e7',
                fontSize: '15px',
                cScale0: '#4338ca',
                cScale1: '#0e7490',
                cScale2: '#047857',
                cScale3: '#b45309',
                cScale4: '#be123c',
                cScale5: '#6d28d9',
                cScale6: '#0369a1',
                cScale7: '#4d7c0f',
              }
            : {
                primaryColor: '#e0e7ff',
                primaryTextColor: '#1e1b4b',
                primaryBorderColor: '#818cf8',
                secondaryColor: '#e0f2fe',
                tertiaryColor: '#f4f4f5',
                lineColor: '#6366f1',
                textColor: '#27272a',
                fontSize: '15px',
                cScale0: '#c7d2fe',
                cScale1: '#bae6fd',
                cScale2: '#a7f3d0',
                cScale3: '#fde68a',
                cScale4: '#fecdd3',
                cScale5: '#ddd6fe',
                cScale6: '#99f6e4',
                cScale7: '#d9f99d',
              },
          flowchart: { htmlLabels: true, curve: 'basis' },
        })
        const { svg } = await mermaid.render(id, clean(code))
        if (!cancelled) {
          setSvg(svg)
          setError(null)
          onSvgRef.current?.(svg)
        }
      } catch (e) {
        document.getElementById('d' + id)?.remove()
        if (!cancelled) setError((e as Error).message?.split('\n')[0] || 'Could not draw this diagram')
      }
    })
    return () => {
      cancelled = true
    }
  }, [code, dark, id])

  if (error) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-4" /> This diagram couldn't be drawn. Try regenerating the visuals.
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-amber-700 dark:text-amber-400">Show diagram code</summary>
          <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap">{code}</pre>
        </details>
      </div>
    )
  }
  if (!svg) return <div className="h-48 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
  return (
    <div
      className="flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
