import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeKatex from 'rehype-katex'
import { cx } from './ui'

// Allow <details>/<summary> (used for hidden answers) and the classes math rendering needs.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'details', 'summary'],
  attributes: {
    ...defaultSchema.attributes,
    details: ['open'],
    code: [...(defaultSchema.attributes?.code || []), ['className', /^language-./, 'math-inline', 'math-display']],
    span: [...(defaultSchema.attributes?.span || []), ['className', 'math-inline', 'math-display']],
    div: [...(defaultSchema.attributes?.div || []), ['className', 'math-inline', 'math-display']],
    input: [...(defaultSchema.attributes?.input || []), ['type', 'checkbox'], 'checked', 'disabled'],
  },
}

export default function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cx('prose-study', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], [rehypeKatex, { throwOnError: false, strict: 'ignore' }]]}
        components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

/** Inline markdown for short strings (cards, quiz options) — no block wrappers. */
export function InlineMd({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cx('[&_.katex]:text-[1.02em] [&_p]:inline', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: 'ignore' }]]}
        components={{ p: ({ children }) => <>{children} </> }}
      >
        {children}
      </ReactMarkdown>
    </span>
  )
}
