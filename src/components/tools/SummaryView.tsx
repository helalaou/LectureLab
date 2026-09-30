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

export default function SummaryView({ c }: { c: SummaryContent }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-accent-600 to-accent-800 p-6 text-white shadow-lg shadow-accent-600/20">
        <div className="text-xs font-semibold tracking-wider text-accent-200 uppercase">TL;DR</div>
        <p className="mt-2 text-lg leading-relaxed font-medium text-balance">
          <InlineMd>{c.tldr}</InlineMd>
        </p>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold">The big picture</h3>
        <p className="mt-2 leading-relaxed text-zinc-700 dark:text-zinc-300">
          <InlineMd>{c.big_picture}</InlineMd>
        </p>
      </div>

      <div className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <Lightbulb className="size-5 text-amber-500" /> Key takeaways
        </h3>
        <ol className="mt-4 space-y-4">
          {c.key_takeaways.map((k, i) => (
            <li key={i} className="flex gap-3.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-sm font-semibold text-accent-700 dark:bg-accent-950/60 dark:text-accent-300">{i + 1}</span>
              <div>
                <div className="font-medium">
                  <InlineMd>{k.point}</InlineMd>
                </div>
                <div className="muted mt-0.5 text-[15px]">
                  <InlineMd>{k.why_it_matters}</InlineMd>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Block icon={<Star className="size-5" />} tone="text-amber-500" title="What the instructor stressed" items={c.instructor_emphasis} />
        <Block icon={<GraduationCap className="size-5" />} tone="text-accent-600" title="Likely on the exam" items={c.likely_exam_topics} />
        <Block icon={<CalendarCheck className="size-5" />} tone="text-emerald-600" title="Announcements & to-dos" items={c.logistics} />
        <Block icon={<HelpCircle className="size-5" />} tone="text-sky-600" title="Questions worth asking" items={c.questions_to_ask} />
      </div>
    </div>
  )
}
