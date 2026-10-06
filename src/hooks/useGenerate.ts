import { useNavigate } from 'react-router-dom'
import { OUTPUT_META } from '@/components/tools/meta'
import { useToast } from '@/hooks/useToast'
import type { ApiError } from '@/lib/api'
import { generate, type GenOptions } from '@/lib/genStore'
import type { Output, OutputType } from '@/lib/types'

/** Runs a generation and reports success or failure with a toast. */
export function useGenerate(lectureId: string, onDone: (o: Output) => void) {
  const toast = useToast()
  const navigate = useNavigate()
  return async (type: OutputType, options: GenOptions = {}) => {
    try {
      const out = await generate(lectureId, type, options)
      onDone(out)
      toast(`${OUTPUT_META[type].label} ready`, 'success')
    } catch (e) {
      const err = e as ApiError
      toast(err.message, 'error')
      if (err.code === 'no_key') navigate('/settings#api-key')
    }
  }
}
