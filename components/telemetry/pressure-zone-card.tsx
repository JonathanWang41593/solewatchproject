import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkline } from '@/components/telemetry/sparkline'
import { StatusBadge, statusGlowClass } from '@/components/telemetry/status-badge'
import { cn } from '@/lib/utils'
import { ADC_MAX_COUNTS, type ZoneReading, type ZoneSpec } from '@/lib/telemetry'

interface PressureZoneCardProps {
  spec: ZoneSpec
  reading: ZoneReading
  calibrating: boolean
  filterOn: boolean
}

const STROKE_BY_STATUS = {
  normal: 'stroke-primary',
  drift: 'stroke-warning',
  asymmetry: 'stroke-destructive',
}

export function PressureZoneCard({ spec, reading, calibrating, filterOn }: PressureZoneCardProps) {
  const fill = Math.min(100, (reading.value / ADC_MAX_COUNTS) * 100)

  return (
    <Card size="sm" className={cn('ring-0 transition-shadow duration-500', statusGlowClass(reading.status, calibrating))}>
      <CardHeader>
        <CardTitle className="text-sm">{spec.label}</CardTitle>
        <CardDescription className="font-mono text-[11px]">
          {spec.anatomical} · {spec.pin}
        </CardDescription>
        <CardAction>
          <StatusBadge status={reading.status} calibrating={calibrating} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-3xl font-semibold tabular-nums leading-none text-foreground">
              {Math.round(reading.value)}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">raw / {ADC_MAX_COUNTS}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono text-lg tabular-nums leading-none text-primary">{reading.volts.toFixed(3)} V</span>
            <span className="mt-1 text-[11px] text-muted-foreground">V = raw × 3.3 / {ADC_MAX_COUNTS}</span>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-100',
              reading.status === 'asymmetry' ? 'bg-destructive' : reading.status === 'drift' ? 'bg-warning' : 'bg-primary',
            )}
            style={{ width: `${fill}%` }}
          />
        </div>

        <Sparkline
          data={filterOn ? reading.history : reading.rawHistory}
          ghost={filterOn ? reading.rawHistory : undefined}
          strokeClassName={STROKE_BY_STATUS[reading.status]}
          label={`${spec.label} pressure trend, last ${reading.history.length} frames`}
        />
      </CardContent>

      <CardFooter className="justify-between font-mono text-[11px] text-muted-foreground">
        <span>
          z<sub>self</sub> {calibrating ? '—' : reading.zScore.toFixed(2)}σ
        </span>
        <span>
          z<sub>L/R</sub> {calibrating ? '—' : reading.bilateralZ.toFixed(2)}σ
        </span>
      </CardFooter>
    </Card>
  )
}
