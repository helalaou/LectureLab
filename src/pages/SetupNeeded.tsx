import { APP_NAME } from '@shared/app'
export default function SetupNeeded() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-2xl font-semibold">Almost there 👋</h1>
      <p className="muted mt-3">
        {APP_NAME} needs to be connected to Firebase. Copy <code>.env.example</code> to <code>.env</code>, fill in the{' '}
        <code>VITE_FIREBASE_…</code> values, then restart the dev server. On Netlify, add them under Site configuration
        → Environment variables and redeploy.
      </p>
      <p className="muted mt-3">Full step-by-step instructions are in the README.</p>
    </div>
  )
}
