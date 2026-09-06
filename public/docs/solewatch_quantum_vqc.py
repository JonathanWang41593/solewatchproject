"""
================================================================================
 SoleWatch -- Quantum Engineering Module
 Variational Quantum Classifier (VQC) for Plantar Sensor Anomaly Patterns
================================================================================

WHAT THIS SCRIPT IS
--------------------
A complete, runnable IBM Qiskit program that builds a small parameterized
quantum circuit (a "variational" or "hybrid quantum-classical" circuit),
trains it with a classical optimizer to separate two classes of plantar
sensor readings -- "within normal baseline variation" vs. "statistically
flagged" -- and compares its accuracy against a simple classical linear
model on the same synthetic data.

WHAT THIS SCRIPT IS NOT
------------------------
This is an educational / comparative exercise in quantum machine learning,
run on synthetic data shaped like SoleWatch's two engineering features
(normalized pressure asymmetry, normalized temperature asymmetry). It is
NOT a validated anomaly detector, it has NOT been trained on real patient
data, and its output is not a clinical or diagnostic signal. Treat it the
same way the rest of the SoleWatch project treats the 2.2 degC literature
threshold: a genuine, citable piece of comparative engineering analysis,
not a certified result.

THE HONEST RESULT (see companion write-up, Part 6.2)
------------------------------------------------------
On this small, largely linearly-separable synthetic dataset, a plain
classical linear classifier matches or slightly *beats* the 2-qubit VQC.
That is not a bug -- it is the correct, reportable finding, and it is a
better admissions-essay result than a fake "quantum wins" story would be:
a 2-qubit variational circuit has no inherent advantage on a problem a
straight line already solves. Quantum kernel / VQC advantages (where they
exist) show up on data with structure that is expensive to represent
classically -- which this toy 2-feature dataset deliberately is not.
Reporting that honestly, and explaining *why*, is the actual quantum
engineering content here.

HOW TO RUN
----------
    pip install qiskit qiskit-aer numpy scipy
    python3 solewatch_quantum_vqc.py

Everything below runs on Qiskit's local simulators (StatevectorEstimator
for exact, noise-free training; AerSampler for a shot-based, hardware-like
confirmation run at the end). To run the same trained circuit on real IBM
quantum hardware instead of a simulator, see the commented block at the
very end of this file -- it needs only your own free IBM Quantum API token.
================================================================================
"""

import numpy as np
from scipy.optimize import minimize

from qiskit.circuit import QuantumCircuit, ParameterVector
from qiskit.quantum_info import SparsePauliOp
from qiskit.primitives import StatevectorEstimator
from qiskit_aer.primitives import SamplerV2 as AerSampler

SEED = 42
rng = np.random.default_rng(SEED)

# ==============================================================================
# 1. SYNTHETIC DATASET
# ==============================================================================
# Stand-in for a session of logged (pressure_asymmetry, temperature_asymmetry)
# feature pairs, each pre-normalized to [0, 1] by dividing the raw asymmetry
# by a fixed full-scale value (see the firmware's compensateAndScore() in
# Part 5). Class 0 = readings that stayed within the wearer's own baseline;
# Class 1 = readings that crossed the statistical/engineering flag. This is
# SYNTHETIC illustrative data, not a real logged session or patient data.

N_PER_CLASS = 25

normal_pressure = rng.normal(loc=0.20, scale=0.14, size=N_PER_CLASS)
normal_temp = rng.normal(loc=0.25, scale=0.14, size=N_PER_CLASS)

flagged_pressure = rng.normal(loc=0.65, scale=0.20, size=N_PER_CLASS)
flagged_temp = rng.normal(loc=0.70, scale=0.20, size=N_PER_CLASS)

X = np.vstack(
    [
        np.column_stack([normal_pressure, normal_temp]),
        np.column_stack([flagged_pressure, flagged_temp]),
    ]
)
y = np.array([0] * N_PER_CLASS + [1] * N_PER_CLASS)  # 0 = baseline, 1 = flagged
X = np.clip(X, 0.0, 1.0)

# shuffle and split 70/30
perm = rng.permutation(len(X))
X, y = X[perm], y[perm]
split = int(0.7 * len(X))
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

print(f"Dataset: {len(X_train)} train / {len(X_test)} test points, 2 features each\n")

# ==============================================================================
# 2. CIRCUIT DEFINITION -- feature map (data encoding) + ansatz (trainable)
# ==============================================================================
# 2 qubits: one per engineering feature (pressure asymmetry, temp asymmetry).
#
# FEATURE MAP (data encoding): each feature x_i in [0, 1] is encoded as a
# rotation angle pi * x_i on its own qubit via Ry, repeated after an
# entangling CX so the two features interact before the trainable layer sees
# them (a minimal version of the "ZZ feature map" pattern used in Qiskit's
# own quantum-kernel tutorials).
#
# ANSATZ (trainable): two layers of single-qubit rotations (Ry, Rz) separated
# by a CX entangler -- 6 free parameters (theta[0..5]) that the classical
# optimizer tunes. This is a standard hardware-efficient ansatz shape.

