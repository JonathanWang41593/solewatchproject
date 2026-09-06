export type Block =
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'math'; tex: string; caption?: string }
  | { type: 'code'; code: string; language: string; title?: string }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'callout'; tone: 'primary' | 'indigo' | 'warning'; title: string; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }

export interface DocSection {
  id: string
  tab: string
  title: string
  subtitle: string
  weight: string
  blocks: Block[]
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: 'ee',
    tab: 'A · Electrical & Calculus',
    title: 'Electrical Engineering & Calculus',
    subtitle: 'Voltage-divider sensitivity optimization, discrete FIR filtering, and first-order thermal drift correction',
    weight: '60% Electrical Engineering',
    blocks: [
      { type: 'h3', text: '4.1 Voltage-divider sensitivity optimization' },
      {
        type: 'p',
        text: 'Each FSR site is wired as a divider: the FSR sits between the 3.3 V rail and the measurement node; a fixed resistor R_fixed sits between the node and ground. The ADC reads the node voltage. Because an FSR\u2019s resistance falls with force, V_out rises with pressure — which is why the FSR goes on top.',
      },
      { type: 'math', tex: 'V_{out} = V_{CC}\\cdot\\frac{R_{fixed}}{R_{FSR}+R_{fixed}}' },
      { type: 'p', text: 'Step 1 — sensitivity to a change in R_FSR, treating R_fixed and V_CC as constants:' },
      {
        type: 'math',
        tex: '\\frac{dV_{out}}{dR_{FSR}} = -\\frac{V_{CC}\\,R_{fixed}}{(R_{FSR}+R_{fixed})^{2}} \\quad\\Rightarrow\\quad S(R_{fixed}) = \\left|\\frac{dV_{out}}{dR_{FSR}}\\right| = \\frac{V_{CC}\\,R_{fixed}}{(R_{FSR}+R_{fixed})^{2}}',
      },
      {
        type: 'p',
        text: 'Step 2 — which R_fixed maximizes sensitivity at the boundary pressure where the FSR reads R_b? Differentiate S with respect to the resistor you get to choose, using the quotient rule:',
      },
      {
        type: 'math',
        tex: '\\frac{dS}{dR_{fixed}} = V_{CC}\\cdot\\frac{(R_b+R_{fixed})^{2} - 2R_{fixed}(R_b+R_{fixed})}{(R_b+R_{fixed})^{4}} = V_{CC}\\cdot\\frac{R_b - R_{fixed}}{(R_b+R_{fixed})^{3}}',
      },
      {
        type: 'math',
        tex: '\\frac{dS}{dR_{fixed}} = 0 \\;\\Longrightarrow\\; \\boxed{R_{fixed} = R_b = R_{FSR}\\big|_{\\text{boundary}}} \\qquad S_{max} = \\frac{V_{CC}\\,R_b}{(2R_b)^2} = \\frac{V_{CC}}{4R_b}',
        caption: 'First-derivative sign test: S rises for R_fixed < R_b and falls for R_fixed > R_b, so this is a genuine maximum.',
      },
      {
        type: 'callout',
        tone: 'primary',
        title: 'Numerically verified',
        text: 'Sweeping R_fixed from 100 Ω to 50 kΩ against R_FSR = 10 kΩ, the numerical maximum lands at 9,999.96 Ω (limited by step size) and matches V_CC/(4R_FSR) to 8 decimal places. Same shape as the maximum-power-transfer theorem — both optimize a product of one growing and one squared-shrinking term.',
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'The interview question worth pre-empting',
        text: 'Why not always set R_fixed = R_FSR at your point of interest? Because R_FSR moves continuously with pressure: a divider tuned to R_b is less sensitive elsewhere, and usable ADC range, quantization step, and noise floor all matter. Part 8 Phase 3 resolves this empirically with 1 kΩ–47 kΩ candidates, not by the single-point optimum alone.',
      },

      { type: 'h3', text: '4.3 Discrete-time moving-average (FIR low-pass) filter' },
      {
        type: 'p',
        text: 'Footsteps and vibration inject real mechanical noise. An N-sample moving average is a genuine finite-impulse-response low-pass filter with a derivable frequency response, not just “smoothing”.',
      },
      {
        type: 'math',
        tex: 'y[n] = \\frac{1}{N}\\sum_{k=0}^{N-1} x[n-k], \\qquad h[k] = \\tfrac{1}{N}\\ \\text{for}\\ k = 0,\\dots,N-1',
      },
      {
        type: 'math',
        tex: 'H(e^{j\\omega}) = \\frac{1}{N}\\cdot\\frac{1-e^{-j\\omega N}}{1-e^{-j\\omega}} \\quad\\Rightarrow\\quad |H(e^{j\\omega})| = \\frac{1}{N}\\left|\\frac{\\sin(\\omega N/2)}{\\sin(\\omega/2)}\\right|',
      },
      {
        type: 'math',
        tex: 'f_{null} = \\frac{f_s}{N}, \\qquad \\text{group delay} = \\frac{N-1}{2}\\ \\text{samples}',
        caption: 'N = 10 at f_s = 100 Hz nulls 10 Hz exactly and lags 4.5 samples = 45 ms. Larger N rejects more noise but smears heel-strike transients.',
      },
      {
        type: 'code',
        language: 'cpp',
        title: 'Firmware excerpt — the same filter, as shipped in SoleWatch_Firmware.ino',
        code: `// Ring-buffer moving average: O(1) per sample, identical to y[n] = (1/N) Σ x[n-k]
float MovingAverage::push(float x) {
  sum -= buf[idx];
  buf[idx] = x;
  sum += x;
  idx = (idx + 1) % FILTER_WINDOW;
  if (count < FILTER_WINDOW) count++;
  return sum / count;
}`,
      },

      { type: 'h3', text: '4.2 Cross-sensitivity (thermal drift) linear correction' },
      {
        type: 'p',
        text: 'FSR resistance also drifts with temperature at fixed load — and here the sensor sits against skin, which is the other quantity being monitored. Taking a first-order Taylor expansion of the divider output P(F₀, T) around the calibration temperature T_ref:',
      },
      {
        type: 'math',
        tex: 'P(F_0,T) \\approx P(F_0,T_{ref}) + \\left.\\frac{\\partial P}{\\partial T}\\right|_{F_0,T_{ref}}(T-T_{ref}) \\quad\\Rightarrow\\quad \\boxed{P_{comp} = P_{raw}(T) - \\beta\\,(T - T_{ref})}',
      },
      {
        type: 'math',
        tex: '\\beta = \\frac{\\sum_i (T_i-\\bar T)(P_i-\\bar P)}{\\sum_i (T_i-\\bar T)^2}',
        caption: 'β is the least-squares slope of P against T at fixed load (Part 8, Phase 6). Report the temperature range it was fitted over; a residual trend after correction is a legitimate finding that the linear model is insufficient.',
      },
    ],
  },
  {
    id: 'quantum',
    tab: 'B · Quantum Theory',
    title: 'Quantum Engineering Theory',
    subtitle: 'SNSPD cryogenic limits vs. macro classical sensing, and the IBM Qiskit circuit design',
    weight: '40% Quantum Engineering',
    blocks: [
      { type: 'h3', text: '6.1 Why a single-photon detector must be cold and a force sensor must not be' },
      {
        type: 'p',
        text: 'A Superconducting Nanowire Single-Photon Detector is a current-biased nanowire (NbN or WSi, tens of nanometres wide) cooled below its critical temperature and biased just under its critical current. Current flows as Cooper pairs — electrons bound by a phonon-mediated attraction — with zero resistance. One absorbed near-IR photon (~1 eV) breaks a pair; the hot electrons cascade into a resistive hotspot that diverts the bias current into a readout line as a discrete, picosecond-jitter voltage pulse.',
      },
      {
        type: 'math',
        tex: 'E_{photon} = \\frac{hc}{\\lambda} \\approx 0.8\\ \\text{eV at } 1550\\ \\text{nm}, \\qquad k_B T\\big|_{293\\text{K}} \\approx 25\\ \\text{meV}, \\qquad 2\\Delta_{NbN} \\approx 5\\ \\text{meV}',
        caption: 'The superconducting gap 2Δ is tens of times smaller than room-temperature thermal energy — the condensate simply does not exist at 293 K. Cryogenic operation is not a refinement, it is the precondition.',
      },
      {
        type: 'p',
        text: 'A force-sensitive resistor lives in the opposite regime: applied force compresses a conductive polymer composite, changing contact area and the number of conductive pathways — a bulk, classical effect whose signal energy dwarfs thermal noise by many orders of magnitude. Cooling an FSR would only shift its calibration curve.',
      },
      {
        type: 'table',
        head: ['Property', 'FSR (this project)', 'SNSPD'],
        rows: [
          ['Input quantity', 'Macroscopic mechanical load', 'Individual near-IR photons'],
          ['Mechanism', 'Contact-area change in polymer composite', 'Cooper-pair breaking → resistive hotspot'],
          ['Regime', 'Classical, bulk', 'Quantum, superconducting many-body state'],
          ['Operating temperature', 'Room temperature', 'Cryogenic, typically < 4 K'],
          ['Signal energy', '10⁻³–10⁰ J', '~1 eV ≈ 10⁻¹⁹ J'],
          ['Output', 'Continuous analog voltage', 'Discrete pulse per photon'],
          ['Limitations', 'Hysteresis, creep, thermal cross-sensitivity', 'Dark counts, jitter, dead time, cryostat'],
        ],
      },
      {
        type: 'callout',
        tone: 'indigo',
        title: 'The comparative lesson',
        text: 'SNSPDs are not simply “more advanced”. Sensor architecture has to match a signal\u2019s actual physical scale — and recognising that match is itself the engineering skill worth demonstrating.',
      },

      { type: 'h3', text: '6.2 IBM Qiskit — variational quantum classifier design' },
      {
        type: 'p',
        text: 'The VQC is a hybrid quantum-classical algorithm: a parameterized circuit prepares a state that depends on both the data x and trainable angles θ; a classical optimizer adjusts θ to minimise a loss on the measured expectation value. Two features (normalised pressure and temperature asymmetry) are angle-encoded twice with a CNOT between — “data re-uploading” — which lets a 2-qubit circuit express non-linear boundaries.',
      },
      {
        type: 'math',
        tex: '|\\psi(x,\\theta)\\rangle = U_{var}(\\theta)\\,U_{enc}(x)\\,|00\\rangle, \\qquad U_{enc}(x) = \\big[R_y(\\pi x_0)\\otimes R_y(\\pi x_1)\\big]\\,\\mathrm{CX}_{0\\to1}\\,\\big[R_y(\\pi x_0)\\otimes R_y(\\pi x_1)\\big]',
      },
      {
        type: 'math',
        tex: 'U_{var}(\\theta) = \\big[R_y(\\theta_4)\\otimes R_y(\\theta_5)\\big]\\,\\mathrm{CX}_{0\\to1}\\,\\big[R_z(\\theta_2)\\otimes R_z(\\theta_3)\\big]\\big[R_y(\\theta_0)\\otimes R_y(\\theta_1)\\big]',
      },
      {
        type: 'math',
        tex: 'R_y(\\phi)=\\begin{pmatrix}\\cos\\frac{\\phi}{2} & -\\sin\\frac{\\phi}{2}\\\\ \\sin\\frac{\\phi}{2} & \\cos\\frac{\\phi}{2}\\end{pmatrix},\\quad R_z(\\phi)=\\begin{pmatrix}e^{-i\\phi/2} & 0\\\\ 0 & e^{i\\phi/2}\\end{pmatrix},\\quad \\mathcal{L}(\\theta)=\\frac{1}{M}\\sum_{m}\\big(\\langle Z_1\\rangle_{x_m,\\theta} - (2y_m-1)\\big)^2',
        caption: 'Labels {0,1} are mapped to {−1,+1} to match the range of ⟨Z⟩. Prediction: flagged if ⟨Z₁⟩ > 0. Observable “ZI” in Qiskit acts on qubit 1 — the leftmost Pauli is the highest-index qubit.',
      },
      {
        type: 'code',
        language: 'python',
        title: 'solewatch_quantum_vqc.py — circuit construction (verbatim)',
        code: `def build_circuit() -> QuantumCircuit:
    qc = QuantumCircuit(N_QUBITS, name="solewatch_vqc")
    for i in range(N_QUBITS):
        qc.ry(np.pi * x_params[i], i)      # angle encoding
    qc.cx(0, 1)
    for i in range(N_QUBITS):
        qc.ry(np.pi * x_params[i], i)      # data re-uploading
    qc.barrier()
    qc.ry(theta_params[0], 0); qc.ry(theta_params[1], 1)
    qc.rz(theta_params[2], 0); qc.rz(theta_params[3], 1)
    qc.cx(0, 1)
    qc.ry(theta_params[4], 0); qc.ry(theta_params[5], 1)
    return qc

observable = SparsePauliOp.from_list([("ZI", 1.0)])
estimator  = StatevectorEstimator()      # exact, noise-free for training
opt_result = minimize(loss_fn, theta0, method="COBYLA", options={"maxiter": 300})`,
      },
      {
        type: 'table',
        head: ['Model', 'Parameters', 'Train accuracy', 'Test accuracy'],
        rows: [
          ['VQC (2 qubits, data re-uploading)', '6 angles', '94.3%', '93.3%'],
          ['Classical least-squares line', '3 weights', '100%', '100%'],
        ],
      },
      {
        type: 'callout',
        tone: 'indigo',
        title: 'The honest, reportable result',
        text: 'On a small, nearly linearly-separable synthetic dataset the classical line wins. A 2-qubit variational circuit has no inherent advantage on a problem a straight line already solves. Quantum kernel / VQC advantages, where they exist, appear on data with structure that is expensive to represent classically. Reporting that — and explaining why — is the actual quantum engineering content, and a far stronger admissions story than a fabricated “quantum wins”.',
      },
      {
        type: 'list',
        items: [
          'Trained on Qiskit\u2019s StatevectorEstimator (exact); confirmed with AerSampler at 2048 shots to show shot-noise behaviour of real hardware.',
          'Portable to IBM Quantum hardware with only a free API token — the circuit is 12 gates deep and fits any current backend.',
          'Not a validated detector, not trained on patient data, not a clinical signal — the same framing as the 2.2 °C literature threshold.',
        ],
      },
    ],
  },
  {
    id: 'build',
    tab: 'C · Build & Assembly',
    title: 'Complete Build & Assembly Sequence',
    subtitle: 'Phase A research breadboard: $65–110 per board, step-by-step pinouts, scale-weight calibration, non-destructive teardown',
    weight: 'Budget $100–450',
    blocks: [
      { type: 'h3', text: 'Bill of materials — Phase A (single board)' },
      {
        type: 'table',
        head: ['Item', 'Qty', 'Approx. price', 'Notes'],
        rows: [
          ['ESP32 Dev Module (CP2102/CH340)', '1 (2 bilateral)', '$10–14', 'Needs ADC1-capable pins; 4 used'],
          ['Interlink FSR 402, 0.5″ round', '4', '$7–11 each', 'DigiKey / SparkFun'],
          ['MLX90614 IR temperature breakout, 3.3 V', '1', '$15–20', 'Adafruit #1748 — 3.3 V version only'],
          ['10 kΩ resistor, 1%', '4', '~$0.10', 'Divider pull-down — see Part 4.1'],
          ['Solderless breadboard + jumper kit', '1', '$10–20', ''],
          ['3× 5 mm LEDs + 220 Ω pack', '1 set', '$5–8', 'Status indicator'],
          ['Passive piezo buzzer', '1', '$2–5', ''],
          ['EVA foam insole blank + fabric tape', '1', '$12–23', 'Non-permanent mounting'],
        ],
      },
      {
        type: 'callout',
        tone: 'primary',
        title: 'Totals',
        text: 'Single board ~$65–110. Two boards for bilateral comparison ~$120–200 — inside the $75–450 budget with headroom for an ADS1115 16-bit ADC upgrade (~$10–15) or a proper enclosure.',
      },
      { type: 'h3', text: 'Wiring & pinout (Phase A)' },
      {
        type: 'table',
        head: ['Signal', 'ESP32 pin', 'Notes'],
        rows: [
          ['FSR 1 — Heel', 'GPIO32', 'ADC1, safe alongside Wi-Fi / ESP-NOW'],
          ['FSR 2 — 1st Metatarsal', 'GPIO33', 'ADC1'],
          ['FSR 3 — 5th Metatarsal', 'GPIO34', 'ADC1, input-only'],
          ['FSR 4 — Hallux', 'GPIO35', 'ADC1, input-only'],
          ['MLX90614 SDA / SCL', 'GPIO21 / GPIO22', 'Default I²C'],
          ['LED green / yellow / red', 'GPIO16 / 17 / 18', 'Each via 220 Ω'],
          ['Piezo buzzer', 'GPIO27', 'Driven by tone()'],
        ],
      },
      {
        type: 'p',
        text: 'Each FSR: one leg to the 3.3 V rail (never 5 V on these ADC pins), the other leg to both its ADC pin and one leg of its 10 kΩ pull-down, whose other leg goes to GND — the exact divider analysed in Part 4.1.',
      },
      {
        type: 'code',
        language: 'text',
        title: 'Serial CSV logging format (115200 baud)',
        code: `t_ms,site,raw_adc,v_out,temp_c,p_comp,z_score,flag
30250,heel,1843,1.485,31.2,1.481,0.42,0
30250,met1,2210,1.781,31.2,1.777,-0.15,0`,
      },
      { type: 'h3', text: 'Calibration protocol with scale weights' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Phase 2 — single channel: log raw ADC, voltage and temperature every 100–250 ms; press by hand to confirm readings rise under load.',
          'Place a flat rigid disk over the active area before applying known masses so force, not contact area, dominates.',
          'Load at 0, 0.5, 1, 2, 3, 5 kg-equivalent within the FSR 402 rating; repeat each point ≥ 3×; record loading and unloading paths to quantify hysteresis.',
          'Phase 3 — resistor optimisation: repeat with 1 kΩ, 4.7 kΩ, 10 kΩ, 22 kΩ, 47 kΩ; plot V vs. load; choose R_FIXED_OHMS from slope, ADC range, noise and repeatability — not the calculus optimum alone.',
          'Phase 4 — 4-channel array: press one site at a time and confirm only that serial column moves; then mount on the insole and re-confirm.',
          'Flash the firmware; let the 30-second boot calibration window run under representative resting load (Welford running mean / SD per site).',
          'Phase 5 — filter window: compare N ∈ {5, 10, 20, 40} against your own footstep data; report noise SD and response delay for each.',
          'Phase 6 — thermal drift: fixed load, several stable safe temperatures, least-squares fit of P against T → betaCoeff[]; check it reduces held-out residual error.',
        ],
      },
      { type: 'h3', text: 'Mounting & non-destructive teardown' },
      {
        type: 'list',
        items: [
          'Place each FSR on top of, or in a shallow cutout in, the EVA blank; keep the sensing disc flat — creases permanently alter behaviour.',
          'Removable fabric tape around the tail and perimeter only; never a hard adhesive bump over the active area.',
          'Route wires along the insole edge, exiting near the tongue or heel collar.',
          'ESP32, breadboard and any battery stay outside the shoe for all early testing; no exposed conductor bears weight or touches skin.',
          'Teardown reverses the sequence: peel tape, lift sensors by the tail, pull jumpers before resistors — every part is reusable for Phase B.',
        ],
      },
    ],
  },
  {
    id: 'admissions',
    tab: 'D · Admissions Defense',
    title: 'Admissions & Research Defense',
    subtitle: 'Oxbridge technical-interview defence notes vs. the US holistic / social-impact narrative',
    weight: 'Oxford · Cambridge · Stanford · Duke · UMich · Georgia Tech · Illinois',
    blocks: [
      { type: 'h3', text: 'Where each programme\u2019s strengths sit' },
      {
        type: 'table',
        head: ['School', 'Named quantum pathway', 'How to frame SoleWatch'],
        rows: [
          ['Georgia Tech', 'Minor in Quantum Sciences & Technology (verifiable)', 'Name the minor directly for the 40% quantum module'],
          ['Stanford', 'Quantum research across physics & engineering centres', 'Systems thinking + honest negative result'],
          ['Duke', 'Duke Quantum Center', 'Comparative sensing analysis, hardware-portable Qiskit'],
          ['Michigan', 'Quantum research institutes; occasional EE portfolio supplement', 'Evidence-based design choices, logged data'],
          ['Illinois (UIUC)', 'IQUIST — Illinois Quantum Information Science & Technology Center', 'Superconducting-detector physics link; ECE depth'],
          ['Oxford / Cambridge', 'Apply to Engineering Science / Engineering; specialise later', 'Evidence of thinking under live questioning'],
        ],
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'Verify before submitting',
        text: 'Undergraduate quantum-labelled offerings shift year to year. Confirm each programme\u2019s current page, and note that as of the 2026 cycle both Oxford Engineering Science and Cambridge Engineering require the ESAT.',
      },

      { type: 'h3', text: 'Oxbridge: evidence of thinking, not an achievement' },
      {
        type: 'p',
        text: 'The UCAS statement is three structured answers, 4,000 characters combined, with ~80% expected to be super-curricular. Write “I read X, tried Y, it did not work the way I expected, which is when I realised Z” — not “I built X and it works”. SoleWatch should be one well-developed example, not the whole statement.',
      },
      {
        type: 'list',
        items: [
          'Derive dV_out/dR_FSR live and state why R_fixed = R_FSR maximises sensitivity — then explain why that is not automatically the right choice (dynamic range, quantisation, noise).',
          'Explain why bilateral asymmetry beats a fixed 2.2 °C threshold: it cancels common-mode ambient drift and per-person baseline offsets.',
          'Explain why an SNSPD\u2019s cryogenic requirement rules it out here: compare photon energy, the superconducting gap, and k_B T at 293 K.',
          'Explain why the classical line beat the VQC — and what data structure would be needed for a quantum kernel to matter.',
          'Explain f_null = f_s/N and the group-delay trade-off; be ready to sketch |H(e^{jω})| for N = 10.',
          'Rehearse aloud with someone who pushes back. The rehearsal matters more than any additional feature.',
        ],
      },

      { type: 'h3', text: 'US holistic review: the project itself carries weight' },
      {
        type: 'list',
        items: [
          'Anchor an activities-list entry, an additional-information essay, and a mentor recommendation letter — three separate places in the application.',
          'External validation: ISEF or a regional affiliate; Journal of Emerging Investigators (free, peer-reviewed, for high-schoolers under a mentor); Yale Undergraduate Research Journal Emerging Investigators Initiative.',
          'Georgia Tech and Michigan sometimes offer engineering portfolio / research supplements — confirm fresh each cycle.',
          'Social-impact narrative: the instrument was built for a family member with diabetes; the non-profit roadmap follows the legitimate volunteer-pilot path, not distribution.',
        ],
      },

      { type: 'h3', text: 'Making the evidence real' },
      {
        type: 'list',
        items: [
          'A logged dataset from your own testing (Part 8 CSV), not assumed numbers.',
          'A real calibration curve — known weights vs. reading, loading and unloading — with hysteresis quantified.',
          'Flag thresholds computed statistically from that data (Welford\u2019s algorithm baseline), not guessed.',
          'Honest comparison against the published literature, cited properly.',
          'Consistent framing as a proof-of-concept research instrument — never a certified medical device.',
        ],
      },
      {
        type: 'callout',
        tone: 'indigo',
        title: 'The volunteer-pilot path (Part 9.5)',
        text: 'Adult Sponsor → formal Research Plan → school / regional Scientific Review Committee approval → plain-language informed consent stating “experimental prototype, not a medical device; your care continues unchanged” → then, and only then, one consenting volunteer. Document their feedback as genuine data. Never distribute to people who might rely on it for care.',
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'Vocabulary rules — everywhere',
        text: 'Say “statistically flagged”, “within baseline variation”, “research instrument”, “proof of concept”. Never say “detects ulcers”, “diagnoses”, “medical device”, or “prevents amputation”.',
      },
    ],
  },
]

