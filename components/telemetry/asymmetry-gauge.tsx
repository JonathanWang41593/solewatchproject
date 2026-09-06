import { Scale, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Z_SCORE_FLAG_THRESHOLD, type TelemetryFrame } from '@/lib/telemetry'

interface AsymmetryGaugeProps {
  frame: TelemetryFrame
}

export function AsymmetryGauge({ frame }: AsymmetryGaugeProps) {
  const flagged = frame.asymmetryFlag
  const zPct = Math.min(100, (frame.asymmetryZ / (Z_SCORE_FLAG_THRESHOLD * 1.5)) * 100)

  return (
    <Card size="sm" className={cn('ring-0 transition-shadow duration-500', flagged ? 'glow-destructive' : 'glow-success')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Scale className="size-4 text-accent" aria-hidden="true" />
          Foot Asymmetry Gauge
        </CardTitle>
        <CardDescription className="text-[11px]">Left vs. right total loading · ESP-NOW bilateral link</CardDescription>
        <CardAction>
          {frame.calibrating ? (
            <Badge variant="outline" className="text-muted-foreground">
              Baselining {Math.round(frame.calibrationProgress * 100)}%
            </Badge>
          ) : flagged ? (
            <Badge variant="destructive" role="status" aria-live="polite">
              <TriangleAlert data-icon="inline-start" />
              Flag &gt; 3σ
            </Badge>
          ) : (
            <Badge variant="success">Within 3σ</Badge>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Progress value={frame.left.pct} className="gap-1.5 [&_[data-slot=progress-track]]:h-2">
            <ProgressLabel className="font-mono text-xs">Left foot</ProgressLabel>
            <ProgressValue className="font-mono text-xs text-foreground">
              {() => `${frame.left.pct.toFixed(1)}% · ${Math.round(frame.left.counts)} counts`}
            </ProgressValue>
          </Progress>
          <Progress
            value={frame.right.pct}
            className={cn(
              'gap-1.5 [&_[data-slot=progress-track]]:h-2',
              flagged ? '[&_[data-slot=progress-indicator]]:bg-destructive' : '[&_[data-slot=progress-indicator]]:bg-accent',
            )}
          >
            <ProgressLabel className="font-mono text-xs">Right foot</ProgressLabel>
            <ProgressValue className="font-mono text-xs text-foreground">
              {() => `${frame.right.pct.toFixed(1)}% · ${Math.round(frame.right.counts)} counts`}
            </ProgressValue>
          </Progress>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>|Δ − μ<sub>Δ</sub>| / σ<sub>Δ</sub></span>
            <span className={cn('tabular-nums', flagged ? 'text-destructive' : 'text-foreground')}>
              {frame.calibrating ? '—' : `${frame.asymmetryZ.toFixed(2)}σ`}
            </span>
          </div>
          <div className="relative h-1.5 w-full rounded-full bg-muted" aria-hidden="true">
            <div
              className={cn('h-full rounded-full transition-[width] duration-100', flagged ? 'bg-destructive' : 'bg-primary')}
              style={{ width: `${frame.calibrating ? 0 : zPct}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-destructive"
              style={{ left: `${(Z_SCORE_FLAG_THRESHOLD / (Z_SCORE_FLAG_THRESHOLD * 1.5)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>0σ</span>
            <span className="text-destructive">3σ flag</span>
            <span>4.5σ</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
