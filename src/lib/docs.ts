/**
 * Extract readable text from documents in the browser (nothing is uploaded).
 * Supports PDF, Word (.docx), and plain text / Markdown.
 */
export const DOC_ACCEPT = '.pdf,.docx,.txt,.md,.markdown,.rtf,.csv,application/pdf,text/plain'

export async function extractText(file: File, onStage?: (s: string) => void): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return extractPdf(file, onStage)
  if (name.endsWith('.docx')) return extractDocx(file)
  if (name.endsWith('.doc')) throw new Error('Old .doc files are not supported. Save it as .docx or PDF first.')
  return (await file.text()).trim()
}

async function extractPdf(file: File, onStage?: (s: string) => void): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    onStage?.(`Reading page ${p} of ${doc.numPages}…`)
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()
    let line = ''
    const lines: string[] = []
    for (const item of tc.items as { str?: string; hasEOL?: boolean }[]) {
      if (typeof item.str !== 'string') continue
      line += item.str
      if (item.hasEOL) {
        lines.push(line)
        line = ''
      }
    }
    if (line) lines.push(line)
    const text = lines
      .join('\n')
      .replace(/[ \t]+/g, ' ')
      .trim()
    if (text) pages.push(`[Page ${p}]\n${text}`)
  }
  const out = pages.join('\n\n')
  if (out.replace(/\[Page \d+\]/g, '').trim().length < 20) {
    throw new Error("This PDF looks like scanned images with no selectable text, so it can't be read yet.")
  }
  return out
}

async function extractDocx(file: File): Promise<string> {
  // @ts-expect-error — the browser bundle ships without type declarations
  const mammoth = (await import('mammoth/mammoth.browser.min.js')).default as {
    extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
  }
  const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return res.value.trim()
}
