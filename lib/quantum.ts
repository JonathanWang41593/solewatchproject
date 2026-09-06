/**
 * Exact 2-qubit statevector simulation of the SoleWatch VQC circuit from
 * `solewatch_quantum_vqc.py`, ported gate-for-gate so the browser can reproduce
 * the Qiskit result without a Python runtime.
 *
 * Conventions follow Qiskit: little-endian basis ordering (index = q0 + 2*q1,
 * bitstrings printed as "q1q0"), and the observable label "ZI" means Z acting
 * on qubit 1 (the leftmost Pauli is the highest-index qubit).
 */

export const N_QUBITS = 2
export const N_THETA = 6
export const N_PER_CLASS = 25
export const BASIS_LABELS = ['00', '01', '10', '11'] as const

export type Features = [number, number]
export interface Sample {
  x: Features
  y: 0 | 1
}

// ---------- complex helpers (amplitudes stored as [re, im] pairs) ----------

type Amp = [number, number]
type State = [Amp, Amp, Amp, Amp]

function zeroState(): State {
  return [
    [1, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ]
}

function cmul(a: Amp, b: Amp): Amp {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
}

function cadd(a: Amp, b: Amp): Amp {
  return [a[0] + b[0], a[1] + b[1]]
}

function cscale(a: Amp, s: number): Amp {
  return [a[0] * s, a[1] * s]
}

/** Apply a 2x2 single-qubit gate to `target` (0 or 1). */
function applySingle(state: State, target: 0 | 1, g: [Amp, Amp, Amp, Amp]): State {
  const out = zeroState()
  const [g00, g01, g10, g11] = g
  const stride = target === 0 ? 1 : 2
  for (let i = 0; i < 4; i++) {
    if ((i & stride) !== 0) continue
    const j = i | stride
    const a = state[i]
    const b = state[j]
    out[i] = cadd(cmul(g00, a), cmul(g01, b))
    out[j] = cadd(cmul(g10, a), cmul(g11, b))
  }
  return out
}

function ry(theta: number): [Amp, Amp, Amp, Amp] {
  const c = Math.cos(theta / 2)
  const s = Math.sin(theta / 2)
  return [[c, 0], [-s, 0], [s, 0], [c, 0]]
}

function rz(theta: number): [Amp, Amp, Amp, Amp] {
  const h = theta / 2
  return [
    [Math.cos(h), -Math.sin(h)],
    [0, 0],
    [0, 0],
    [Math.cos(h), Math.sin(h)],
  ]
}

/** CNOT with control qubit 0 and target qubit 1 (Qiskit `qc.cx(0, 1)`). */
function cx01(state: State): State {
  // control q0 = 1 means odd index; flipping q1 toggles bit 2 -> swap |01> and |11>
  return [state[0], state[3], state[2], state[1]]
}

// ---------- the circuit ----------

export interface GateStep {
  label: string
  qubit: 0 | 1 | 'cx'
  group: 'encode' | 'variational'
}

export const CIRCUIT_LAYOUT: GateStep[] = [
  { label: 'RY(πx₀)', qubit: 0, group: 'encode' },
  { label: 'RY(πx₁)', qubit: 1, group: 'encode' },
  { label: 'CX', qubit: 'cx', group: 'encode' },
  { label: 'RY(πx₀)', qubit: 0, group: 'encode' },
  { label: 'RY(πx₁)', qubit: 1, group: 'encode' },
  { label: 'RY(θ₀)', qubit: 0, group: 'variational' },
  { label: 'RY(θ₁)', qubit: 1, group: 'variational' },
  { label: 'RZ(θ₂)', qubit: 0, group: 'variational' },
  { label: 'RZ(θ₃)', qubit: 1, group: 'variational' },
  { label: 'CX', qubit: 'cx', group: 'variational' },
  { label: 'RY(θ₄)', qubit: 0, group: 'variational' },
  { label: 'RY(θ₅)', qubit: 1, group: 'variational' },
]

export function runCircuit(x: Features, theta: number[]): State {
  let s = zeroState()
  // data re-uploading encoder
  s = applySingle(s, 0, ry(Math.PI * x[0]))
  s = applySingle(s, 1, ry(Math.PI * x[1]))
  s = cx01(s)
  s = applySingle(s, 0, ry(Math.PI * x[0]))
  s = applySingle(s, 1, ry(Math.PI * x[1]))
  // variational ansatz
  s = applySingle(s, 0, ry(theta[0]))
  s = applySingle(s, 1, ry(theta[1]))
  s = applySingle(s, 0, rz(theta[2]))
  s = applySingle(s, 1, rz(theta[3]))
  s = cx01(s)
  s = applySingle(s, 0, ry(theta[4]))
  s = applySingle(s, 1, ry(theta[5]))
  return s
}

/** Born-rule probabilities over |q1 q0> = 00, 01, 10, 11 (index order). */
export function probabilities(state: State): [number, number, number, number] {
  return state.map(([re, im]) => re * re + im * im) as [number, number, number, number]
}

/** <Z ⊗ I> in Qiskit's label order, i.e. Z on qubit 1: +1 for q1=0, -1 for q1=1. */
export function expectationZ1(probs: [number, number, number, number]): number {
  return probs[0] + probs[1] - probs[2] - probs[3]
}

export interface Prediction {
  probs: [number, number, number, number]
  z: number
  flagged: boolean
  pFlagged: number
}

export function predict(x: Features, theta: number[]): Prediction {
  const probs = probabilities(runCircuit(x, theta))
  const z = expectationZ1(probs)
  return { probs, z, flagged: z > 0, pFlagged: (1 + z) / 2 }
}

// ---------- dataset ----------

/** Small, fast, seedable PRNG so the dataset is reproducible in the browser. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rand: () => number, mean: number, sd: number) {
  const u = Math.max(rand(), 1e-12)
  const v = rand()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const clip01 = (v: number) => Math.min(1, Math.max(0, v))

export function buildDataset(seed = 42): { train: Sample[]; test: Sample[]; all: Sample[] } {
  const rand = mulberry32(seed)
  const all: Sample[] = []
  for (let i = 0; i < N_PER_CLASS; i++) {
    all.push({ x: [clip01(gaussian(rand, 0.2, 0.14)), clip01(gaussian(rand, 0.25, 0.14))], y: 0 })
  }
  for (let i = 0; i < N_PER_CLASS; i++) {
    all.push({ x: [clip01(gaussian(rand, 0.65, 0.2)), clip01(gaussian(rand, 0.7, 0.2))], y: 1 })
  }
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  const split = Math.floor(0.7 * all.length)
  return { train: all.slice(0, split), test: all.slice(split), all }
}

// ---------- loss, accuracy, classical baseline ----------

export function mseLoss(theta: number[], data: Sample[]): number {
  let sum = 0
  for (const s of data) {
    const z = predict(s.x, theta).z
    const target = 2 * s.y - 1
    sum += (z - target) ** 2
  }
  return sum / data.length
}

export function accuracy(theta: number[], data: Sample[]): number {
  let hits = 0
  for (const s of data) if ((predict(s.x, theta).flagged ? 1 : 0) === s.y) hits++
  return hits / data.length
}

/** Least-squares fit of w·[x0, x1, 1] to targets in {-1, +1} via the 3x3 normal equations. */
export function fitLinear(data: Sample[]): [number, number, number] {
  const A = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  const b = [0, 0, 0]
  for (const s of data) {
    const row = [s.x[0], s.x[1], 1]
    const t = 2 * s.y - 1
    for (let i = 0; i < 3; i++) {
      b[i] += row[i] * t
      for (let j = 0; j < 3; j++) A[i][j] += row[i] * row[j]
    }
  }
  // Gaussian elimination
  const M = A.map((r, i) => [...r, b[i]])
  for (let c = 0; c < 3; c++) {
    let p = c
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < 3; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]]
}

