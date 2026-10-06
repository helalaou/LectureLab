import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { GlossaryTerm } from '@/lib/types'
import { InlineMd } from '@/components/Markdown'

export default function GlossaryView({ terms }: { terms: GlossaryTerm[] }) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const filtered = terms.filter(
      (t) => !query || t.term.toLowerCase().includes(query) || t.definition.toLowerCase().includes(query),
    )
    const map = new Map<string, GlossaryTerm[]>()
    for (const t of filtered) {
      const k = t.category || 'Other'
      map.set(k, [...(map.get(k) || []), t])
    }
    return [...map.entries()]
  }, [terms, q])

  const jump = (term: string) => {
    setQ('')
    setTimeout(
      () =>
        document.getElementById('term-' + term.toLowerCase())?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      30,
    )
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          className="input pl-10"
          placeholder={`Search ${terms.length} terms`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="space-y-6">
        {groups.map(([cat, items]) => (
          <section key={cat}>
            <h3 className="muted mb-2 text-xs font-semibold tracking-wider uppercase">{cat}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((t) => (
                <div key={t.term} id={'term-' + t.term.toLowerCase()} className="card p-4">
                  <div className="text-accent-700 dark:text-accent-300 font-semibold">
                    <InlineMd>{t.term}</InlineMd>
                  </div>
                  <p className="mt-1 text-[15px] leading-relaxed">
                    <InlineMd>{t.definition}</InlineMd>
                  </p>
                  {t.example && (
                    <p className="muted mt-2 text-sm">
                      <span className="font-medium">e.g. </span>
                      <InlineMd>{t.example}</InlineMd>
                    </p>
                  )}
                  {t.related.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.related.map((r) => (
                        <button
                          key={r}
                          onClick={() => jump(r)}
                          className="hover:bg-accent-50 hover:text-accent-700 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
        {!groups.length && <p className="muted text-center">No matching terms.</p>}
      </div>
    </div>
  )
}
