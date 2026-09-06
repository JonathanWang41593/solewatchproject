'use client'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { NonprofitHub } from '@/components/nonprofit/nonprofit-hub'
import { QuantumHub } from '@/components/quantum/quantum-hub'
import { AppHeader } from '@/components/telemetry/app-header'
import { AsymmetryGauge } from '@/components/telemetry/asymmetry-gauge'
import { DisclaimerBanner } from '@/components/telemetry/disclaimer-banner'
import { PressureZoneCard } from '@/components/telemetry/pressure-zone-card'
import { SignalProcessingPanel } from '@/components/telemetry/signal-processing-panel'
import { TemperatureCard } from '@/components/telemetry/temperature-card'
import { useTelemetry } from '@/hooks/use-telemetry'
import { ZONES } from '@/lib/telemetry'

export function TelemetryDashboard() {
  const { frame, running, toggleRunning, setFilterOn, injectEvent, recalibrate } = useTelemetry()

  return (
    <Tabs defaultValue="telemetry" className="min-h-svh gap-0 bg-grid-faint">
      <AppHeader online={running} sampleCount={frame.sampleCount} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <TabsContent value="telemetry" className="flex flex-col gap-6">
          <section aria-labelledby="sensor-grid-heading" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="sensor-grid-heading" className="text-sm font-medium text-foreground">
                Real-Time Sensor Telemetry
              </h2>
              <p className="font-mono text-[11px] text-muted-foreground">
                4× FSR402 · 10 kΩ divider · 3.3 V rail · t = {frame.elapsedS.toFixed(1)} s
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {ZONES.map((spec, i) => (
                <PressureZoneCard
                  key={spec.id}
                  spec={spec}
                  reading={frame.zones[i]}
                  calibrating={frame.calibrating}
                  filterOn={frame.filterOn}
                />
              ))}
              <TemperatureCard reading={frame.temperature} calibrating={frame.calibrating} filterOn={frame.filterOn} />
            </div>
          </section>

          <section aria-labelledby="dsp-heading" className="flex flex-col gap-3">
            <h2 id="dsp-heading" className="text-sm font-medium text-foreground">
              Signal Processing &amp; Asymmetry Controls
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <SignalProcessingPanel
                frame={frame}
                running={running}
                onFilterChange={setFilterOn}
                onToggleRunning={toggleRunning}
                onInjectEvent={injectEvent}
                onRecalibrate={recalibrate}
              />
              <AsymmetryGauge frame={frame} />
            </div>
          </section>

          <DisclaimerBanner />
        </TabsContent>

        <TabsContent value="quantum">
          <QuantumHub />
        </TabsContent>

        <TabsContent value="nonprofit">
          <NonprofitHub />
        </TabsContent>
      </main>
    </Tabs>
  )
}
