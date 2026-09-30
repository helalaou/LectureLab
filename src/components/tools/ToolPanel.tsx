import { useState, type ReactNode } from 'react'
import { RefreshCw, Download, FileDown, Sparkles, Printer, Wand2 } from 'lucide-react'
import { generate, runKey, useRunning, type GenOptions } from '../../lib/genStore'
import { exportMarkdown, toMarkdown } from '../../lib/export'
import { printNode } from '../../lib/print'
import type { Output, OutputType } from '../../lib/types'
import { Button, Menu, MenuItem, Modal, Segmented, useToast, Progress } from '../ui'
import Markdown from '../Markdown'
import { OUTPUT_META } from './meta'
import { ApiError } from '../../lib/api'
import { useNavigate } from 'react-router-dom'

function OptionsForm({ type, value, onChange }: { type: OutputType; value: GenOptions; onChange: (v: GenOptions) => void }) {
  return (
    <div className="space-y-4 text-left">
      {type === 'flashcards' && (
        <div>
          <label className="label">How many cards?</label>
          <Segmented
            value={String(value.count ?? 0)}
            onChange={(v) => onChange({ ...value, count: Number(v) || undefined })}
            options={[
              { value: '0', label: 'Auto' },
              { value: '15', label: '15' },
              { value: '30', label: '30' },
              { value: '50', label: '50' },
            ]}
          />
        </div>
      )}
      {type === 'quiz' && (
        <>
          <div>
            <label className="label">Questions</label>
            <Segmented
              value={String(value.count ?? 0)}
              onChange={(v) => onChange({ ...value, count: Number(v) || undefined })}
              options={[
                { value: '0', label: 'Auto' },
                { value: '5', label: '5' },
                { value: '10', label: '10' },
                { value: '20', label: '20' },
              ]}
            />
          </div>
          <div>
            <label className="label">Difficulty</label>
            <Segmented
              value={value.difficulty ?? 'mixed'}
              onChange={(difficulty) => onChange({ ...value, difficulty })}
              options={[
                { value: 'easy', label: 'Easier' },
                { value: 'mixed', label: 'Mixed' },
                { value: 'hard', label: 'Harder' },
              ]}
            />
          </div>
        </>
      )}
      {type === 'podcast' && (
        <div>
          <label className="label">Episode length</label>
          <Segmented
            value={value.length ?? 'standard'}
            onChange={(length) => onChange({ ...value, length })}
            options={[
              { value: 'short', label: '~5 min' },
              { value: 'standard', label: '~10 min' },
              { value: 'long', label: '~15 min' },
            ]}
          />
        </div>
      )}
      <div>
        <label className="label">Anything to focus on? (optional)</label>
        <input
          className="input"
          placeholder={type === 'quiz' ? 'e.g. "only chapter 4" or "more math problems"' : 'e.g. "focus on the formulas" or "explain it simpler"'}
          value={value.focus ?? ''}
          onChange={(e) => onChange({ ...value, focus: e.target.value })}
        />
      </div>
    </div>
  )
}

