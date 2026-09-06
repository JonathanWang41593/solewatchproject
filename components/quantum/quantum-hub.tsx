import { Atom, GraduationCap, Sigma, Thermometer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DocViewer } from '@/components/quantum/doc-viewer'
import { InlineMath, SectionLabel } from '@/components/quantum/math-block'
import { SensorComparison } from '@/components/quantum/sensor-comparison'
import { VqcSimulator } from '@/components/quantum/vqc-simulator'

const FACTS = [
  { icon: Atom, label: 'Qubits · parameters', value: '2 · 6θ', tone: 'text-indigo' },
  { icon: Sigma, label: 'VQC vs. linear (test)', value: '93.3% vs 100%', tone: 'text-primary' },
  { icon: Thermometer, label: 'SNSPD operating point', value: '≈ 2.5 K', tone: 'text-indigo' },
  { icon: GraduationCap, label: 'Target programmes', value: '7 universities', tone: 'text-primary' },
]

export function QuantumHub() {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="quantum-hero" className="glow-indigo relative overflow-hidden rounded-xl border border-indigo/25 bg-card p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-60" aria-hidden="true" />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex max-w-2xl flex-col gap-2">
              <SectionLabel className="text-indigo/90">Quantum Engineering Module · 40% of the project</SectionLabel>
              <h2 id="quantum-hero" className="text-balance font-mono text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Quantum Analytics &amp; Master Documentation Hub
              </h2>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                Where the classical plantar-pressure instrument meets quantum information physics: a live Qiskit-equivalent
                variational classifier, the SNSPD-vs-FSR sensing analysis, and every derivation, build step, and interview
                defence consolidated into one readable, exportable showcase.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="border-primary/40 font-mono text-primary">
                <InlineMath tex="\langle Z_1\rangle" /> readout
              </Badge>
              <Badge variant="outline" className="border-indigo/40 font-mono text-indigo">
                Statevector exact
              </Badge>
              <Badge variant="outline" className="font-mono text-muted-foreground">
                Not a medical device
              </Badge>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                <Icon className={`size-4 shrink-0 ${tone}`} aria-hidden="true" />
                <div className="flex flex-col">
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-sm text-foreground">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <SensorComparison />
      <VqcSimulator />
      <DocViewer />
    </div>
  )
}