export function linearScore(w: [number, number, number], x: Features) {
  return w[0] * x[0] + w[1] * x[1] + w[2]
}

export function linearAccuracy(w: [number, number, number], data: Sample[]) {
  let hits = 0
  for (const s of data) if ((linearScore(w, s.x) > 0 ? 1 : 0) === s.y) hits++
  return hits / data.length
}

// ---------- Nelder-Mead (derivative-free, stands in for SciPy's COBYLA) ----------

export interface Simplex {
  points: number[][]
  values: number[]
  iterations: number
}

export function createSimplex(f: (t: number[]) => number, x0: number[], step = 0.8): Simplex {
  const points = [x0.slice()]
  for (let i = 0; i < x0.length; i++) {
    const p = x0.slice()
    p[i] += step
    points.push(p)
  }
  return { points, values: points.map(f), iterations: 0 }
}

/** One Nelder-Mead iteration, mutating the simplex. Returns the current best. */
export function nelderMeadStep(f: (t: number[]) => number, s: Simplex): { x: number[]; f: number } {
  const n = s.points[0].length
  const order = s.values.map((v, i) => i).sort((a, b) => s.values[a] - s.values[b])
  s.points = order.map((i) => s.points[i])
  s.values = order.map((i) => s.values[i])

  const centroid = new Array(n).fill(0)
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += s.points[i][j] / n
  const worst = s.points[n]
  const fWorst = s.values[n]
  const lerp = (a: number[], b: number[], t: number) => a.map((v, i) => v + t * (b[i] - v))

  const reflected = lerp(centroid, worst, -1)
  const fR = f(reflected)
  if (fR < s.values[0]) {
    const expanded = lerp(centroid, worst, -2)
    const fE = f(expanded)
    if (fE < fR) {
      s.points[n] = expanded
      s.values[n] = fE
    } else {
      s.points[n] = reflected
      s.values[n] = fR
    }
  } else if (fR < s.values[n - 1]) {
    s.points[n] = reflected
    s.values[n] = fR
  } else {
    const contracted = lerp(centroid, worst, fR < fWorst ? -0.5 : 0.5)
    const fC = f(contracted)
    if (fC < Math.min(fR, fWorst)) {
      s.points[n] = contracted
      s.values[n] = fC
    } else {
      for (let i = 1; i <= n; i++) {
        s.points[i] = lerp(s.points[0], s.points[i], 0.5)
        s.values[i] = f(s.points[i])
      }
    }
  }
  s.iterations++
  const best = s.values.indexOf(Math.min(...s.values))
  return { x: s.points[best], f: s.values[best] }
}

