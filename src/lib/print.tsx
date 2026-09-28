import { createRoot } from 'react-dom/client'
import type { ReactNode } from 'react'

/**
 * "Save as PDF": renders a clean, print-only version of some content and opens the
 * browser's print dialog (choose "Save as PDF" as the destination).
 */
export function printNode(node: ReactNode, title: string, waitMs = 400) {
  let host = document.getElementById('print-root')
  if (!host) {
    host = document.createElement('div')
    host.id = 'print-root'
    document.body.appendChild(host)
  }
  const root = createRoot(host)
  root.render(
    <div className="mx-auto max-w-3xl p-2 text-black">
      {node}
      <p className="mt-10 border-t pt-3 text-xs text-zinc-500">Made with LectureLab</p>
    </div>,
  )
  const prevTitle = document.title
  const wasDark = document.documentElement.classList.contains('dark')
  document.documentElement.classList.remove('dark') // print in light mode
  document.title = title
  const cleanup = () => {
    document.title = prevTitle
    if (wasDark) document.documentElement.classList.add('dark')
    root.unmount()
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  setTimeout(() => window.print(), waitMs)
}