// ---------- Markdown export ----------

function blockToMarkdown(b: Block): string {
  switch (b.type) {
    case 'h3':
      return `### ${b.text}\n`
    case 'p':
      return `${b.text}\n`
    case 'math':
      return `$$\n${b.tex}\n$$\n${b.caption ? `\n_${b.caption}_\n` : ''}`
    case 'code':
      return `${b.title ? `**${b.title}**\n\n` : ''}\`\`\`${b.language}\n${b.code}\n\`\`\`\n`
    case 'table': {
      const head = `| ${b.head.join(' | ')} |`
      const sep = `|${b.head.map(() => '---').join('|')}|`
      const rows = b.rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
      return `${head}\n${sep}\n${rows}\n`
    }
    case 'callout':
      return `> **${b.title}** — ${b.text}\n`
    case 'list':
      return `${b.items.map((it, i) => (b.ordered ? `${i + 1}. ${it}` : `- ${it}`)).join('\n')}\n`
  }
}

export function sectionsToMarkdown(sections: DocSection[] = DOC_SECTIONS): string {
  const header = [
    '# SoleWatch — Quantum Analytics & Master Documentation',
    '',
    '_Electrical & Quantum Sensing Platform · Independent research guide · Proof-of-concept research instrument, not a medical device._',
    '',
    `Exported ${new Date().toISOString().slice(0, 10)} from the SoleWatch dashboard.`,
    '',
  ].join('\n')
  const body = sections
    .map((s) => `## ${s.title}\n\n_${s.subtitle}_ · **${s.weight}**\n\n${s.blocks.map(blockToMarkdown).join('\n')}`)
    .join('\n---\n\n')
  return `${header}\n${body}`
}
