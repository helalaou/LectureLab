import { Lightbulb, Star, GraduationCap, CalendarCheck, HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SummaryContent } from '../../lib/types'
import { InlineMd } from '../Markdown'

function Block({ icon, title, items, tone }: { icon: ReactNode; title: string; items: string[]; tone: string }) {
  if (!items.length) return null
  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <span className={tone}>{icon}</span>
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-zinc-400" />
            <InlineMd>{t}</InlineMd>
          </li>
        ))}
      </ul>
    </div>
  )
}

