import { NavLink, Outlet, Link } from 'react-router-dom'
import { BookOpen, Mic, Settings as SettingsIcon } from 'lucide-react'
import { cx } from './ui'

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cx('flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-accent-600 text-white shadow-sm shadow-accent-600/30">
        <svg viewBox="0 0 64 64" className="size-5" aria-hidden>
          <path d="M20 16v30h24" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="41" cy="23" r="6.5" fill="#c7d2fe" />
        </svg>
      </span>
      <span className="text-[17px]">LectureLab</span>
    </Link>
  )
}

const NAV = [
  { to: '/', label: 'Lectures', icon: BookOpen, end: true },
  { to: '/record', label: 'Record', icon: Mic },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Layout() {
  return (
    <div className="min-h-dvh">
      {/* Top bar */}
      <header className="no-print sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/85 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                    to === '/record'
                      ? 'ml-1 bg-accent-600 text-white hover:bg-accent-700'
                      : isActive
                        ? 'bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-5 pb-32 sm:px-6 sm:pt-8 sm:pb-16">
        <Outlet />
      </main>

      {/* Bottom bar (mobile) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur-md pb-safe sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto grid h-16 max-w-md grid-cols-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx('flex flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-accent-600 dark:text-accent-400' : 'text-zinc-500 dark:text-zinc-400')
              }
            >
              {to === '/record' ? (
                <span className="-mt-7 flex size-14 items-center justify-center rounded-full bg-accent-600 text-white shadow-lg shadow-accent-600/40 ring-4 ring-zinc-50 dark:ring-zinc-950">
                  <Icon className="size-6" />
                </span>
              ) : (
                <Icon className="size-[22px]" />
              )}
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
