export const SAMPLE_RATE_HZ = 100
export const ADC_MAX_COUNTS = 1023
export const SUPPLY_VOLTAGE = 3.3
export const FILTER_WINDOW = 10
export const Z_SCORE_FLAG_THRESHOLD = 3
export const DRIFT_Z_THRESHOLD = 2
export const CALIBRATION_SECONDS = 8
export const HISTORY_LENGTH = 120
export const SAMPLES_PER_TICK = 5
export const TICK_MS = (SAMPLES_PER_TICK / SAMPLE_RATE_HZ) * 1000

const EVENT_DURATION_S = 6
const AUTO_EVENT_PERIOD_S = 32
const NOISE_SIGMA_COUNTS = 14
const NOISE_SIGMA_TEMP_F = 0.12
const DRIFT_SATURATION_COUNTS = 30
const DRIFT_TIME_CONSTANT_S = 40
const NOISE_WINDOW = 100

export type ZoneId = 'heel' | 'met1' | 'met5' | 'hallux'
export type ZoneStatus = 'normal' | 'drift' | 'asymmetry'

export interface ZoneSpec {
  id: ZoneId
  label: string
  anatomical: string
  pin: string
  restCounts: number
  swayGain: number
}

export const ZONES: ZoneSpec[] = [
  { id: 'heel', label: 'Heel Zone', anatomical: 'Calcaneus', pin: 'GPIO32 · ADC1_CH4', restCounts: 640, swayGain: 1.0 },
  { id: 'met1', label: '1st Metatarsal', anatomical: 'Big toe base', pin: 'GPIO33 · ADC1_CH5', restCounts: 520, swayGain: 0.8 },
  { id: 'met5', label: '5th Metatarsal', anatomical: 'Little toe base', pin: 'GPIO34 · ADC1_CH6', restCounts: 360, swayGain: 0.7 },
  { id: 'hallux', label: 'Big Toe', anatomical: 'Hallux', pin: 'GPIO35 · ADC1_CH7', restCounts: 410, swayGain: 0.6 },
]

export function countsToVolts(counts: number) {
  return (counts * SUPPLY_VOLTAGE) / ADC_MAX_COUNTS
}

export function fahrenheitToCelsius(f: number) {
  return ((f - 32) * 5) / 9
}

export class MovingAverageFilter {
  private buf = new Array<number>(FILTER_WINDOW).fill(0)
  private index = 0
  private total = 0
  private count = 0

  update(sample: number) {
    this.total -= this.buf[this.index]
    this.buf[this.index] = sample
    this.total += sample
    this.index = (this.index + 1) % FILTER_WINDOW
    if (this.count < FILTER_WINDOW) this.count++
    return this.total / this.count
  }
}

export class RunningStats {
  private n = 0
  private m = 0
  private m2 = 0

  update(x: number) {
    this.n++
    const delta = x - this.m
    this.m += delta / this.n
    this.m2 += delta * (x - this.m)
  }

  get count() {
    return this.n
  }

  get mean() {
    return this.m
  }

  get stdev() {
    return this.n > 1 ? Math.sqrt(this.m2 / (this.n - 1)) : 0
  }
}

function gaussian() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function clampCounts(x: number) {
  return Math.min(ADC_MAX_COUNTS, Math.max(0, Math.round(x)))
}

function sampleStdev(values: number[]) {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const ss = values.reduce((a, b) => a + (b - mean) ** 2, 0)
  return Math.sqrt(ss / (values.length - 1))
}

interface Channel {
  filter: MovingAverageFilter
  rawBaseline: RunningStats
  filteredBaseline: RunningStats
  raw: number
  filtered: number
}

function createChannel(): Channel {
  return {
    filter: new MovingAverageFilter(),
    rawBaseline: new RunningStats(),
    filteredBaseline: new RunningStats(),
    raw: 0,
    filtered: 0,
  }
}

interface ZoneState {
  left: Channel
  right: Channel
  diffBaseline: RunningStats
  history: number[]
  rawHistory: number[]
}

export interface ZoneReading {
  id: ZoneId
  value: number
  raw: number
  filtered: number
  volts: number
  rightValue: number
  zScore: number
  bilateralZ: number
  status: ZoneStatus
  history: number[]
  rawHistory: number[]
}

export interface TemperatureReading {
  value: number
  raw: number
  filtered: number
  zScore: number
  status: ZoneStatus
  history: number[]
  rawHistory: number[]
}

export interface FootLoad {
  counts: number
  pct: number
}

