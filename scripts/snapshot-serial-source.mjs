import { readFileSync, writeFileSync } from "node:fs"

const src = readFileSync("components/hardware/serial-hardware-bridge.tsx", "utf8")
writeFileSync(
  "lib/serial-bridge-source.ts",
  "// Auto-generated snapshot of components/hardware/serial-hardware-bridge.tsx\n// Regenerate with: node scripts/snapshot-serial-source.mjs\n\nexport const SERIAL_BRIDGE_SOURCE = " + JSON.stringify(src) + "\n",
)
