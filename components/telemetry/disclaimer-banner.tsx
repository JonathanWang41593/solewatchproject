import { ShieldAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function DisclaimerBanner() {
  return (
    <Alert className="border-warning/40 bg-card ring-0 [&>svg]:text-warning">
      <ShieldAlert aria-hidden="true" />
      <AlertTitle>Non-Medical Disclaimer</AlertTitle>
      <AlertDescription>
        Engineering research testbed for physical/thermal anomaly detection — Not a medical diagnostic device. All
        &ldquo;flags&rdquo; are statistical outliers relative to this wearer&apos;s own logged baseline and must not inform
        any health, footwear, or treatment decision.
      </AlertDescription>
    </Alert>
  )
}