export interface TelemetryFrame {
  elapsedS: number
  sampleCount: number
  calibrating: boolean
  calibrationProgress: number
  filterOn: boolean
  zones: ZoneReading[]
  temperature: TemperatureReading
  left: FootLoad
  right: FootLoad
  asymmetryZ: number
  asymmetryFlag: boolean
  eventActive: boolean
  noiseSigmaRaw: number
  noiseSigmaFiltered: number
}

export class TelemetrySimulator {
  private t = 0
  private sampleCount = 0
  private filterOn = true
  private calibrationStart = 0
  private eventStart = Number.NEGATIVE_INFINITY
  private nextAutoEvent = AUTO_EVENT_PERIOD_S
  private phases = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28]
  private zones: Record<ZoneId, ZoneState>
  private temp: Channel & { history: number[]; rawHistory: number[] }
  private totalDiffBaseline = new RunningStats()
  private heelRawWindow: number[] = []
  private heelFilteredWindow: number[] = []

  constructor() {
    this.zones = Object.fromEntries(
      ZONES.map((z): [ZoneId, ZoneState] => [
        z.id,
        { left: createChannel(), right: createChannel(), diffBaseline: new RunningStats(), history: [], rawHistory: [] },
      ]),
    ) as Record<ZoneId, ZoneState>
    this.temp = { ...createChannel(), history: [], rawHistory: [] }
  }

  get isCalibrating() {
    return this.t - this.calibrationStart < CALIBRATION_SECONDS
  }

  setFilter(on: boolean) {
    this.filterOn = on
  }

  injectEvent() {
    this.eventStart = this.t
  }

  recalibrate() {
    for (const z of ZONES) {
      const s = this.zones[z.id]
      s.left.rawBaseline = new RunningStats()
      s.left.filteredBaseline = new RunningStats()
      s.right.rawBaseline = new RunningStats()
      s.right.filteredBaseline = new RunningStats()
      s.diffBaseline = new RunningStats()
    }
    this.temp.rawBaseline = new RunningStats()
    this.temp.filteredBaseline = new RunningStats()
    this.totalDiffBaseline = new RunningStats()
    this.calibrationStart = this.t
  }

  step(samples: number) {
    for (let i = 0; i < samples; i++) this.sample()
    this.pushHistory()
  }

  private eventGain() {
    const e = this.t - this.eventStart
    if (e < 0 || e > EVENT_DURATION_S) return 0
    const ramp = Math.min(1, e / 0.8, (EVENT_DURATION_S - e) / 0.8)
    return 0.22 * ramp
  }

  private updateChannel(ch: Channel, raw: number, calibrating: boolean) {
    ch.raw = raw
    ch.filtered = ch.filter.update(raw)
    if (calibrating) {
      ch.rawBaseline.update(raw)
      ch.filteredBaseline.update(ch.filtered)
    }
  }

  private sample() {
    this.t += 1 / SAMPLE_RATE_HZ
    this.sampleCount++

    if (this.t >= this.nextAutoEvent) {
      this.injectEvent()
      this.nextAutoEvent += AUTO_EVENT_PERIOD_S
    }

    const calibrating = this.isCalibrating
    const shift = calibrating ? 0 : this.eventGain()
    const [p1, p2, p3] = this.phases
    const tau = 2 * Math.PI * this.t
    const swayAP = 0.035 * Math.sin(0.28 * tau + p1) + 0.02 * Math.sin(0.07 * tau + p2)
    const swayML = 0.03 * Math.sin(0.21 * tau + p3)
    const postCalS = calibrating ? 0 : this.t - (this.calibrationStart + CALIBRATION_SECONDS)
    const drift = DRIFT_SATURATION_COUNTS * (1 - Math.exp(-postCalS / DRIFT_TIME_CONSTANT_S))

    let leftTotal = 0
    let rightTotal = 0

    for (const spec of ZONES) {
      const state = this.zones[spec.id]
      const apGain = spec.id === 'heel' ? -1 : 1
      const base = spec.restCounts * (1 + spec.swayGain * apGain * swayAP)
      const zoneDrift = spec.id === 'met1' ? drift : 0

      const leftRaw = clampCounts(base * (1 + swayML) * (1 + shift) + zoneDrift + NOISE_SIGMA_COUNTS * gaussian())
      const rightRaw = clampCounts(base * (1 - swayML) * (1 - shift) * 0.97 + NOISE_SIGMA_COUNTS * gaussian())

      this.updateChannel(state.left, leftRaw, calibrating)
      this.updateChannel(state.right, rightRaw, calibrating)
      if (calibrating) state.diffBaseline.update(state.left.filtered - state.right.filtered)

      leftTotal += state.left.filtered
      rightTotal += state.right.filtered
    }

    if (calibrating) this.totalDiffBaseline.update(leftTotal - rightTotal)

    const tempRaw = 89.4 + 0.5 * Math.sin(0.02 * tau) + NOISE_SIGMA_TEMP_F * gaussian()
    this.updateChannel(this.temp, tempRaw, calibrating)

    const heel = this.zones.heel.left
    this.heelRawWindow.push(heel.raw)
    this.heelFilteredWindow.push(heel.filtered)
    if (this.heelRawWindow.length > NOISE_WINDOW) {
      this.heelRawWindow.shift()
      this.heelFilteredWindow.shift()
    }
  }

  private pushHistory() {
    for (const spec of ZONES) {
      const s = this.zones[spec.id]
      s.history.push(s.left.filtered)
      s.rawHistory.push(s.left.raw)
      if (s.history.length > HISTORY_LENGTH) {
        s.history.shift()
        s.rawHistory.shift()
      }
    }
    this.temp.history.push(this.temp.filtered)
    this.temp.rawHistory.push(this.temp.raw)
    if (this.temp.history.length > HISTORY_LENGTH) {
      this.temp.history.shift()
      this.temp.rawHistory.shift()
    }
  }

  private zScore(ch: Channel) {
    const stats = this.filterOn ? ch.filteredBaseline : ch.rawBaseline
    const value = this.filterOn ? ch.filtered : ch.raw
    return stats.stdev > 1e-6 ? (value - stats.mean) / stats.stdev : 0
  }

  private bilateralZ(state: ZoneState) {
    const diff = state.left.filtered - state.right.filtered
    const sd = state.diffBaseline.stdev
    return sd > 1e-6 ? Math.abs(diff - state.diffBaseline.mean) / sd : 0
  }

  snapshot(): TelemetryFrame {
    const calibrating = this.isCalibrating
    const calibrationProgress = Math.min(1, (this.t - this.calibrationStart) / CALIBRATION_SECONDS)

    let leftTotal = 0
    let rightTotal = 0

    const zones: ZoneReading[] = ZONES.map((spec) => {
      const s = this.zones[spec.id]
      const value = this.filterOn ? s.left.filtered : s.left.raw
      const rightValue = this.filterOn ? s.right.filtered : s.right.raw
      const z = calibrating ? 0 : this.zScore(s.left)
      const bz = calibrating ? 0 : this.bilateralZ(s)
      leftTotal += s.left.filtered
      rightTotal += s.right.filtered

      const status: ZoneStatus =
        bz > Z_SCORE_FLAG_THRESHOLD ? 'asymmetry' : Math.abs(z) >= DRIFT_Z_THRESHOLD ? 'drift' : 'normal'

      return {
        id: spec.id,
        value,
        raw: s.left.raw,
        filtered: s.left.filtered,
        volts: countsToVolts(value),
        rightValue,
        zScore: z,
        bilateralZ: bz,
        status,
        history: [...s.history],
        rawHistory: [...s.rawHistory],
      }
    })

    const tempZ = calibrating ? 0 : this.zScore(this.temp)
    const temperature: TemperatureReading = {
      value: this.filterOn ? this.temp.filtered : this.temp.raw,
      raw: this.temp.raw,
      filtered: this.temp.filtered,
      zScore: tempZ,
      status: Math.abs(tempZ) >= DRIFT_Z_THRESHOLD ? 'drift' : 'normal',
      history: [...this.temp.history],
      rawHistory: [...this.temp.rawHistory],
    }

    const total = leftTotal + rightTotal
    const diff = leftTotal - rightTotal
    const diffSd = this.totalDiffBaseline.stdev
    const asymmetryZ = calibrating || diffSd < 1e-6 ? 0 : Math.abs(diff - this.totalDiffBaseline.mean) / diffSd

    return {
      elapsedS: this.t,
      sampleCount: this.sampleCount,
      calibrating,
      calibrationProgress,
      filterOn: this.filterOn,
      zones,
      temperature,
      left: { counts: leftTotal, pct: total > 0 ? (leftTotal / total) * 100 : 50 },
      right: { counts: rightTotal, pct: total > 0 ? (rightTotal / total) * 100 : 50 },
      asymmetryZ,
      asymmetryFlag: asymmetryZ > Z_SCORE_FLAG_THRESHOLD,
      eventActive: this.eventGain() > 0,
      noiseSigmaRaw: sampleStdev(this.heelRawWindow),
      noiseSigmaFiltered: sampleStdev(this.heelFilteredWindow),
    }
  }
}
