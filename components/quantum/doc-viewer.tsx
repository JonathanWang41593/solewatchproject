'use client'

import { useCallback, useState } from 'react'
import { BookOpenText, Download, FileText, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock, MathBlock, SectionLabel } from '@/components/quantum/math-block'
import { DOC_SECTIONS, sectionsToMarkdown, type Block } from '@/lib/docs-content'
import { cn } from '@/lib/utils'

const CALLOUT_TONE = {
  primary: 'border-primary/30 bg-primary/6 [&_p:first-child]:text-primary',
  indigo: 'border-indigo/30 bg-indigo/8 [&_p:first-child]:text-indigo',
  warning: 'border-warning/35 bg-warning/8 [&_p:first-child]:text-warning',
}

function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'h3':
      return <h3 className="mt-2 font-mono text-sm font-semibold tracking-tight text-foreground">{block.text}</h3>
    case 'p':
      return <p className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>
    case 'math':
      return (
        <div className="flex flex-col gap-1.5">
          <MathBlock tex={block.tex} />
          {block.caption && <p className="text-xs leading-relaxed text-muted-foreground">{block.caption}</p>}
        </div>
      )
    case 'code':
      return <CodeBlock code={block.code} language={block.language} title={block.title} />
    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-background/60 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {block.head.map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className={cn('px-3 py-2 align-top leading-relaxed', j === 0 ? 'text-foreground/90' : 'text-muted-foreground')}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'callout':
      return (
        <div className={cn('rounded-lg border p-3', CALLOUT_TONE[block.tone])}>
          <p className="font-mono text-xs font-semibold">{block.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{block.text}</p>
        </div>
      )
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag className={cn('flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground', block.ordered ? 'list-decimal' : 'list-disc')}>
          {block.items.map((it, i) => (
            <li key={i} className="marker:text-primary/70">
              {it}
            </li>
          ))}
        </Tag>
      )
    }
  }
}

export function DocViewer() {
  const [active, setActive] = useState(DOC_SECTIONS[0].id)

  const exportMarkdown = useCallback(() => {
    const blob = new Blob([sectionsToMarkdown()], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'SoleWatch_Quantum_Master_Documentation.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportPdf = useCallback(() => {
    // Uses the browser's print-to-PDF pipeline; the print stylesheet expands every tab.
    window.print()
  }, [])

  return (
    <Card className="glow-primary bg-card print:shadow-none" id="master-docs">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Widget 03 · Master documentation &amp; whitepaper viewer</SectionLabel>
            <CardTitle className="flex items-center gap-2 font-mono text-base">
              <BookOpenText className="size-4 text-primary" aria-hidden="true" /> SoleWatch Complete Engineering Guide
            </CardTitle>
            <CardDescription className="text-pretty">
              All project documentation consolidated into one structured showcase — derivations, quantum theory, build
              sequence, and admissions defence — from a single source that also exports as Markdown.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={exportMarkdown}>
              <Download data-icon="inline-start" /> Markdown
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <Printer data-icon="inline-start" /> PDF
            </Button>
            <Button variant="ghost" size="sm" render={<a href="/docs/SoleWatch_Complete_Engineering_Guide.md" download />}>
              <FileText data-icon="inline-start" /> Full guide (.md)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={active} onValueChange={(v) => setActive(String(v))} className="gap-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-background/60 p-1 print:hidden">
            {DOC_SECTIONS.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="h-8 flex-none px-3 font-mono text-xs data-active:bg-primary/15 data-active:text-primary">
                {s.tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {DOC_SECTIONS.map((s) => (
            <TabsContent key={s.id} value={s.id} keepMounted className="doc-section print:block" data-active={active === s.id}>
              <article className="flex flex-col gap-4" aria-labelledby={`doc-${s.id}`}>
                <header className="flex flex-col gap-2 border-b border-border/60 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={`doc-${s.id}`} className="font-mono text-lg font-semibold tracking-tight text-foreground">
                      {s.title}
                    </h2>
                    <Badge variant="outline" className="border-indigo/40 font-mono text-indigo">
                      {s.weight}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.subtitle}</p>
                </header>
                {s.blocks.map((b, i) => (
                  <RenderBlock key={i} block={b} />
                ))}
              </article>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
