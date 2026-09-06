import { Thermometer } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkline } from '@/components/telemetry/sparkline'
import { StatusBadge, statusGlowClass } from '@/components/telemetry/status-badge'
import { cn } from '@/lib/utils'
import { fahrenheitToCelsius, type TemperatureReading } from '@/lib/telemetry'

interface TemperatureCardProps {
  reading: TemperatureReading
  calibrating: boolean
  filterOn: boolean
}

export function TemperatureCard({ reading, calibrating, filterOn }: TemperatureCardProps) {
  return (
    <Card size="sm" className={cn('ring-0 transition-shadow duration-500', statusGlowClass(reading.status, calibrating))}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Thermometer className="size-4 text-accent" aria-hidden="true" />
          Skin Surface Temp
        </CardTitle>
        <CardDescription className="font-mono text-[11px]">MLX90614 IR · I2C 0x5A · SDA21/SCL22</CardDescription>
        <CardAction>
          <StatusBadge status={reading.status} calibrating={calibrating} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-3xl font-semibold tabular-nums leading-none text-foreground">
              {reading.value.toFixed(1)}
              <span className="ml-1 text-lg text-accent">°F</span>
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">object temp · emissivity 0.98</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono text-lg tabular-nums leading-none text-accent">
              {fahrenheitToCelsius(reading.value).toFixed(2)} °C
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">±0.5 °C sensor spec</span>
          </div>
        </div>

        <Sparkline
          data={filterOn ? reading.history : reading.rawHistory}
          ghost={filterOn ? reading.rawHistory : undefined}
          strokeClassName={reading.status === 'drift' ? 'stroke-warning' : 'stroke-accent'}
          label={`Skin temperature trend, last ${reading.history.length} frames`}
        />
      </CardContent>

      <CardFooter className="justify-between font-mono text-[11px] text-muted-foreground">
        <span>
          z<sub>self</sub> {calibrating ? '—' : reading.zScore.toFixed(2)}σ
        </span>
        <span>lit. ref ΔT 2.2 °C (reported, not enforced)</span>
      </CardFooter>
    </Card>
  )
}
