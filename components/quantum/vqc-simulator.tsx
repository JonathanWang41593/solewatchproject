'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cpu, Dices, Play, RotateCcw, Square } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { InlineMath, SectionLabel } from '@/components/quantum/math-block'
import {
  BASIS_LABELS,
  CIRCUIT_LAYOUT,
  TRAINED_THETA,
  accuracy,
  buildDataset,
  createSimplex,
  fitLinear,
  linearAccuracy,
  mseLoss,
  mulberry32,
  nelderMeadStep,
  predict,
  sampleShots,
  wrapAngle,
  type Features,
  type Simplex,
} from '@/lib/quantum'

const DATASET = buildDataset(42)
const LINEAR_W = fitLinear(DATASET.train)
const LINEAR_ACC = {
  train: linearAccuracy(LINEAR_W, DATASET.train),
  test: linearAccuracy(LINEAR_W, DATASET.test),
}
const GRID = 22
const SHOTS = 2048
const TRAIN_ITERS = 900
const ITERS_PER_FRAME = 12

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

function sliderValue(v: number | readonly number[]) {
  return Array.isArray(v) ? (v[0] as number) : (v as number)
}

// ---------- circuit diagram ----------

function CircuitDiagram() {
  const colW = 54
  const left = 44
  const width = left + CIRCUIT_LAYOUT.length * colW + 60
  const wireY = [34, 82]
  const encodeEnd = CIRCUIT_LAYOUT.filter((g) => g.group === 'encode').length

  return (
    <svg
      viewBox={`0 0 ${width} 116`}
      className="h-auto w-full min-w-[560px] font-mono"
      role="img"
      aria-label="Two-qubit variational quantum classifier circuit: data re-uploading RY encoder with a CNOT, followed by RY, RZ, CNOT, RY variational layers and a Z measurement on qubit 1"
    >
      <rect x={left - 8} y={8} width={encodeEnd * colW} height={100} rx={6} className="fill-primary/6 stroke-primary/25" strokeDasharray="3 3" />
      <rect
        x={left - 8 + encodeEnd * colW + 4}
        y={8}
        width={(CIRCUIT_LAYOUT.length - encodeEnd) * colW - 4}
        height={100}
        rx={6}
        className="fill-indigo/8 stroke-indigo/30"
        strokeDasharray="3 3"
      />
      <text x={left - 2} y={20} className="fill-primary text-[9px]">
        encoder (x)
      </text>
      <text x={left - 2 + encodeEnd * colW + 6} y={20} className="fill-indigo text-[9px]">
        variational ansatz (θ)
      </text>

      {wireY.map((y, q) => (
        <g key={q}>
          <text x={4} y={y + 3} className="fill-muted-foreground text-[10px]">
            q{q} |0⟩
          </text>
          <line x1={left} y1={y} x2={width - 8} y2={y} className="stroke-foreground/45" strokeWidth={1.2} />
        </g>
      ))}

      {CIRCUIT_LAYOUT.map((g, i) => {
        const cx = left + i * colW + colW / 2
        const tone = g.group === 'encode' ? 'fill-primary' : 'fill-indigo'
        if (g.qubit === 'cx') {
          return (
            <g key={i}>
              <line x1={cx} y1={wireY[0]} x2={cx} y2={wireY[1]} className="stroke-foreground/80" strokeWidth={1.4} />
              <circle cx={cx} cy={wireY[0]} r={4} className={tone} />
              <circle cx={cx} cy={wireY[1]} r={9} className="fill-transparent stroke-foreground/80" strokeWidth={1.4} />
              <line x1={cx - 9} y1={wireY[1]} x2={cx + 9} y2={wireY[1]} className="stroke-foreground/80" strokeWidth={1.4} />
              <line x1={cx} y1={wireY[1] - 9} x2={cx} y2={wireY[1] + 9} className="stroke-foreground/80" strokeWidth={1.4} />
            </g>
          )
        }
        const y = wireY[g.qubit]
        return (
          <g key={i}>
            <rect x={cx - 23} y={y - 12} width={46} height={24} rx={4} className={`${tone} opacity-90`} />
            <text x={cx} y={y + 3.5} textAnchor="middle" className="fill-background text-[9px] font-semibold">
              {g.label}
            </text>
          </g>
        )
      })}

      {/* measurement on qubit 1 (Qiskit label "ZI") */}
      {(() => {
        const mx = width - 30
        const y = wireY[1]
        return (
          <g>
            <rect x={mx - 14} y={y - 12} width={28} height={24} rx={4} className="fill-card stroke-warning" strokeWidth={1.2} />
            <path d={`M ${mx - 8} ${y + 6} A 8 8 0 0 1 ${mx + 8} ${y + 6}`} className="fill-none stroke-warning" strokeWidth={1.2} />
            <line x1={mx} y1={y + 6} x2={mx + 6} y2={y - 4} className="stroke-warning" strokeWidth={1.2} />
            <text x={mx} y={y + 24} textAnchor="middle" className="fill-warning text-[9px]">
              ⟨Z⟩
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

// ---------- probability bars ----------

function ProbabilityBars({ probs, counts }: { probs: number[]; counts: number[] }) {
  return (
    <div className="flex flex-col gap-2">
      {BASIS_LABELS.map((label, k) => {
        const q1IsZero = k < 2
        return (
          <div key={label} className="grid grid-cols-[52px_1fr_88px] items-center gap-3 text-xs">
            <span className="font-mono text-foreground">
              |{label}⟩
            </span>
            <div className="relative h-5 overflow-hidden rounded-sm bg-muted">
              <div
                className={`absolute inset-y-0 left-0 rounded-sm transition-[width] duration-300 ${q1IsZero ? 'bg-destructive/80' : 'bg-primary/85'}`}
                style={{ width: `${probs[k] * 100}%` }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-y-1 left-0 w-0.5 -translate-x-1/2 bg-foreground/90 transition-[left] duration-300"
                style={{ left: `${(counts[k] / SHOTS) * 100}%` }}
                aria-hidden="true"
                title={`Shot estimate ${counts[k]}/${SHOTS}`}
              />
            </div>
            <span className="text-right font-mono text-muted-foreground">
              {pct(probs[k])} <span className="text-foreground/50">·</span> {counts[k]}
            </span>
          </div>
        )
      })}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Bitstrings read <span className="font-mono">q1q0</span> (Qiskit little-endian). Bars = exact statevector
        probability; ticks = {SHOTS}-shot sample. Red states have q1 = 0 and vote &quot;flagged&quot;; cyan states have
        q1 = 1 and vote &quot;baseline&quot;.
      </p>
    </div>
  )
}

// ---------- decision map ----------

function DecisionMap({ theta, point }: { theta: number[]; point: Features }) {
  const cells = useMemo(() => {
    const out: number[] = []
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        out.push(predict([(i + 0.5) / GRID, (j + 0.5) / GRID], theta).pFlagged)
      }
    }
    return out
  }, [theta])

  const size = 240
  const cell = size / GRID
  return (
    <svg
      viewBox={`-30 -8 ${size + 40} ${size + 40}`}
      className="h-auto w-full max-w-[320px]"
      role="img"
      aria-label="Decision region of the trained VQC over pressure and temperature asymmetry, with the training and test dataset overlaid"
    >
      {cells.map((p, idx) => {
        const i = idx % GRID
        const j = Math.floor(idx / GRID)
        return (
          <rect
            key={idx}
            x={i * cell}
            y={size - (j + 1) * cell}
            width={cell + 0.4}
            height={cell + 0.4}
            className={p > 0.5 ? 'fill-destructive' : 'fill-primary'}
            style={{ opacity: 0.12 + Math.abs(p - 0.5) * 0.9 }}
          />
        )
      })}
      {DATASET.all.map((s, i) => (
        <circle
          key={i}
          cx={s.x[0] * size}
          cy={size - s.x[1] * size}
          r={3.2}
          className={s.y === 1 ? 'fill-destructive stroke-background' : 'fill-primary stroke-background'}
          strokeWidth={1}
        />
      ))}
      <circle cx={point[0] * size} cy={size - point[1] * size} r={7} className="fill-none stroke-warning" strokeWidth={2} />
      <circle cx={point[0] * size} cy={size - point[1] * size} r={2} className="fill-warning" />
      <rect x={0} y={0} width={size} height={size} className="fill-none stroke-border" />
      <text x={size / 2} y={size + 22} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
        pressure asymmetry x₀ →
      </text>
      <text
        x={-16}
        y={size / 2}
        textAnchor="middle"
        transform={`rotate(-90 -16 ${size / 2})`}
        className="fill-muted-foreground font-mono text-[10px]"
      >
        temperature asymmetry x₁ →
      </text>
    </svg>
  )
}

// ---------- main widget ----------

interface TrainState {
  running: boolean
  iter: number
  loss: number
}

export function VqcSimulator() {
  const [x0, setX0] = useState(0.62)
  const [x1, setX1] = useState(0.58)
  const [theta, setTheta] = useState<number[]>(TRAINED_THETA)
  const [train, setTrain] = useState<TrainState>({ running: false, iter: 0, loss: mseLoss(TRAINED_THETA, DATASET.train) })
  const simplexRef = useRef<Simplex | null>(null)
  const frameRef = useRef<number | null>(null)
  const seedRef = useRef(1)

  const point: Features = [x0, x1]
  const prediction = useMemo(() => predict(point, theta), [x0, x1, theta])
  const counts = useMemo(() => sampleShots(prediction.probs, SHOTS, Math.round(x0 * 1000 + x1 * 7919)), [prediction, x0, x1])
  const acc = useMemo(
    () => ({ train: accuracy(theta, DATASET.train), test: accuracy(theta, DATASET.test) }),
    [theta],
  )

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    setTrain((t) => ({ ...t, running: false }))
  }, [])

  useEffect(() => () => stop(), [stop])

  const loss = useCallback((t: number[]) => mseLoss(t, DATASET.train), [])

  const startTraining = useCallback(() => {
    stop()
    const rand = mulberry32(seedRef.current++)
    const x0Init = Array.from({ length: 6 }, () => rand() * 2 * Math.PI)
    simplexRef.current = createSimplex(loss, x0Init)
    setTheta(x0Init)
    setTrain({ running: true, iter: 0, loss: loss(x0Init) })

    const tick = () => {
      const s = simplexRef.current
      if (!s) return
      let best = { x: x0Init, f: Number.POSITIVE_INFINITY }
      for (let i = 0; i < ITERS_PER_FRAME; i++) best = nelderMeadStep(loss, s)
      setTheta(best.x.map(wrapAngle))
      const done = s.iterations >= TRAIN_ITERS
      setTrain({ running: !done, iter: s.iterations, loss: best.f })
      if (!done) frameRef.current = requestAnimationFrame(tick)
      else frameRef.current = null
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [loss, stop])

  const resetTrained = useCallback(() => {
    stop()
    setTheta(TRAINED_THETA)
    setTrain({ running: false, iter: 0, loss: mseLoss(TRAINED_THETA, DATASET.train) })
  }, [stop])

  const loadSample = useCallback(() => {
    const s = DATASET.test[Math.floor(Math.random() * DATASET.test.length)]
    setX0(+s.x[0].toFixed(3))
    setX1(+s.x[1].toFixed(3))
  }, [])

  return (
    <Card className="glow-indigo bg-card">
      <CardHeader>
        <SectionLabel className="text-indigo/90">Widget 02 · IBM Qiskit algorithm simulator</SectionLabel>
        <CardTitle className="font-mono text-base">Variational Quantum Classifier — live statevector</CardTitle>
        <CardDescription className="text-pretty">
          An exact 2-qubit simulation of <span className="font-mono">solewatch_quantum_vqc.py</span>, running in your
          browser. Two normalized features (pressure and temperature asymmetry) are angle-encoded, a 6-parameter ansatz
          rotates the state, and <InlineMath tex="\langle Z_1 \rangle > 0" /> classifies the reading as statistically
          flagged.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/50 p-2">
          <CircuitDiagram />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-lg border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Input features</p>
                <Button variant="outline" size="xs" onClick={loadSample}>
                  <Dices data-icon="inline-start" /> Random test point
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="x0" className="text-sm">
                    Pressure asymmetry <InlineMath tex="x_0" />
                  </Label>
                  <span className="font-mono text-xs text-primary">{x0.toFixed(3)}</span>
                </div>
                <Slider id="x0" min={0} max={1} step={0.005} value={[x0]} onValueChange={(v) => setX0(sliderValue(v))} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="x1" className="text-sm">
                    Temperature asymmetry <InlineMath tex="x_1" />
                  </Label>
                  <span className="font-mono text-xs text-primary">{x1.toFixed(3)}</span>
                </div>
                <Slider id="x1" min={0} max={1} step={0.005} value={[x1]} onValueChange={(v) => setX1(sliderValue(v))} />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Measurement outcome</p>
                <Badge variant={prediction.flagged ? 'destructive' : 'success'} className="font-mono">
                  {prediction.flagged ? 'Statistically flagged' : 'Within baseline'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="rounded-md bg-background/60 p-2.5">
                  <p className="text-muted-foreground">⟨Z₁⟩ exact</p>
                  <p className="text-lg text-foreground">{prediction.z >= 0 ? '+' : ''}{prediction.z.toFixed(3)}</p>
                </div>
                <div className="rounded-md bg-background/60 p-2.5">
                  <p className="text-muted-foreground">⟨Z₁⟩ from {SHOTS} shots</p>
                  <p className="text-lg text-foreground">
                    {(() => {
                      const z = (2 * (counts[0] + counts[1])) / SHOTS - 1
                      return `${z >= 0 ? '+' : ''}${z.toFixed(3)}`
                    })()}
                  </p>
                </div>
              </div>
              <ProbabilityBars probs={prediction.probs} counts={counts} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Decision region &amp; dataset</p>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {DATASET.train.length} train / {DATASET.test.length} test
                </span>
              </div>
              <div className="flex justify-center">
                <DecisionMap theta={theta} point={point} />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-indigo/30 bg-indigo/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-indigo">
                  <Cpu className="size-3.5" aria-hidden="true" /> Hybrid training loop
                </p>
                <div className="flex gap-1.5">
                  {train.running ? (
                    <Button variant="outline" size="xs" onClick={stop}>
                      <Square data-icon="inline-start" /> Stop
                    </Button>
                  ) : (
                    <Button size="xs" onClick={startTraining} className="bg-indigo text-indigo-foreground hover:bg-indigo/85">
                      <Play data-icon="inline-start" /> Retrain from random θ
                    </Button>
                  )}
                  <Button variant="ghost" size="xs" onClick={resetTrained} aria-label="Reset to published parameters">
                    <RotateCcw data-icon="inline-start" /> Reset
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="rounded-md bg-background/60 p-2">
                  <p className="text-muted-foreground">MSE loss</p>
                  <p className="text-base text-foreground">{train.loss.toFixed(4)}</p>
                </div>
                <div className="rounded-md bg-background/60 p-2">
                  <p className="text-muted-foreground">VQC train / test</p>
                  <p className="text-base text-foreground">
                    {pct(acc.train)} <span className="text-foreground/40">/</span> {pct(acc.test)}
                  </p>
                </div>
                <div className="rounded-md bg-background/60 p-2">
                  <p className="text-muted-foreground">Linear train / test</p>
                  <p className="text-base text-foreground">
                    {pct(LINEAR_ACC.train)} <span className="text-foreground/40">/</span> {pct(LINEAR_ACC.test)}
                  </p>
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full bg-indigo transition-[width] duration-150"
                  style={{ width: `${Math.min(100, (train.iter / TRAIN_ITERS) * 100)}%` }}
                />
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">
                Nelder–Mead · iteration {train.iter}/{TRAIN_ITERS} · θ = [{theta.map((t) => t.toFixed(2)).join(', ')}]
              </p>

              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">The honest result:</span> on this small, nearly
                linearly-separable dataset a least-squares line matches or beats the 2-qubit VQC. That is the correct
                finding, not a bug — a 2-qubit circuit has no inherent advantage on a problem a straight line already
                solves. Quantum kernel advantages appear on data whose structure is expensive to represent classically,
                which this 2-feature problem deliberately is not.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
