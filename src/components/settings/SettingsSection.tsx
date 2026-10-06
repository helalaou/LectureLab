import { type ReactNode } from 'react'

export function SettingsSection({
  id,
  icon,
  title,
  description,
  children,
}: {
  id?: string
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300 flex size-9 shrink-0 items-center justify-center rounded-xl">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="muted mt-0.5 text-sm">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}
