'use client'

/**
 * SoleWatch — Live Hardware Bridge (Web Serial API)
 * ------------------------------------------------------------------
 * STANDALONE, COPY-AND-PASTE READY.
 *
 * What this does
 *   • Renders a "Connect Hardware (USB)" button.
 *   • Opens the ESP32 / Arduino serial port at 115200 baud.
 *   • Reads a comma-separated line per sample:
 *
 *        heel,met1,met5,hallux,tempC\n
 *        e.g.  641,523,358,412,31.85
 *
 *   • Parses the 5 values into React state (`reading`) that you can
 *     drop into ANY component in place of the mock/simulator numbers.
 *
 * Browser support
 *   Web Serial ships in Chromium browsers (Chrome, Edge, Opera, Arc) on
 *   desktop and Android. It is NOT in Safari or Firefox. The hook exposes
 *   `supported` so the UI can fall back gracefully.
 *
 * HOW TO SWAP THE MOCK DATA FOR THE REAL DEVICE
 * ------------------------------------------------------------------
 *   Today the dashboard is fed by the simulator hook:
 *
 *       const { frame } = useTelemetry()          // mock / random numbers
 *       frame.zones[0].value                       // heel  (ADC counts)
 *       frame.zones[1].value                       // 1st metatarsal
 *       frame.zones[2].value                       // 5th metatarsal
 *       frame.zones[3].value                       // big toe (hallux)
 *       frame.temperature.value                    // °F in the simulator
 *
 *   When the board is built, replace those reads with the hook below:
 *
 *       const serial = useSerialTelemetry()
 *       serial.reading.heel                        // heel  (ADC counts)
 *       serial.reading.met1                        // 1st metatarsal
 *       serial.reading.met5                        // 5th metatarsal
 *       serial.reading.hallux                      // big toe
 *       serial.reading.tempC                       // °C straight from MLX90614
 *
 *   Minimal pattern:
 *
 *       const sim = useTelemetry()
 *       const serial = useSerialTelemetry()
 *       const live = serial.status === 'streaming'
 *       const heel = live ? serial.reading.heel : sim.frame.zones[0].value
 *
 *   That one ternary is the whole migration — every card keeps working
 *   on the simulator until a device is plugged in, then switches over.
 *
 * FIRMWARE SIDE (add to loop() in SoleWatch_Firmware.ino)
 * ------------------------------------------------------------------
 *   Serial.begin(115200) is already in setup(). Emit one compact line per
 *   sample cycle so the browser has something simple to parse:
 *
 *       Serial.print(filteredHeel);   Serial.print(',');
 *       Serial.print(filteredMet1);   Serial.print(',');
 *       Serial.print(filteredMet5);   Serial.print(',');
 *       Serial.print(filteredHallux); Serial.print(',');
 *       Serial.println(objectTempC, 2);
 *
 *   The full 11-column research CSV the firmware prints today can stay —
 *   the parser below silently ignores any line that is not exactly 5 numbers.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Cable, CircleAlert, Unplug, Usb } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ---------- Minimal Web Serial typings (avoids needing @types/w3c-web-serial) ----------
interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
}
interface SerialLike {
  requestPort(): Promise<SerialPortLike>
}
type NavigatorWithSerial = Navigator & { serial?: SerialLike }

// ---------- Public types ----------
export interface SerialReading {
  heel: number
  met1: number
  met5: number
  hallux: number
  tempC: number
  /** ms timestamp of the last successfully parsed line */
  receivedAt: number
}

export type SerialStatus = 'unsupported' | 'idle' | 'connecting' | 'streaming' | 'error'

export const SERIAL_BAUD_RATE = 115200
export const SERIAL_FIELD_COUNT = 5

const EMPTY_READING: SerialReading = { heel: 0, met1: 0, met5: 0, hallux: 0, tempC: 0, receivedAt: 0 }

/** Parse "641,523,358,412,31.85" → SerialReading, or null if malformed. */
export function parseSerialLine(line: string): SerialReading | null {
  const parts = line.trim().split(',')
  if (parts.length !== SERIAL_FIELD_COUNT) return null
  const nums = parts.map(Number)
  if (nums.some((n) => Number.isNaN(n))) return null
  const [heel, met1, met5, hallux, tempC] = nums
  return { heel, met1, met5, hallux, tempC, receivedAt: Date.now() }
}