export function nelderMead(f: (t: number[]) => number, x0: number[], maxIter = 2000) {
  const s = createSimplex(f, x0)
  let best = { x: x0, f: f(x0) }
  for (let i = 0; i < maxIter; i++) best = nelderMeadStep(f, s)
  return best
}

export const wrapAngle = (v: number) => ((v % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

/** Shot-based sampling of the exact distribution (what AerSampler does on hardware-like runs). */
export function sampleShots(probs: [number, number, number, number], shots: number, seed = 7) {
  const rand = mulberry32(seed)
  const counts = [0, 0, 0, 0]
  for (let i = 0; i < shots; i++) {
    const r = rand()
    let acc = 0
    for (let k = 0; k < 4; k++) {
      acc += probs[k]
      if (r < acc) {
        counts[k]++
        break
      }
      if (k === 3) counts[3]++
    }
  }
  return counts as [number, number, number, number]
}

/**
 * Parameters found by running the trainer offline against `buildDataset(42)`
 * (16 random restarts × 2500 Nelder-Mead iterations). Reproduces the paper's
 * headline: VQC ≈ 93% test accuracy vs. 100% for the classical linear baseline.
 */
export const TRAINED_THETA: number[] = [1.219, 3.8458, 5.17, 6.2829, 0.0271, 5.3769]
