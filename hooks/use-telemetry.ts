'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SAMPLES_PER_TICK, TICK_MS, TelemetrySimulator, type TelemetryFrame } from '@/lib/telemetry'

export function useTelemetry() {
  const simRef = useRef<TelemetrySimulator | null>(null)
  if (!simRef.current) simRef.current = new TelemetrySimulator()

  const [frame, setFrame] = useState<TelemetryFrame>(() => simRef.current!.snapshot())
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!running) return
    const sim = simRef.current!
    const id = window.setInterval(() => {
      sim.step(SAMPLES_PER_TICK)
      setFrame(sim.snapshot())
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [running])

  const setFilterOn = useCallback((on: boolean) => {
    simRef.current!.setFilter(on)
    setFrame(simRef.current!.snapshot())
  }, [])

  const injectEvent = useCallback(() => {
    simRef.current!.injectEvent()
  }, [])

  const recalibrate = useCallback(() => {
    simRef.current!.recalibrate()
    setFrame(simRef.current!.snapshot())
  }, [])

  const toggleRunning = useCallback(() => setRunning((r) => !r), [])

  return { frame, running, toggleRunning, setFilterOn, injectEvent, recalibrate }
}
