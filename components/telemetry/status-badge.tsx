import { CircleCheck, TrendingUp, TriangleAlert, LoaderCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ZoneStatus } from '@/lib/telemetry'

const STATUS_META = {
  normal: { label: 'Normal', variant: 'success' as const, Icon: CircleCheck },
  drift: { label: 'Baseline Drift', variant: 'warning' as const, Icon: TrendingUp },
  asymmetry: { label: 'High Asymmetry', variant: 'destructive' as const, Icon: TriangleAlert },
}

export function StatusBadge({ status, calibrating }: { status: ZoneStatus; calibrating?: boolean }) {
  if (calibrating) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <LoaderCircle data-icon="inline-start" className="animate-spin" />
        Calibrating
      </Badge>
    )
  }
  const { label, variant, Icon } = STATUS_META[status]
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {label}
    </Badge>
  )
}

export function statusGlowClass(status: ZoneStatus, calibrating?: boolean) {
  if (calibrating) return 'glow-primary'
  if (status === 'asymmetry') return 'glow-destructive'
  if (status === 'drift') return 'glow-warning'
  return 'glow-success'
}
