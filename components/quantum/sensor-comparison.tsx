import { Atom, Snowflake, Sun, Waves, Zap, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InlineMath, SectionLabel } from '@/components/quantum/math-block'

interface Metric {
  label: string
  fsr: React.ReactNode
  snspd: React.ReactNode
}

const METRICS: Metric[] = [
  {
    label: 'Operating temperature',
    fsr: (
      <span className="flex items-center gap-1.5">
        <Sun className="size-3.5 text-warning" aria-hidden="true" /> Room temperature (~293 K)
      </span>
    ),
    snspd: (
      <span className="flex items-center gap-1.5">
        <Snowflake className="size-3.5 text-indigo" aria-hidden="true" /> Cryogenic, ≈ 2.5 K (below{' '}
        <InlineMath tex="T_c" />)
      </span>
    ),
  },
  {
    label: 'Physical mechanism',
    fsr: 'Mechanical contact resistance — force compresses a conductive polymer, opening more conduction paths',
    snspd: 'Cooper-pair breakdown — one absorbed photon breaks a pair, nucleating a resistive hotspot in a biased nanowire',
  },
  {
    label: 'Target signal',
    fsr: 'Macroscopic physical force (plantar load, ~N)',
    snspd: 'Single-photon quanta (near-IR, ~1 eV each)',
  },
  {
    label: 'Signal energy scale',
    fsr: <InlineMath tex="10^{-3}\ \text{–}\ 10^{0}\ \text{J of mechanical work}" />,
    snspd: <InlineMath tex="\approx 1\ \text{eV} \approx 1.6\times10^{-19}\ \text{J}" />,
  },
  {
    label: 'Governing regime',
    fsr: 'Classical, bulk material response',
    snspd: 'Quantum — superconducting many-body state, discrete detection events',
  },
  {
    label: 'Output',
    fsr: 'Continuous analog resistance → divider voltage → 12-bit ADC',
    snspd: 'Discrete voltage pulse per photon, ~ps timing jitter',
  },
  {
    label: 'Dominant limitations',
    fsr: 'Hysteresis, creep, contact-area drift, temperature cross-sensitivity (Part 4.2)',
    snspd: 'Dark counts, timing jitter, recovery (dead) time, cryostat overhead',
  },
]

function ColumnHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  tone,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  badge: string
  tone: 'primary' | 'indigo'
}) {
  const ring = tone === 'primary' ? 'glow-primary text-primary' : 'glow-indigo text-indigo'
  return (
    <div className="flex items-start gap-3">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-background ${ring}`}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-mono text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        <Badge variant="outline" className={tone === 'primary' ? 'w-fit border-primary/40 text-primary' : 'w-fit border-indigo/40 text-indigo'}>
          {badge}
        </Badge>
      </div>
    </div>
  )
}

export function SensorComparison() {
  return (
    <Card className="glow-primary bg-card">
      <CardHeader>
        <SectionLabel>Widget 01 · Quantum vs. classical sensing</SectionLabel>
        <CardTitle className="font-mono text-base">FSR (this build) vs. SNSPD (the quantum limit)</CardTitle>
        <CardDescription className="text-pretty">
          Two sensors that solve the same problem — turn a physical stimulus into an electrical signal — from
          opposite ends of the energy scale. The engineering skill on display is matching the sensor architecture
          to the signal&apos;s actual physical scale.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <ColumnHeader
            icon={Waves}
            title="Force-Sensitive Resistor · Interlink FSR 402"
            subtitle="4× per insole, 10 kΩ divider, 3.3 V rail, ESP32 ADC1"
            badge="Classical · room temperature"
            tone="primary"
          />
          <ColumnHeader
            icon={Atom}
            title="Superconducting Nanowire Single-Photon Detector"
            subtitle="NbN / WSi nanowire, tens of nm wide, current-biased below Ic"
            badge="Quantum · cryogenic"
            tone="indigo"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-background/60 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Metric
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-primary">
                  FSR
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-indigo">
                  SNSPD
                </th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => (
                <tr key={m.label} className="border-b border-border/40 last:border-0">
                  <th scope="row" className="px-3 py-2.5 text-left align-top font-medium text-foreground/90">
                    {m.label}
                  </th>
                  <td className="px-3 py-2.5 align-top leading-relaxed text-muted-foreground">{m.fsr}</td>
                  <td className="px-3 py-2.5 align-top leading-relaxed text-muted-foreground">{m.snspd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
            <p className="flex items-center gap-2 font-mono text-xs font-semibold text-primary">
              <Zap className="size-3.5" aria-hidden="true" /> Why SoleWatch uses an FSR
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              A plantar force signal sits many orders of magnitude above room-temperature thermal noise (
              <InlineMath tex="k_B T \approx 25\ \text{meV}" />
              ). Cooling an FSR would only shift its calibration curve — cryogenics would add cost and complexity with
              zero sensitivity benefit.
            </p>
          </div>
          <div className="rounded-lg border border-indigo/25 bg-indigo/8 p-3">
            <p className="flex items-center gap-2 font-mono text-xs font-semibold text-indigo">
              <Snowflake className="size-3.5" aria-hidden="true" /> Why an SNSPD must be cryogenic
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              A single photon carries ~1 eV, comparable to the thermal energy that would randomly break Cooper pairs
              at room temperature. Only below <InlineMath tex="T_c" /> does the superconducting state exist to be
              disrupted — cryogenic operation is the <em>only</em> way to resolve the event at all.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
