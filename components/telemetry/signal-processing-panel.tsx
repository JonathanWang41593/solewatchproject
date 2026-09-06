import { AudioWaveform, Pause, Play, RotateCcw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { FILTER_WINDOW, type TelemetryFrame } from '@/lib/telemetry'

interface SignalProcessingPanelProps {
  frame: TelemetryFrame
  running: boolean
  onFilterChange: (on: boolean) => void
  onToggleRunning: () => void
  onInjectEvent: () => void
  onRecalibrate: () => void
}

export function SignalProcessingPanel({
  frame,
  running,
  onFilterChange,
  onToggleRunning,
  onInjectEvent,
  onRecalibrate,
}: SignalProcessingPanelProps) {
  const attenuation =
    frame.noiseSigmaRaw > 1e-6 ? (20 * Math.log10(frame.noiseSigmaFiltered / frame.noiseSigmaRaw)).toFixed(1) : '—'
  const theoretical = (20 * Math.log10(1 / Math.sqrt(FILTER_WINDOW))).toFixed(1)

  return (
    <Card size="sm" className="glow-primary ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <AudioWaveform className="size-4 text-primary" aria-hidden="true" />
          Signal Processing
        </CardTitle>
        <CardDescription className="text-[11px]">Discrete-time smoothing applied before baselining</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 p-3">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="ma-filter" className="text-sm">
              Moving Average Noise Filter
            </Label>
            <span className="font-mono text-[11px] text-muted-foreground">
              y[n] = (1/{FILTER_WINDOW}) Σ x[n−k], k = 0…{FILTER_WINDOW - 1}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{frame.filterOn ? 'ON' : 'OFF'}</span>
            <Switch id="ma-filter" checked={frame.filterOn} onCheckedChange={onFilterChange} />
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 font-mono text-[11px]">
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 p-2">
            <dt className="text-muted-foreground">σ raw (heel)</dt>
            <dd className="text-sm tabular-nums text-foreground">{frame.noiseSigmaRaw.toFixed(1)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 p-2">
            <dt className="text-muted-foreground">σ filtered</dt>
            <dd className="text-sm tabular-nums text-primary">{frame.noiseSigmaFiltered.toFixed(1)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 p-2">
            <dt className="text-muted-foreground">gain (N={FILTER_WINDOW})</dt>
            <dd className="text-sm tabular-nums text-foreground">
              {attenuation} <span className="text-muted-foreground">/ {theoretical} dB</span>
            </dd>
          </div>
        </dl>

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Bench controls</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onToggleRunning} aria-pressed={!running}>
              {running ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
              {running ? 'Hold stream' : 'Resume stream'}
            </Button>
            <Button variant="outline" size="sm" onClick={onInjectEvent} disabled={frame.calibrating || frame.eventActive}>
              <Zap data-icon="inline-start" />
              Inject load shift
            </Button>
            <Button variant="ghost" size="sm" onClick={onRecalibrate}>
              <RotateCcw data-icon="inline-start" />
              Re-baseline
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