N_QUBITS = 2
N_THETA = 6
x_params = ParameterVector("x", N_QUBITS)
theta_params = ParameterVector("theta", N_THETA)


def build_circuit() -> QuantumCircuit:
    qc = QuantumCircuit(N_QUBITS, name="solewatch_vqc")

    # --- feature map ---
    for i in range(N_QUBITS):
        qc.ry(np.pi * x_params[i], i)
    qc.cx(0, 1)
    for i in range(N_QUBITS):
        qc.ry(np.pi * x_params[i], i)
    qc.barrier()

    # --- ansatz (trainable) ---
    qc.ry(theta_params[0], 0)
    qc.ry(theta_params[1], 1)
    qc.rz(theta_params[2], 0)
    qc.rz(theta_params[3], 1)
    qc.cx(0, 1)
    qc.ry(theta_params[4], 0)
    qc.ry(theta_params[5], 1)
    return qc


circuit = build_circuit()
print("Circuit:")
print(circuit.draw(output="text"))
print()

# Readout observable: Z on qubit 0. <Z> in [-1, +1]; we threshold at 0 to
# classify. (Z on qubit 0 rather than a joint ZZ keeps the readout simple
# and is enough for this 2-class problem.)
observable = SparsePauliOp.from_list([("ZI", 1.0)])

estimator = StatevectorEstimator()  # exact statevector simulation (no shot noise) for training


def predict_expectation(theta: np.ndarray, X_batch: np.ndarray) -> np.ndarray:
    """Return <Z0> in [-1, 1] for every row of X_batch, one circuit per row."""
    pubs = []
    for row in X_batch:
        bound = circuit.assign_parameters(
            {
                x_params[0]: row[0],
                x_params[1]: row[1],
                **{theta_params[i]: theta[i] for i in range(N_THETA)},
            }
        )
        pubs.append((bound, observable))
    result = estimator.run(pubs).result()
    return np.array([r.data.evs for r in result]).flatten()


# ==============================================================================
# 3. TRAINING LOOP -- classical outer optimizer, quantum inner evaluation
# ==============================================================================
# This is the standard "variational" / hybrid pattern: the quantum circuit
# evaluates a candidate solution (here, a classification boundary); a
# classical optimizer (COBYLA, gradient-free -- robust for a small parameter
# count and noisy/discontinuous objectives) proposes the next set of angles.


def loss_fn(theta: np.ndarray) -> float:
    z = predict_expectation(theta, X_train)
    target = 2 * y_train - 1  # map class labels {0,1} -> {-1,+1} to match <Z> range
    return float(np.mean((z - target) ** 2))  # mean squared error


theta0 = rng.uniform(0, 2 * np.pi, size=N_THETA)
print(f"Initial loss (random parameters): {loss_fn(theta0):.4f}")

opt_result = minimize(loss_fn, theta0, method="COBYLA", options={"maxiter": 300})
theta_opt = opt_result.x
print(f"Final loss after training:        {opt_result.fun:.4f}\n")


def accuracy(theta: np.ndarray, X_batch: np.ndarray, y_batch: np.ndarray) -> float:
    z = predict_expectation(theta, X_batch)
    preds = (z > 0).astype(int)
    return float(np.mean(preds == y_batch))


vqc_train_acc = accuracy(theta_opt, X_train, y_train)
vqc_test_acc = accuracy(theta_opt, X_test, y_test)
print("=== Variational Quantum Classifier ===")
print(f"  Train accuracy: {vqc_train_acc:.3f}")
print(f"  Test accuracy:  {vqc_test_acc:.3f}")

# ==============================================================================
# 4. CLASSICAL BASELINE -- for the comparative analysis this project is built on
# ==============================================================================
# A one-line linear least-squares classifier on the same train/test split.
# The point of running this is not "quantum vs. classical, who wins" as a
# horse race -- it's to honestly characterize what a 2-qubit variational
# circuit adds (or doesn't) on a specific, simple 2-feature dataset.

A_train = np.column_stack([X_train, np.ones(len(X_train))])
w, *_ = np.linalg.lstsq(A_train, 2 * y_train - 1, rcond=None)

A_test = np.column_stack([X_test, np.ones(len(X_test))])
classical_test_preds = (A_test @ w > 0).astype(int)
classical_test_acc = float(np.mean(classical_test_preds == y_test))

