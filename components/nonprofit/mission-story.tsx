import { CircuitBoard, GraduationCap, HandCoins, HeartHandshake, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SectionLabel } from '@/components/quantum/math-block'

const BUDGET_TIERS = [
  { tier: 'Starter', cost: '$100', scope: 'One ESP32, 4× FSR402, MLX90614 IR sensor, breadboard, USB cable. Enough for one foot and the full signal chain.' },
  { tier: 'Bilateral', cost: '$250', scope: 'Two boards linked over ESP-NOW for left/right asymmetry statistics, plus insole blanks and a soldered protoboard.' },
  { tier: 'Workshop', cost: '$450', scope: 'Four Starter kits, a shared soldering station, and printed build guides for a club or classroom of 8–12.' },
]

const PILLARS = [
  {
    icon: CircuitBoard,
    title: 'Open hardware',
    body: 'Every schematic, firmware file, and analysis script is published. Nothing behind a paywall or a proprietary app.',
  },
  {
    icon: GraduationCap,
    title: 'STEM first',
    body: 'The device is a teaching instrument: ADC dividers, moving-average filters, z-scores, and a two-qubit variational classifier.',
  },
  {
    icon: ShieldCheck,
    title: 'Not a medical device',
    body: 'Flags are statistical outliers against a wearer’s own baseline. No diagnosis, no treatment advice, ever.',
  },
  {
    icon: HandCoins,
    title: 'Low-cost by design',
    body: 'Parts are chosen so a high-school club can build one for less than a graphing calculator.',
  },
]

export function MissionStory() {
  return (
    <section aria-labelledby="mission-heading" className="glow-success relative overflow-hidden rounded-xl border border-success/25 bg-card p-5 md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-60" aria-hidden="true" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-2xl flex-col gap-2">
            <SectionLabel className="text-success/90">Non-Profit &amp; Community Impact Hub</SectionLabel>
            <h2 id="mission-heading" className="text-balance font-mono text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              SoleWatch Initiative — Low-Cost Sensor Technology for Community Health
            </h2>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              A student-built engineering testbed that grew into a youth-led open-hardware initiative. The goal is not a
              product — it is to put a working, understandable sensing platform in the hands of senior centers, support
              groups, and STEM clubs for a few hundred dollars.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-success/40 font-mono text-success">
              Youth-led
            </Badge>
            <Badge variant="outline" className="border-primary/40 font-mono text-primary">
              60% EE · 40% Quantum
            </Badge>
            <Badge variant="outline" className="font-mono text-muted-foreground">
              Educational only
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <article className="flex flex-col gap-4 rounded-lg border border-border/60 bg-background/60 p-5 lg:col-span-3">
            <div className="flex items-center gap-2">
              <HeartHandshake className="size-4 text-success" aria-hidden="true" />
              <h3 className="font-mono text-sm font-semibold tracking-tight text-foreground">Where it started</h3>
            </div>
            <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                The project began at a kitchen table. A relative living with diabetes was managing foot complications, and the
                routine was the same every evening: look, touch, compare one foot to the other, and hope nothing had changed.
                The tools that could make that comparison objective cost thousands of dollars and lived in a clinic.
              </p>
              <p>
                That gap became the engineering question. Could a high-school student build something that measures the two
                physical quantities a caregiver is already checking by hand — where weight sits on the sole and whether one
                area is running warmer than the rest — using parts from a hobby-electronics catalogue?
              </p>
              <p>
                The answer is the SoleWatch testbed: four force-sensing resistors and an infrared thermometer read by an
                ESP32, filtered in firmware, and compared against the wearer&apos;s own logged baseline. Two boards talk
                over ESP-NOW so left and right can be compared directly. A second, quantum-engineering track asks whether a
                two-qubit variational circuit can classify the same data — a question chosen to stretch, not to ship.
              </p>
              <p className="text-foreground/90">
                Every design decision follows from that origin: keep it cheap, keep it open, teach the maths, and never
                pretend to be a medical device.
              </p>
            </div>
          </article>

          <div className="flex flex-col gap-3 lg:col-span-2">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary/80">Accessible budget · $100–$450</h3>
            <ul className="flex flex-col gap-2">
              {BUDGET_TIERS.map((t) => (
                <li key={t.tier} className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{t.tier} kit</span>
                    <span className="font-mono text-sm text-primary">{t.cost}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t.scope}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-4">
              <Icon className="size-4 text-success" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
