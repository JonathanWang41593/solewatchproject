'use client'

import { useMemo } from 'react'
import katex from 'katex'
import { cn } from '@/lib/utils'

interface MathProps {
  tex: string
  className?: string
}

function render(tex: string, displayMode: boolean) {
  return katex.renderToString(tex, { displayMode, throwOnError: false, strict: 'ignore' })
}

export function MathBlock({ tex, className }: MathProps) {
  const html = useMemo(() => render(tex, true), [tex])
  return (
    <div
      role="math"
      aria-label={tex}
      className={cn(
        'math-callout overflow-x-auto rounded-lg border border-indigo/25 bg-indigo/8 px-4 py-3 text-[15px] text-foreground',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function InlineMath({ tex, className }: MathProps) {
  const html = useMemo(() => render(tex, false), [tex])
  return <span role="math" aria-label={tex} className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  className?: string
}

export function CodeBlock({ code, language = 'text', title, className }: CodeBlockProps) {
  return (
    <figure className={cn('overflow-hidden rounded-lg border border-border/70 bg-background/70', className)}>
      {(title || language) && (
        <figcaption className="flex items-center justify-between border-b border-border/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          <span>{title ?? ''}</span>
          <span className="uppercase tracking-wider text-primary/80">{language}</span>
        </figcaption>
      )}
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </figure>
  )
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('font-mono text-[11px] uppercase tracking-[0.18em] text-primary/80', className)}>{children}</p>
  )
}
