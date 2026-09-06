import { Building2, Check, Download, FileCode2, Landmark, Layers, Scale } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionLabel } from '@/components/quantum/math-block'

const PATHS = [
  {
    icon: Building2,
    title: 'School-Sponsored Engineering Club Initiative',
    tag: 'Path A · Fastest start',
    tone: 'primary' as const,
    summary:
      'The initiative operates as a chartered club under the high school. The school district is the legal entity; the club handles builds, workshops, and documentation.',
    points: [
      'No separate legal filing — uses the school’s existing student-activity account',
      'Faculty advisor signs off on outreach to senior centers and support groups',
      'Purchases go through the district; donations are receipted by the school foundation',
      'Ideal for the first 2–3 semesters and for Science Fair / ISEF documentation',
    ],
    limits: 'Funds stay inside the district; grants that require a 501(c)(3) EIN are out of reach.',
  },
  {
    icon: Landmark,
    title: '501(c)(3) Fiscal Sponsorship Model',
    tag: 'Path B · Grant-ready',
    tone: 'indigo' as const,
    summary:
      'An existing 501(c)(3) (a maker-space, STEM foundation, or community health nonprofit) hosts the initiative as a sponsored project and accepts tax-deductible gifts on its behalf.',
    points: [
      'Donors receive a tax receipt from the sponsor; the project never handles the filing itself',
      'Sponsor typically keeps a 5–10% administrative fee and owns final financial oversight',
      'Opens micro-grants, corporate hardware donations, and university outreach funding',
      'Written MOU defines the educational, non-medical scope and who may distribute kits',
    ],
    limits: 'Requires a sponsor agreement and quarterly reporting; expect a 4–8 week onboarding.',
  },
]

const DOWNLOADS = [
  {
    icon: FileCode2,
    name: 'Firmware — C++ / Arduino',
    file: 'SoleWatch_Firmware.ino',
    href: '/docs/SoleWatch_Firmware.ino',
    detail: 'ESP32 sketch: 4× FSR ADC reads, MLX90614 over I²C, 10-sample moving average, running z-score, ESP-NOW bilateral link.',
    badge: 'MIT',
  },
  {
    icon: Layers,
    name: 'PCB — Gerber Fabrication Files',
    file: 'fig2_schematic.png',
    href: '/docs/fig2_schematic.png',
    detail: 'Rev-A schematic and insole layout. Gerber ZIP for the protoboard-to-PCB revision is published here when the layout is verified.',
    badge: 'Rev-A schematic',
  },
  {
    icon: FileCode2,
    name: 'Quantum — Python / Qiskit',
    file: 'solewatch_quantum_vqc.py',
    href: '/docs/solewatch_quantum_vqc.py',
    detail: 'Two-qubit variational classifier: angle encoding of pressure ratios, 6-parameter ansatz, ⟨Z₁⟩ readout, statevector training loop.',
    badge: 'Apache-2.0',
  },
  {
    icon: Download,
    name: 'Complete Engineering Guide',
    file: 'SoleWatch_Complete_Engineering_Guide.md',
    href: '/docs/SoleWatch_Complete_Engineering_Guide.md',
    detail: 'Block diagram, bill of materials, derivations, calibration procedure, and the interview defence — everything in one document.',
    badge: 'CC BY 4.0',
  },
]

const TONE = {
  primary: { border: 'border-primary/30', text: 'text-primary', glow: 'glow-primary' },
  indigo: { border: 'border-indigo/30', text: 'text-indigo', glow: 'glow-indigo' },
}

export function GovernancePortal() {
  return (
    <section aria-labelledby="governance-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <SectionLabel>Governance &amp; Fiscal Sponsorship Portal</SectionLabel>
        <h2 id="governance-heading" className="font-mono text-xl font-semibold tracking-tight text-foreground">
          Two organizational paths, one open-source release
        </h2>
        <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
          The initiative can run as a school club today and move under a fiscal sponsor when grant funding becomes the
          bottleneck. Both paths share the same published hardware and code.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PATHS.map(({ icon: Icon, title, tag, tone, summary, points, limits }) => {
          const t = TONE[tone]
          return (
            <Card key={title} className={`${t.glow} border ${t.border} bg-card`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex size-9 items-center justify-center rounded-lg bg-background/70 ${t.text}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <Badge variant="outline" className={`${t.border} font-mono ${t.text}`}>
                    {tag}
                  </Badge>
                </div>
                <CardTitle className="text-balance font-mono text-base">{title}</CardTitle>
                <CardDescription className="text-pretty leading-relaxed">{summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ul className="flex flex-col gap-2">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
                      <Check className={`mt-1 size-3.5 shrink-0 ${t.text}`} aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/8 p-3 text-xs leading-relaxed text-muted-foreground">
                  <Scale className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
                  {limits}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="font-mono text-base">Open-source downloads</CardTitle>
          <CardDescription>
            Everything needed to reproduce the testbed. Files are served directly from this site&apos;s{' '}
            <code className="font-mono text-foreground/90">/public/docs</code> folder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 md:grid-cols-2">
            {DOWNLOADS.map(({ icon: Icon, name, file, href, detail, badge }) => (
              <li key={file} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">{name}</p>
                  </div>
                  <Badge variant="outline" className="font-mono text-muted-foreground">
                    {badge}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <code className="truncate font-mono text-[11px] text-muted-foreground">{file}</code>
                  <Button size="sm" variant="outline" nativeButton={false} render={<a href={href} download />}>
                    <Download data-icon="inline-start" />
                    Download
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}
