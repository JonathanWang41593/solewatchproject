import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  ghost?: number[]
  className?: string
  strokeClassName?: string
  label: string
}

const W = 160
const H = 40
const PAD = 2

function toPath(values: number[], min: number, range: number) {
  if (values.length < 2) return ''
  const stepX = (W - PAD * 2) / (values.length - 1)
  return values
    .map((v, i) => {
      const x = PAD + i * stepX
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export function Sparkline({ data, ghost, className, strokeClassName, label }: SparklineProps) {
  const all = ghost ? [...data, ...ghost] : data
  const min = all.length ? Math.min(...all) : 0
  const max = all.length ? Math.max(...all) : 1
  const range = Math.max(max - min, 1e-6)
  const pad = range * 0.15
  const path = toPath(data, min - pad, range + pad * 2)
  const ghostPath = ghost ? toPath(ghost, min - pad, range + pad * 2) : ''
  const lastX = data.length > 1 ? W - PAD : PAD
  const lastY = data.length ? H - PAD - ((data[data.length - 1] - (min - pad)) / (range + pad * 2)) * (H - PAD * 2) : H / 2

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn('h-10 w-full overflow-visible', className)}
    >
      <line x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} className="stroke-border" strokeWidth={0.5} strokeDasharray="2 3" />
      {ghostPath && <path d={ghostPath} fill="none" className="stroke-muted-foreground/40" strokeWidth={1} />}
      {path && (
        <path
          d={path}
          fill="none"
          className={cn('stroke-primary', strokeClassName)}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {data.length > 0 && (
        <circle cx={lastX} cy={lastY} r={2.5} className={cn('fill-primary', strokeClassName?.replace('stroke-', 'fill-'))} />
      )}
    </svg>
  )
}
