import { useRef, useState } from 'react'
import { Maximize2, Download } from 'lucide-react'
import type { Visual } from '../../lib/types'
import Mermaid from '../Mermaid'
import Markdown from '../Markdown'
import { IconButton, Modal, Badge } from '../ui'
import { download } from '../../lib/export'
import { slug } from '../../lib/format'

const KIND_LABEL: Record<Visual['kind'], string> = {
  mindmap: 'Mind map',
  concept_map: 'Concept map',
  flowchart: 'Flowchart',
  timeline: 'Timeline',
  sequence: 'Sequence',
  comparison_table: 'Comparison',
}

function VisualCard({ v }: { v: Visual }) {
  const [full, setFull] = useState(false)
  const svgRef = useRef<string | null>(null)
  const body = v.mermaid ? <Mermaid code={v.mermaid} onSvg={(s) => (svgRef.current = s)} /> : <Markdown>{v.markdown}</Markdown>
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 pb-0">
        <div>
          <Badge tone="accent">{KIND_LABEL[v.kind] || v.kind}</Badge>
          <h3 className="mt-2 font-semibold">{v.title}</h3>
          <p className="muted mt-0.5 text-sm">{v.caption}</p>
        </div>
        <div className="no-print flex shrink-0">
          {v.mermaid && (
            <IconButton label="Download image" onClick={() => svgRef.current && download(`${slug(v.title)}.svg`, svgRef.current, 'image/svg+xml')}>
              <Download className="size-4" />
            </IconButton>
          )}
          <IconButton label="Full screen" onClick={() => setFull(true)}>
            <Maximize2 className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="p-4">{body}</div>
      <Modal open={full} onClose={() => setFull(false)} title={v.title} wide>
        <div className="overflow-auto">{full && body}</div>
      </Modal>
    </div>
  )
}

export default function VisualsView({ visuals }: { visuals: Visual[] }) {
  return (
    <div className="space-y-4">
      {visuals.map((v, i) => (
        <VisualCard key={i} v={v} />
      ))}
    </div>
  )
}
