import { Activity, Atom, Footprints, HeartHandshake } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SAMPLE_RATE_HZ } from '@/lib/telemetry'

interface AppHeaderProps {
  online: boolean
  sampleCount: number
}

export function AppHeader({ online, sampleCount }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="glow-primary flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
              <Footprints className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-mono text-lg font-semibold tracking-tight text-foreground">SoleWatch</h1>
              <p className="text-xs text-muted-foreground">Dual Electrical &amp; Quantum Engineering Testbed</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={online ? 'success' : 'warning'} className="h-6 gap-2 px-2.5 font-mono">
              <span
                aria-hidden="true"
                className={online ? 'size-1.5 rounded-full bg-success animate-status-pulse' : 'size-1.5 rounded-full bg-warning'}
              />
              {online ? `Online / ${SAMPLE_RATE_HZ}Hz Sampling` : 'Paused / Stream Held'}
            </Badge>
            <Badge variant="outline" className="hidden h-6 px-2.5 font-mono text-muted-foreground sm:inline-flex">
              n = {sampleCount.toLocaleString()}
            </Badge>
          </div>
        </div>

        <TabsList variant="line" className="w-full justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="telemetry" className="flex-none px-2">
            <Activity data-icon="inline-start" />
            Telemetry Dashboard
          </TabsTrigger>
          <TabsTrigger value="quantum" className="flex-none px-2">
            <Atom data-icon="inline-start" />
            Quantum Analytics
          </TabsTrigger>
          <TabsTrigger value="nonprofit" className="flex-none px-2">
            <HeartHandshake data-icon="inline-start" />
            Non-Profit Hub
          </TabsTrigger>
        </TabsList>
      </div>
    </header>
  )
}
