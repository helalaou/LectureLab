import { useCallback, useEffect, useState } from 'react'
import { apiJson } from '@/lib/api'
import type { Access } from '@/lib/types'

export function useAccess() {
  const [access, setAccess] = useState<Access | null>(null)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try {
      setAccess(await apiJson<Access>('/api/me'))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => {
    let active = true
    apiJson<Access>('/api/me')
      .then((a) => active && setAccess(a))
      .catch((e: Error) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [])
  return { access, error, refresh }
}
