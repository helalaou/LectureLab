import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import { PageSpinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { firebaseConfigured } from '@/lib/firebase'
import Login from '@/pages/Login'
import SetupNeeded from '@/pages/SetupNeeded'

const Home = lazy(() => import('@/pages/Home'))
const LecturePage = lazy(() => import('@/pages/LecturePage'))
const RecordPage = lazy(() => import('@/pages/RecordPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

export default function App() {
  const { user, loading } = useAuth()
  if (!firebaseConfigured) return <SetupNeeded />
  if (loading) return <PageSpinner />
  if (!user) return <Login />

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="lecture/:id" element={<LecturePage />} />
          <Route path="record" element={<RecordPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