// ---------- The hook: all of the serial logic lives here ----------
export function useSerialTelemetry() {
  const [status, setStatus] = useState<SerialStatus>('idle')
  const [reading, setReading] = useState<SerialReading>(EMPTY_READING)
  const [lineCount, setLineCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const portRef = useRef<SerialPortLike | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const keepReadingRef = useRef(false)

  // Feature-detect once we are on the client.
  useEffect(() => {
    if (!(navigator as NavigatorWithSerial).serial) setStatus('unsupported')
  }, [])

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false
    try {
      await readerRef.current?.cancel()
      readerRef.current?.releaseLock()
    } catch {
      // reader may already be released
    }
    try {
      await portRef.current?.close()
    } catch {
      // port may already be closed
    }
    readerRef.current = null
    portRef.current = null
    setStatus('idle')
  }, [])

  const connect = useCallback(async () => {
    const serial = (navigator as NavigatorWithSerial).serial
    if (!serial) {
      setStatus('unsupported')
      return
    }
    setError(null)
    setStatus('connecting')

    try {
      // Browser shows the native port picker — the user selects the ESP32.
      const port = await serial.requestPort()
      await port.open({ baudRate: SERIAL_BAUD_RATE })
      portRef.current = port

      if (!port.readable) throw new Error('Port opened but has no readable stream')

      const reader = port.readable.getReader()
      readerRef.current = reader
      keepReadingRef.current = true
      setStatus('streaming')

      const decoder = new TextDecoder()
      let buffer = ''

      // Read loop: bytes arrive in arbitrary chunks, so we accumulate until '\n'.
      while (keepReadingRef.current) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let newline = buffer.indexOf('\n')
        while (newline >= 0) {
          const line = buffer.slice(0, newline)
          buffer = buffer.slice(newline + 1)
          const parsed = parseSerialLine(line)
          if (parsed) {
            setReading(parsed)
            setLineCount((n) => n + 1)
          }
          newline = buffer.indexOf('\n')
        }
      }
    } catch (err) {
      // "NotFoundError" = user closed the picker without choosing a port.
      const message = err instanceof Error ? err.message : String(err)
      if (!/NotFoundError|No port selected/i.test(message)) {
        setError(message)
        setStatus('error')
      } else {
        setStatus('idle')
      }
      await disconnect()
    }
  }, [disconnect])

  // Close the port if the component unmounts mid-stream.
  useEffect(() => {
    return () => {
      keepReadingRef.current = false
      readerRef.current?.cancel().catch(() => undefined)
      portRef.current?.close().catch(() => undefined)
    }
  }, [])

  return { status, reading, lineCount, error, connect, disconnect, supported: status !== 'unsupported' }
}

// ---------- Drop-in UI: the button + live readout ----------
const CHANNELS: { key: keyof Omit<SerialReading, 'receivedAt'>; label: string; unit: string }[] = [
  { key: 'heel', label: 'Heel', unit: 'counts' },
  { key: 'met1', label: '1st Metatarsal', unit: 'counts' },
  { key: 'met5', label: '5th Metatarsal', unit: 'counts' },
  { key: 'hallux', label: 'Big Toe', unit: 'counts' },
  { key: 'tempC', label: 'Temperature', unit: '°C' },
]

export function SerialHardwareBridge({ className }: { className?: string }) {
  const { status, reading, lineCount, error, connect, disconnect, supported } = useSerialTelemetry()
  const streaming = status === 'streaming'

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center gap-3">
        {streaming ? (
          <Button variant="outline" onClick={disconnect}>
            <Unplug data-icon="inline-start" />
            Disconnect
          </Button>
        ) : (
          <Button onClick={connect} disabled={!supported || status === 'connecting'}>
            <Usb data-icon="inline-start" />
            {status === 'connecting' ? 'Waiting for port…' : 'Connect Hardware (USB)'}
          </Button>
        )}

        <Badge variant={streaming ? 'success' : status === 'error' ? 'destructive' : 'outline'} className="h-6 gap-2 px-2.5 font-mono">
          <span
            aria-hidden="true"
            className={cn('size-1.5 rounded-full', streaming ? 'bg-success animate-status-pulse' : 'bg-muted-foreground')}
          />
          {status === 'unsupported' && 'Web Serial unavailable in this browser'}
          {status === 'idle' && `Idle · ${SERIAL_BAUD_RATE.toLocaleString()} baud`}
          {status === 'connecting' && 'Opening port…'}
          {status === 'streaming' && `Streaming · ${lineCount.toLocaleString()} lines`}
          {status === 'error' && 'Connection error'}
        </Badge>
      </div>

      {status === 'unsupported' && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
          Open this page in Chrome, Edge, or another Chromium browser on desktop to use USB serial. The rest of the
          site continues to run on the simulator.
        </p>
      )}
      {error && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-destructive">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CHANNELS.map(({ key, label, unit }) => (
          <div
            key={key}
            className={cn(
              'flex flex-col gap-1 rounded-lg border bg-background/60 p-3 transition-colors',
              streaming ? 'border-success/40' : 'border-border/60',
            )}
          >
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="font-mono text-xl tabular-nums text-foreground">
              {streaming ? (key === 'tempC' ? reading[key].toFixed(2) : Math.round(reading[key])) : '—'}
              <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Cable className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
        Expected line format: <code className="font-mono text-foreground/90">heel,met1,met5,hallux,tempC</code> — one
        line per sample, newline-terminated. Lines with any other shape are ignored.
      </p>
    </div>
  )
}