classical_train_preds = (A_train @ w > 0).astype(int)
classical_train_acc = float(np.mean(classical_train_preds == y_train))

print("\n=== Classical linear baseline (least-squares) ===")
print(f"  Train accuracy: {classical_train_acc:.3f}")
print(f"  Test accuracy:  {classical_test_acc:.3f}")

# ==============================================================================
# 5. SHOT-BASED CONFIRMATION RUN -- what a real device measurement looks like
# ==============================================================================
# Everything above used StatevectorEstimator: exact expectation values, as if
# you could measure a quantum state infinitely many times with zero noise.
# Real hardware (and even a "real" simulator run) only gives you a finite
# number of shots, each a single collapsed measurement -- this is the
# "sampling noise" that is the direct quantum analogue of the ADC/statistical
# noise discussed in Part 4.3 of the write-up. This block reproduces one
# prediction using 2048 discrete measurement shots via AerSampler so the
# resulting counts can be discussed the same way as any other noisy
# measurement in the project.

print("\n=== Shot-based confirmation run (AerSampler, 2048 shots) ===")
meas_circuit = circuit.copy()
meas_circuit.measure_all()

sampler = AerSampler()
sample_point = X_test[0]
bound_meas = meas_circuit.assign_parameters(
    {
        x_params[0]: sample_point[0],
        x_params[1]: sample_point[1],
        **{theta_params[i]: theta_opt[i] for i in range(N_THETA)},
    }
)
job = sampler.run([bound_meas], shots=2048)
counts = job.result()[0].data.meas.get_counts()
p0 = (counts.get("00", 0) + counts.get("01", 0)) / 2048  # P(qubit 0 = 0)
z0_from_shots = 2 * p0 - 1  # convert P(0) back to <Z> convention

print(f"  Test point:            pressure_asym={sample_point[0]:.3f}, temp_asym={sample_point[1]:.3f}")
print(f"  True label:            {y_test[0]} ({'flagged' if y_test[0] else 'baseline'})")
print(f"  Raw measurement counts: {counts}")
print(f"  <Z0> from 2048 shots:   {z0_from_shots:+.3f}  (exact statevector value: {predict_expectation(theta_opt, sample_point.reshape(1, -1))[0]:+.3f})")
print(f"  Predicted class:        {'flagged' if z0_from_shots > 0 else 'baseline'}")

# ==============================================================================
# 6. SUMMARY
# ==============================================================================
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"VQC (2 qubits, 6 params):     {vqc_test_acc:.1%} test accuracy")
print(f"Classical linear baseline:    {classical_test_acc:.1%} test accuracy")
print(
    "\nInterpretation: on this small, largely linearly-separable synthetic\n"
    "dataset, the classical model matches or beats the quantum classifier.\n"
    "This is the expected, honest result for a 2-qubit circuit on a problem\n"
    "a straight line already solves -- and it is the actual finding worth\n"
    "writing about: quantum feature maps earn their keep on data whose\n"
    "class structure is expensive for a classical kernel to represent, which\n"
    "this toy dataset was not designed to require. See Part 6.1 for the\n"
    "physical reasons a classical FSR-based problem like SoleWatch's real\n"
    "sensor fusion has no such requirement in the first place."
)

# ==============================================================================
# OPTIONAL: running the trained circuit on real IBM Quantum hardware
# ==============================================================================
# Everything above runs on local simulators and needs no account. To submit
# the SAME trained circuit to a real superconducting-qubit processor over
# the cloud (matching the "run on real quantum hardware" comparison
# suggested in the literature-grounding section of this project), install
# qiskit-ibm-runtime, create a free IBM Quantum Platform account, and
# uncomment the block below:
#
#   pip install qiskit-ibm-runtime
#
# from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as RuntimeSampler
#
# QiskitRuntimeService.save_account(channel="ibm_quantum_platform",
#                                    token="<YOUR_FREE_IBM_QUANTUM_TOKEN>")
# service = QiskitRuntimeService()
# backend = service.least_busy(operational=True, simulator=False)
# from qiskit import transpile
# isa_circuit = transpile(bound_meas, backend=backend, optimization_level=1)
# hw_sampler = RuntimeSampler(mode=backend)
# hw_job = hw_sampler.run([isa_circuit], shots=2048)
# print(hw_job.result()[0].data.meas.get_counts())
#
# Comparing these hardware counts against the AerSampler counts above is
# exactly the "simulator vs. real quantum processor" comparison worth
# writing up: real hardware will show additional deviation from the
# noise-free statevector value due to gate error, decoherence (T1/T2), and
# readout error -- a genuine, measurable quantum noise budget, distinct in
# origin from the classical ADC noise discussed elsewhere in this project.
