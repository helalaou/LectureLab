export function fmtDuration(sec: number | null | undefined): string {
  const s = Math.max(0, Math.round(sec || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return `${m}:${String(r).padStart(2, '0')}`
}

export function fmtDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T12:00:00' : d) : d
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function relativeTime(d: string): string {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`
  return fmtDate(d)
}

export function defaultLectureTitle(date = new Date()): string {
  return `Lecture · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'lecture'
  )
}

export function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0
}
