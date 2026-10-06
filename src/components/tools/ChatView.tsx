import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Sparkles, Trash2, Square } from 'lucide-react'
import { clearChat, listChat } from '@/lib/db'
import { apiStream, ApiError } from '@/lib/api'
import type { ChatMessage } from '@/lib/types'
import Markdown from '@/components/Markdown'
import { IconButton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'

const SUGGESTIONS = [
  'Explain the main idea like I’m new to this',
  'What is most likely to be on the exam?',
  'Quiz me one question at a time',
  'Give me a real-life example of the hardest concept',
  'What did I probably miss if I zoned out?',
  'Make me a mnemonic for the key terms',
]

export default function ChatView({ lectureId, canChat }: { lectureId: string; canChat: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    listChat(lectureId)
      .then(setMessages)
      .catch(() => {})
  }, [lectureId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages.length, streaming])

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || streaming !== null) return
    setInput('')
    const temp: ChatMessage = {
      id: `pending-${crypto.randomUUID()}`,
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    }
    setMessages((m) => [...m, temp])
    setStreaming('')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    let acc = ''
    try {
      await apiStream(
        '/api/chat',
        { lectureId, message: msg },
        (e) => {
          if (e.t === 'delta') {
            acc += e.d
            setStreaming(acc)
          }
          if (e.t === 'done') setMessages((m) => [...m, e.message as ChatMessage])
        },
        ctrl.signal,
      )
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        if (acc)
          setMessages((m) => [
            ...m,
            {
              id: `stopped-${crypto.randomUUID()}`,
              role: 'assistant',
              content: acc + ' …',
              created_at: new Date().toISOString(),
            },
          ])
      } else {
        toast((e as Error).message, 'error')
        if ((e as ApiError).code === 'no_key') navigate('/settings#api-key')
      }
    } finally {
      setStreaming(null)
      abortRef.current = null
    }
  }

  return (
    <div className="card flex min-h-[60vh] flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <div className="font-semibold">Ask this lecture</div>
          <div className="muted text-xs">Answers come from your sources, with timestamps when possible.</div>
        </div>
        {messages.length > 0 && (
          <IconButton
            label="Clear chat"
            onClick={async () => {
              if (!confirm('Clear this conversation?')) return
              await clearChat(lectureId)
              setMessages([])
            }}
          >
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && streaming === null && (
          <div className="py-6 text-center">
            <Sparkles className="text-accent-500 mx-auto size-8" />
            <p className="mt-2 font-medium">Ask anything about this lecture</p>
            <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  disabled={!canChat}
                  onClick={() => send(s)}
                  className="hover:border-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/40 rounded-full border border-zinc-300 px-3.5 py-1.5 text-sm text-zinc-700 transition disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {s}
                </button>
              ))}
            </div>
            {!canChat && <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">Add a source first.</p>}
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}
        {streaming !== null && <Bubble role="assistant" content={streaming || '…'} />}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-[5.75rem] rounded-b-2xl border-t border-zinc-200 bg-white p-3 sm:bottom-0 dark:border-zinc-800 dark:bg-zinc-900"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={taRef}
            rows={1}
            className="input max-h-40 min-h-11 resize-none"
            placeholder={canChat ? 'Ask a question…' : 'Add a source to start chatting'}
            disabled={!canChat}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(160, e.target.scrollHeight) + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
          />
          {streaming !== null ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
              aria-label="Stop"
            >
              <Square className="size-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !canChat}
              className="bg-accent-600 hover:bg-accent-700 flex size-11 shrink-0 items-center justify-center rounded-xl text-white transition disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="size-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  return (
    <div className={cn('flex', role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-4 py-2.5',
          role === 'user' ? 'bg-accent-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800',
        )}
      >
        {role === 'user' ? (
          <p className="text-[15px] whitespace-pre-wrap">{content}</p>
        ) : (
          <Markdown className="prose-sm [&_p]:my-1.5">{content}</Markdown>
        )}
      </div>
    </div>
  )
}
