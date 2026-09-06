'use client'

import { useState } from 'react'
import { Check, Copy, Cpu, Usb } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock, SectionLabel } from '@/components/quantum/math-block'
import { SerialHardwareBridge } from '@/components/hardware/serial-hardware-bridge'
import { SERIAL_BRIDGE_SOURCE } from '@/lib/serial-bridge-source'

const SWAP_EXAMPLE = `// Before — every card reads the simulator:
const { frame } = useTelemetry()
const heel = frame.zones[0].value

// After — prefer the USB device when it is streaming, else keep the simulator:
const sim = useTelemetry()
const serial = useSerialTelemetry()
const live = serial.status === 'streaming'

const heel   = live ? serial.reading.heel   : sim.frame.zones[0].value
const met1   = live ? serial.reading.met1   : sim.frame.zones[1].value
const met5   = live ? serial.reading.met5   : sim.frame.zones[2].value
const hallux = live ? serial.reading.hallux : sim.frame.zones[3].value
const tempC  = live ? serial.reading.tempC  : fahrenheitToCelsius(sim.frame.temperature.value)`

const FIRMWARE_SNIPPET = `// Add inside loop() after the moving-average step (Serial.begin(115200) is already in setup()):
Serial.print(filtered[HEEL]);   Serial.print(',');
Serial.print(filtered[MET1]);   Serial.print(',');
Serial.print(filtered[MET5]);   Serial.print(',');
Serial.print(filtered[HALLUX]); Serial.print(',');
Serial.println(objectTempC, 2);  // -> "641,523,358,412,31.85\\n"`

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }}
    >
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {copied ? 'Copied' : 'Copy component'}
    </Button>
  )
}

export function HardwareIntegration() {
  return (
    <section aria-labelledby="hardware-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <SectionLabel>Live Hardware Integration · Web Serial API</SectionLabel>
        <h2 id="hardware-heading" className="font-mono text-xl font-semibold tracking-tight text-foreground">
          Plug the physical device into this page
        </h2>
        <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
          The panel below is the real bridge, not a mock-up. Once the ESP32 is built and flashed, connect it over USB in a
          Chromium browser and the five channels populate directly from the serial stream.
        </p>
      </div>

      <Card className="glow-primary border-primary/30 bg-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Usb className="size-4 text-primary" aria-hidden="true" />
              <CardTitle className="font-mono text-base">USB serial bridge</CardTitle>
            </div>
            <div className="flex gap-1.5">
              <Badge variant="outline" className="border-primary/40 font-mono text-primary">
                115200 baud
              </Badge>
              <Badge variant="outline" className="font-mono text-muted-foreground">
                5 CSV fields
              </Badge>
            </div>
          </div>
          <CardDescription>Heel · 1st Metatarsal · 5th Metatarsal · Big Toe · Temperature</CardDescription>
        </CardHeader>
        <CardContent>
          <SerialHardwareBridge />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="font-mono text-base">Swapping mock data for the device</CardTitle>
            <CardDescription>One ternary per channel. The simulator stays as the fallback until a port is open.</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={SWAP_EXAMPLE} language="tsx" title="telemetry-dashboard.tsx (excerpt)" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-primary" aria-hidden="true" />
              <CardTitle className="font-mono text-base">Firmware line to emit</CardTitle>
            </div>
            <CardDescription>
              The existing 11-column research CSV can keep printing; the parser ignores any line that is not exactly five
              numbers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={FIRMWARE_SNIPPET} language="cpp" title="SoleWatch_Firmware.ino (addition)" />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="font-mono text-base">Standalone component source</CardTitle>
              <CardDescription>
                Copy-and-paste ready. This is the exact file powering the panel above:{' '}
                <code className="font-mono text-foreground/90">components/hardware/serial-hardware-bridge.tsx</code>
              </CardDescription>
            </div>
            <CopyButton text={SERIAL_BRIDGE_SOURCE} />
          </div>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={SERIAL_BRIDGE_SOURCE}
            language="tsx"
            title="serial-hardware-bridge.tsx"
            className="max-h-[36rem] [&_pre]:max-h-[34rem]"
          />
        </CardContent>
      </Card>
    </section>
  )
}
